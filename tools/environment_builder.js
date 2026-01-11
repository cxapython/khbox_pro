// addon_pro/environment_builder.js
const fs = require('fs');
const path = require('path');

/**
 * EnvironmentBuilder - 分层环境配置构建器
 * 
 * 三层架构：
 * Level 1: Base Profile（核心通用层）- ECMA 标准对象
 * Level 2: Browser Profile（浏览器层）- Chrome/Firefox 指纹
 * Level 3: Site Specific（站点层）- 针对特定网站的覆盖
 */
class EnvironmentBuilder {
    constructor(options = {}) {
        // 默认路径指向上级目录的 profiles
        this.profilesDir = options.profilesDir || path.join(__dirname, '..', 'profiles');
        this.toolsDir = path.join(__dirname);  // tools 目录
        this.baseProfile = null;
        this.browserProfile = null;
        this.siteProfiles = [];
        this.merged = null;
        this.fingerprint = {};
    }

    /**
     * 加载 JSON 配置文件
     */
    loadProfile(relativePath) {
        const fullPath = path.join(this.profilesDir, relativePath);
        if (!fs.existsSync(fullPath)) {
            throw new Error(`Profile not found: ${fullPath}`);
        }
        const content = fs.readFileSync(fullPath, 'utf-8');
        return JSON.parse(content);
    }

    /**
     * Level 1: 加载基础层配置
     */
    loadBase(profileName = 'ecma_standard.json') {
        // 基础配置现在在 tools 目录下
        const basePath = path.join(this.toolsDir, profileName);
        if (!fs.existsSync(basePath)) {
            throw new Error(`Base profile not found: ${basePath}`);
        }
        const content = fs.readFileSync(basePath, 'utf-8');
        this.baseProfile = JSON.parse(content);
        console.log(`[EnvironmentBuilder] Loaded base profile: ${this.baseProfile._meta.name}`);
        return this;
    }

    /**
     * Level 2: 加载浏览器指纹层
     */
    loadBrowser(profileName) {
        this.browserProfile = this.loadProfile(`browsers/${profileName}`);
        
        // 提取指纹数据
        if (this.browserProfile._fingerprint) {
            this.fingerprint = { ...this.browserProfile._fingerprint };
        }
        
        console.log(`[EnvironmentBuilder] Loaded browser profile: ${this.browserProfile._meta.name}`);
        return this;
    }

    /**
     * Level 3: 加载站点特定配置（可多个）
     */
    loadSite(profileName) {
        const siteProfile = this.loadProfile(`sites/${profileName}`);
        this.siteProfiles.push(siteProfile);
        console.log(`[EnvironmentBuilder] Loaded site profile: ${siteProfile._meta.name}`);
        return this;
    }

    /**
     * 深度合并对象
     */
    deepMerge(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (key.startsWith('_')) {
                // 元数据字段直接覆盖
                result[key] = source[key];
                continue;
            }
            
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(target[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        
        return result;
    }

    /**
     * 合并所有配置层
     */
    build() {
        if (!this.baseProfile) {
            throw new Error('Base profile must be loaded first');
        }

        // 第一步：从 base 开始
        let merged = JSON.parse(JSON.stringify(this.baseProfile));
        
        // 第二步：合并 browser 层
        if (this.browserProfile) {
            // 移除元数据字段，只合并实际配置
            const { _meta, _fingerprint, ...browserConfig } = this.browserProfile;
            merged = this.deepMerge(merged, browserConfig);
        }
        
        // 第三步：依次合并 site 层（后面的覆盖前面的）
        for (const siteProfile of this.siteProfiles) {
            // 处理 _overrides 特殊字段
            if (siteProfile._overrides) {
                merged = this.applyOverrides(merged, siteProfile._overrides);
            }
            
            // 处理 _injections 特殊字段
            if (siteProfile._injections) {
                merged = this.applyInjections(merged, siteProfile._injections);
            }
        }

        this.merged = merged;
        console.log('[EnvironmentBuilder] Configuration merged successfully');
        return this;
    }

    /**
     * 应用站点特定的覆盖规则
     */
    applyOverrides(config, overrides) {
        const result = { ...config };
        
        for (const className in overrides) {
            if (!result[className]) {
                result[className] = { proto: null, props: {} };
            }
            
            const classOverrides = overrides[className];
            for (const propName in classOverrides) {
                const override = classOverrides[propName];
                
                // 应用覆盖
                if (!result[className].props) {
                    result[className].props = {};
                }
                
                result[className].props[propName] = {
                    ...result[className].props[propName],
                    ...override
                };
            }
        }
        
        return result;
    }

    /**
     * 应用注入（添加新属性）
     */
    applyInjections(config, injections) {
        // 暂时简单处理，后续可扩展
        return config;
    }

    /**
     * 获取最终配置
     */
    getConfig() {
        if (!this.merged) {
            throw new Error('Configuration not built yet. Call build() first.');
        }
        return this.merged;
    }

    /**
     * 获取指纹数据
     */
    getFingerprint() {
        return this.fingerprint;
    }

    /**
     * 导出到文件（用于调试）
     */
    exportToFile(outputPath) {
        if (!this.merged) {
            throw new Error('Configuration not built yet. Call build() first.');
        }
        
        fs.writeFileSync(outputPath, JSON.stringify(this.merged, null, 2), 'utf-8');
        console.log(`[EnvironmentBuilder] Configuration exported to: ${outputPath}`);
    }

    /**
     * 静态工厂方法：快速创建常见配置
     */
    static createChrome120() {
        return new EnvironmentBuilder()
            .loadBase()
            .loadBrowser('chrome_120.json')
            .build();
    }

    static createChrome120WithAkamai() {
        return new EnvironmentBuilder()
            .loadBase()
            .loadBrowser('chrome_120.json')
            .loadSite('akamai.json')
            .build();
    }
}

module.exports = EnvironmentBuilder;
