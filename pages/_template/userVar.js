/**
 * 网站特定配置文件
 * 对应原来的 profiles/sites/xxx.json
 * 
 * 这个文件定义了网站特定的环境配置，会覆盖基础配置
 */

module.exports = {
    _meta: {
        name: "网站名称配置",
        description: "针对特定网站的补环境配置",
        extends: "base"  // 继承基础配置
    },
    
    // 覆盖配置：修改基础配置中的某些属性
    _overrides: {
        Navigator: {
            webdriver: {
                value: false,
                configurable: false,
                writable: false,
                enumerable: true
            },
            // 添加更多需要覆盖的属性
        },
        Window: {
            // 覆盖 Window 的属性
        }
    },
    
    // 注入配置：添加新的属性（用于清除检测特征）
    _injections: {
        window: {
            _phantom: { type: "undefined" },
            _selenium: { type: "undefined" },
            __nightmare: { type: "undefined" },
            callPhantom: { type: "undefined" }
        },
        navigator: {
            brave: { type: "undefined" }
        }
    },
    
    // 浏览器指纹覆盖
    _fingerprint: {
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        platform: "Win32",
        vendor: "Google Inc.",
        hardwareConcurrency: 8,
        deviceMemory: 8,
        language: "zh-CN",
        languages: ["zh-CN", "zh", "en-US", "en"]
    }
};
