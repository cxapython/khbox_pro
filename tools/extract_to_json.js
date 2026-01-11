// ===================================================================
// 在 Chrome 控制台运行的脚本 - 提取对象属性描述符生成 JSON 配置
// 用于补充 ecma_standard.json 中缺失的类或实例描述
// ===================================================================

/**
 * 提取构造函数的配置（类定义）
 * @param {Function} Constructor - 构造函数，如 NavigationHistoryEntry
 * @param {Object} instanceObj - 可选的实例对象，用于获取 getter 的默认值
 * @returns {Object} JSON 配置对象
 * 
 * 使用示例:
 * extractConstructorConfig(NavigationHistoryEntry)
 * extractConstructorConfig(HTMLElement, document.createElement('div'))
 */
function extractConstructorConfig(Constructor, instanceObj = null) {
    const className = Constructor.name;
    const config = {
        proto: null,
        props: {},
        illegalConstructor: false
    };
    
    // 检测原型链继承
    const protoObj = Object.getPrototypeOf(Constructor.prototype);
    if (protoObj && protoObj.constructor && protoObj.constructor.name !== 'Object') {
        config.proto = protoObj.constructor.name;
    }
    
    // 检测是否是非法构造函数
    try {
        new Constructor();
    } catch(e) {
        if (e.name === 'TypeError' && e.message.includes('Illegal constructor')) {
            config.illegalConstructor = true;
        }
    }
    
    // 提取构造函数的静态属性（跳过标准的）
    const staticProps = Object.getOwnPropertyDescriptors(Constructor);
    for (const key in staticProps) {
        if (['arguments', 'caller', 'length', 'name', 'prototype'].includes(key)) {
            continue;
        }
        const desc = staticProps[key];
        config.props[key] = convertDescriptor(desc, className, key, 'static', instanceObj);
    }
    
    // 提取原型上的属性
    const prototypeProps = Object.getOwnPropertyDescriptors(Constructor.prototype);
    for (const key in prototypeProps) {
        if (key === 'constructor') {
            continue;
        }
        const desc = prototypeProps[key];
        config.props[key] = convertDescriptor(desc, className, key, 'prototype', instanceObj);
    }
    
    // 构建完整的 JSON 对象
    const result = {
        [className]: config
    };
    
    // 复制到剪贴板
    copy(JSON.stringify(result, null, 2));
    console.log(`✅ ${className} 配置已生成并复制到剪贴板`);
    console.log(`包含 ${Object.keys(config.props).length} 个属性`);
    
    return result;
}

/**
 * 提取实例对象的配置（window、document、navigator 等）
 * @param {Object} obj - 实例对象，如 window, document, navigator
 * @param {String} objName - 对象名称
 * @param {Boolean} includeProto - 是否包含原型链上的属性（默认 true）
 * @returns {Object} JSON 配置对象
 * 
 * 使用示例:
 * extractInstanceConfig(window, 'Window')
 * extractInstanceConfig(document, 'Document')
 * extractInstanceConfig(navigator, 'Navigator')
 * extractInstanceConfig(navigator, 'Navigator', false) // 只提取自身属性
 */
function extractInstanceConfig(obj, objName, includeProto = true) {
    const config = {
        proto: null,
        props: {}
    };
    
    // 检测原型链继承
    const protoObj = Object.getPrototypeOf(obj);
    if (protoObj && protoObj.constructor && protoObj.constructor.name !== 'Object') {
        const protoName = protoObj.constructor.name;
        // 避免自引用
        if (protoName !== objName) {
            config.proto = protoName;
        }
    }
    
    // 收集所有属性（自身 + 原型链）
    const allProps = new Set();
    let currentObj = obj;
    
    // 遍历原型链
    while (currentObj && currentObj !== Object.prototype) {
        // 获取当前层级的所有属性（包括 Symbol）
        Reflect.ownKeys(currentObj).forEach(key => {
            // 跳过 constructor
            if (key === 'constructor') return;
            allProps.add(key);
        });
        
        // 如果不包含原型链，只取自身
        if (!includeProto) break;
        
        currentObj = Object.getPrototypeOf(currentObj);
        // 到达 Object.prototype 或 null 就停止
        if (!currentObj || currentObj === Object.prototype) break;
    }
    
    // 特殊处理 window 对象的方法
    if (obj === window) {
        ['blur', 'focus', 'alert', 'confirm', 'prompt'].forEach(method => {
            if (typeof window[method] === 'function') {
                allProps.add(method);
            }
        });
    }
    
    // 提取每个属性的描述符
    for (const key of allProps) {
        // 查找属性描述符（可能在原型链上）
        let desc = null;
        let searchObj = obj;
        
        while (searchObj && !desc) {
            desc = Object.getOwnPropertyDescriptor(searchObj, key);
            if (desc) break;
            searchObj = Object.getPrototypeOf(searchObj);
        }
        
        if (!desc) continue;
        
        const propName = typeof key === 'string' ? key : key.toString();
        config.props[propName] = convertDescriptor(desc, objName, propName, 'instance', obj);
    }
    
    // 构建完整的 JSON 对象
    const result = {
        [objName]: config
    };
    
    // 复制到剪贴板
    copy(JSON.stringify(result, null, 2));
    console.log(`✅ ${objName} 配置已生成并复制到剪贴板`);
    console.log(`   proto: ${config.proto || 'null'}`);
    console.log(`   包含 ${Object.keys(config.props).length} 个属性`);
    
    return result;
}

