/**
 * KhBox 工具集统一导出
 */

module.exports = {
    // C++ Addon 模块
    addon: require('./addon.node'),
    
    // 环境构建器
    EnvironmentBuilder: require('./environment_builder.js'),
    
    // 环境函数实现
    envFuncs: require('./envFuncs.js'),
    
    // 基础配置
    baseConfig: require('./ecma_standard.json'),
    
    // 核心工具函数（原 khbox.js）
    toolFuncs: require('./toolFuncs.js')
};
