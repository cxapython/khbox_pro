/**
 * KhBox 轻量补环境框架 - 混合架构版本
 * 核心思路：C层拦截 + JS层决策 + 懒加载焊死
 * 
 * C层(addon)：自动拦截所有属性访问
 * JS层：决策是自定义实现还是走JSDOM，返回配置给C层焊死
 */

const path = require('path');
const protoMethods = require('./ecma_standard.json');  // 使用完整配置
const envFuncs = require('./envFuncs.js');

const khBox = {
    // ==========================================
    // 1. 存储区
    // ==========================================
    memory: {
        jsdom: {},      // 保存JSDOM原始对象引用
        cache: {        // 缓存区
            cookie: ''
        },
    },
    
    envFuncs: envFuncs,
    protoMethods: protoMethods,  // 新增：引用原型链配置
    config: null,                 // 新增：分层配置
    fingerprint: null,            // 新增：浏览器指纹
    
    // ==========================================
    // 2. 原型链查找：找到属性定义在哪层原型
    // 使用动态配置（优先）或静态 protoMethods
    // ==========================================
    findProtoOwner: function(className, prop) {
        // 优先使用动态配置
        const methods = this.config || protoMethods;
        
        let current = className;
        while (current) {
            const config = methods[current];
            if (!config) break;
            
            if (config.props && config.props[prop]) {
                return current;  // 找到了
            }
            current = config.proto;  // 继续往上找
        }
        return null;  // 没找到
    },
    
    // ==========================================
    // 2. 核心属性解析函数（GET/SET 复用）
    // ==========================================
    resolveEnv: function(op, receiver, target, propName) {
        // 获取 className（优先使用 Symbol.toStringTag）
        const className = target[Symbol.toStringTag] || target.constructor?.name || "Unknown";
        
        // 查找属性在哪层原型定义
        const protoOwner = khBox.findProtoOwner(className, propName);
        if (!protoOwner) {
            // 属性不在映射中，走 JSDOM 默认
            return null;
        }
        
        // 获取属性配置
        const methods = this.config || protoMethods;
        const propConfig = methods[protoOwner].props[propName];
        if (!propConfig) return null;
        
        // 根据操作类型决定 implKey 和返回类型
        if (op === 'get') {
            // GET 操作：查找 _get 实现
            let implKey = `${protoOwner}_${propName}`;
            if (propConfig.type === 'accessor' || propConfig.type === 'property') {
                implKey += '_get';
            }
            
            if (!khBox.envFuncs[implKey]) return null;
            
            console.log(`[LazyLoader GET] 找到自定义实现: ${implKey}`);
            
            const isAccessor = propConfig.type === 'accessor' || propConfig.type === 'property';
            return {
                impl: khBox.envFuncs[implKey],
                target: receiver,  // 焚死在 receiver (Proxy) 上
                type: isAccessor ? 'accessor' : 'value',
                methodType: isAccessor ? 'get' : 'value',  // ✨ 新增：明确区分 get/value
                className: protoOwner,  // ✨ 新增：用于 Illegal Invocation 检查
                attrs: {
                    configurable: propConfig.configurable ?? false,
                    writable: propConfig.writable ?? false,
                    enumerable: propConfig.enumerable ?? true
                }
            };
        }
        
        if (op === 'set') {
            // SET 操作：只对 accessor/property 且 writable 的属性尝试 _set
            if (propConfig.type === 'method') return null;  // 方法不拦截 set
            if (propConfig.writable === false) return null;  // 只读属性不拦截
            
            const implKey = `${protoOwner}_${propName}_set`;
            if (!khBox.envFuncs[implKey]) return null;
            
            console.log(`[LazySetter SET] 找到自定义实现: ${implKey}`);
            
            return {
                impl: khBox.envFuncs[implKey],
                target: receiver,  // 焚死在 receiver (Proxy) 上
                type: 'setter',
                methodType: 'set',  // ✨ 新增：明确标记为 set
                className: protoOwner,  // ✨ 新增：用于 Illegal Invocation 检查
                attrs: {
                    configurable: propConfig.configurable ?? false,
                    writable: propConfig.writable ?? true,
                    enumerable: propConfig.enumerable ?? true
                }
            };
        }
        
        return null;
    },
    
    // ==========================================
    // 3. 懒加载决策函数：C层调用此函数决定如何处理属性（GET）
    // ==========================================
    lazyLoader: function(receiver, target, prop) {
        return khBox.resolveEnv('get', receiver, target, String(prop));
    },
    
    // ==========================================
    // 4. 懒加载决策函数：C层调用此函数决定如何处理属性（SET）
    // ==========================================
    lazySetter: function(receiver, target, prop, value) {
        // value 参数在这里不影响路由决策，会在实际调用 impl 时透传
        return khBox.resolveEnv('set', receiver, target, String(prop));
    },
    
    // ==========================================
    // 4. 加载特定网站配置（Profile）
    // ==========================================
    loadProfile: function(profileName) {
        if (!profileName || profileName === 'default') return;
        
        try {
            const profilePath = `../profiles/${profileName}.js`;
            const profileFuncs = require(profilePath);
            console.log(`[KhBox] Loading profile: ${profileName}`);
            
            // 覆盖/合并实现（网站特有的实现会覆盖通用的）
            Object.assign(this.envFuncs, profileFuncs);
            console.log(`[KhBox] Profile loaded: ${Object.keys(profileFuncs).length} functions merged`);
        } catch (e) {
            console.warn(`[KhBox] Failed to load profile: ${profileName}`, e.message);
        }
    },
    
    // ==========================================
    // 4. 初始化：保存JSDOM对象引用 + 加载配置
    // ==========================================
    init: function(jsdomObjects) {
        // jsdomObjects: { document, window, navigator, _config, _fingerprint, ... }
        
        // 1. 保存 JSDOM 原始对象
        for (const [name, obj] of Object.entries(jsdomObjects)) {
            if (name.startsWith('_')) continue;  // 跳过配置字段
            
            const className = obj?.constructor?.name || name;
            khBox.memory.jsdom[className] = obj;
            khBox.memory.jsdom[name] = obj;  // 也用变量名存一份
        }
        
        // 2. 加载分层配置
        if (jsdomObjects._config) {
            this.config = jsdomObjects._config;
            console.log('[KhBox] 已加载分层配置，包含', Object.keys(this.config).length - 1, '个类定义');
        }
        
        // 3. 加载浏览器指纹
        if (jsdomObjects._fingerprint) {
            this.fingerprint = jsdomObjects._fingerprint;
            console.log('[KhBox] 已加载浏览器指纹:', this.fingerprint.userAgent);
        }
        
        console.log('[KhBox] 初始化完成，已加载JSDOM对象:', Object.keys(jsdomObjects).filter(k => !k.startsWith('_')));
    },
    
    // ==========================================
    // 5. document.all 处理函数
    // ==========================================
    createAllHandler: function() {
        const realDocument = this.memory.jsdom.document;
        
        // 内部处理函数
        function myAllHandler(arg) {
            if (arg === undefined) {
                return realDocument.getElementsByTagName('*');
            }
            
            if (typeof arg === 'number') {
                const all = realDocument.getElementsByTagName('*');
                return all[arg] || null;
            }
            
            if (typeof arg === 'string') {
                const byId = realDocument.getElementById(arg);
                if (byId) return byId;
                
                const byName = realDocument.getElementsByName(arg);
                if (byName && byName.length > 0) return byName[0];
                return null;
            }
            
            return null;
        }
        
        // 返回适配 C++ addon 的接口
        return function internalAllHandler(opOrIndex, maybeArg) {
            if (opOrIndex === 'INVOKE') {
                return myAllHandler(maybeArg);
            }
            return myAllHandler(opOrIndex);
        };
    }
};

module.exports = khBox;