/**
 * 转换属性描述符为 JSON 配置格式
 * @param {Object} descriptor - 属性描述符
 * @param {String} className - 类名
 * @param {String} propName - 属性名
 * @param {String} context - 上下文（'static', 'prototype', 'instance'）
 * @param {Object} instanceObj - 实例对象（用于获取 getter 默认值）
 */
function convertDescriptor(descriptor, className, propName, context, instanceObj) {
    const result = {
        configurable: descriptor.configurable,
        enumerable: descriptor.enumerable
    };
    
    // 判断属性类型
    if (descriptor.hasOwnProperty('value')) {
        // 数据属性
        result.writable = descriptor.writable;
        
        if (typeof descriptor.value === 'function') {
            result.type = 'method';
        } else {
            result.type = 'property';
        }
    } else if (descriptor.hasOwnProperty('get') || descriptor.hasOwnProperty('set')) {
        // 访问器属性
        result.type = 'accessor';
        result.writable = false;
        
        // 尝试获取 getter 的默认值（用于调试和文档）
        if (descriptor.get && instanceObj) {
            try {
                const defaultValue = descriptor.get.call(instanceObj);
                const valueType = typeof defaultValue;
                
                // 将默认值信息添加到注释中
                if (valueType !== 'undefined' && valueType !== 'object') {
                    result._comment = `Default value: ${defaultValue}`;
                } else if (valueType === 'object' && defaultValue !== null) {
                    result._comment = `Returns: ${defaultValue.constructor.name}`;
                }
            } catch(e) {
                // 忽略错误
            }
        }
    } else {
        result.type = 'property';
        result.writable = false;
    }
    
    return result;
}

/**
 * 批量提取多个构造函数
 * @param {Array} constructors - 构造函数数组
 * @returns {Object} 合并后的配置对象
 * 
 * 使用示例:
 * extractBatchConstructors([HTMLElement, HTMLDivElement, HTMLSpanElement])
 */
function extractBatchConstructors(constructors) {
    const result = {};
    
    for (const Constructor of constructors) {
        const config = extractConstructorConfig(Constructor);
        Object.assign(result, config);
        console.log(`✓ ${Constructor.name}`);
    }
    
    copy(JSON.stringify(result, null, 2));
    console.log(`\n✅ 批量提取完成，共 ${constructors.length} 个类`);
    
    return result;
}

/**
 * 提取指定类的属性列表（简化版，只列出属性名和类型）
 * 适合快速查看缺失哪些属性
 */
function listProperties(Constructor) {
    const className = Constructor.name;
    const allProps = {};
    
    // 静态属性
    for (const key in Object.getOwnPropertyDescriptors(Constructor)) {
        if (['arguments', 'caller', 'length', 'name', 'prototype'].includes(key)) continue;
        const desc = Object.getOwnPropertyDescriptor(Constructor, key);
        allProps[key] = {
            location: 'static',
            type: typeof desc.value === 'function' ? 'method' : 
                  (desc.get || desc.set) ? 'accessor' : 'property'
        };
    }
    
    // 原型属性
    for (const key in Object.getOwnPropertyDescriptors(Constructor.prototype)) {
        if (key === 'constructor') continue;
        const desc = Object.getOwnPropertyDescriptor(Constructor.prototype, key);
        allProps[key] = {
            location: 'prototype',
            type: typeof desc.value === 'function' ? 'method' : 
                  (desc.get || desc.set) ? 'accessor' : 'property'
        };
    }
    
    console.table(allProps);
    return allProps;
}

// ===================================================================
// 使用说明
// ===================================================================
console.log(`
📋 使用方法：

1. 提取单个构造函数配置：
   extractConstructorConfig(NavigationHistoryEntry)
   extractConstructorConfig(HTMLElement, document.createElement('div'))

2. 提取实例对象配置：
   extractInstanceConfig(navigator, 'Navigator')
   extractInstanceConfig(window, 'Window')

3. 批量提取多个类：
   extractBatchConstructors([HTMLElement, HTMLDivElement, HTMLSpanElement])

4. 快速查看属性列表：
   listProperties(Navigator)

执行后会自动复制到剪贴板，直接粘贴到 ecma_standard.json 即可！
`);
