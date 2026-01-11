#!/usr/bin/env node
/**
 * KhBox 补环境框架主入口
 * 
 * 使用方法：
 * 1. 修改下面的 SITE_NAME 为你的网站目录名
 * 2. 运行：node main.js
 */

const path = require('path');
const fs = require('fs');
const { JSDOM } = require('jsdom');
const vm = require('vm');

// ==========================================
// 配置区域：修改这里指定网站
// ==========================================
const SITE_NAME = 'demo';  // 修改为 pages 下的网站目录名

// ==========================================
// 路径配置
// ==========================================
const PAGES_DIR = path.join(__dirname, 'pages', SITE_NAME);
const TOOLS_DIR = path.join(__dirname, 'tools');

const INPUT_HTML = path.join(PAGES_DIR, 'input.html');
const INPUT_JS = path.join(PAGES_DIR, 'input.js');
const USER_VAR = path.join(PAGES_DIR, 'userVar.js');

// ==========================================
// 导入工具
// ==========================================
const tools = require('./tools');
const { addon, EnvironmentBuilder } = tools;

console.log('\n========================================');
console.log('🚀 KhBox 补环境框架启动');
console.log('========================================\n');

console.log('📦 当前网站:', SITE_NAME);
console.log('📁 网站目录:', PAGES_DIR);
console.log();

// ==========================================
// 1. 检查文件是否存在
// ==========================================
function checkFiles() {
    const files = {
        'HTML页面': INPUT_HTML,
        '用户脚本': INPUT_JS,
        '配置文件': USER_VAR
    };
    
    let allExists = true;
    
    for (const [name, filepath] of Object.entries(files)) {
        if (fs.existsSync(filepath)) {
            console.log(`✓ ${name}: ${path.basename(filepath)}`);
        } else {
            console.log(`✗ ${name}: ${path.basename(filepath)} [缺失]`);
            allExists = false;
        }
    }
    
    console.log();
    
    if (!allExists) {
        console.error('❌ 缺少必要文件，请检查 pages/' + SITE_NAME + ' 目录');
        console.error('💡 提示：可以从 pages/_template 复制模板文件\n');
        process.exit(1);
    }
}

checkFiles();

// ==========================================
// 2. 加载配置
// ==========================================
console.log('⚙️  加载配置...');

let siteConfig = {};
try {
    // 清除 require 缓存，确保每次都是最新配置
    delete require.cache[require.resolve(USER_VAR)];
    siteConfig = require(USER_VAR);
    console.log('   ✓ 网站配置已加载:', siteConfig._meta?.name || 'Unknown');
} catch (err) {
    console.warn('   ⚠ 配置文件加载失败，使用默认配置');
    console.warn('   错误:', err.message);
}

// ==========================================
// 3. 构建环境
// ==========================================
console.log('\n🔧 构建补环境...');

const envBuilder = new EnvironmentBuilder()
    .loadBase()  // 加载基础配置
    .build();    // 构建配置

// 如果有站点配置，应用覆盖
if (siteConfig._fingerprint) {
    console.log('   ✓ 应用浏览器指纹');
}

const config = envBuilder.getConfig();
const fingerprint = envBuilder.getFingerprint();

// 合并站点指纹
const finalFingerprint = {
    ...fingerprint,
    ...siteConfig._fingerprint
};

console.log('   ✓ 环境配置完成');
console.log('   - 类定义数:', Object.keys(config).length - 1);
console.log('   - UserAgent:', finalFingerprint.userAgent?.substring(0, 50) + '...');

// ==========================================
// 4. 初始化 JSDOM
// ==========================================
console.log('\n🌐 初始化 JSDOM...');

const htmlContent = fs.readFileSync(INPUT_HTML, 'utf-8');
const dom = new JSDOM(htmlContent, {
    url: 'https://' + SITE_NAME + '.com/',
    referrer: 'https://www.google.com/',
    contentType: 'text/html',
    userAgent: finalFingerprint.userAgent
});

const { window, document, navigator } = dom.window;

console.log('   ✓ JSDOM 创建成功');
console.log('   - URL:', document.URL);
console.log('   - Title:', document.title);

// ==========================================
// 5. 初始化 KhBox
// ==========================================
console.log('\n🔌 初始化 KhBox 补环境...');

// 确保 toolFuncs.js 在正确的位置
const toolFuncsPath = path.join(__dirname, 'tools', 'toolFuncs.js');
delete require.cache[require.resolve(toolFuncsPath)];
const khBox = require(toolFuncsPath);

khBox.init({
    document,
    window,
    navigator,
    Document: dom.window.Document,
    Window: dom.window.Window,
    Navigator: dom.window.Navigator,
    _config: config,
    _fingerprint: finalFingerprint
});

console.log('   ✓ KhBox 初始化完成');

// 注册 lazyLoader 和 lazySetter
addon.SetupLazyLoader(khBox.lazyLoader);
addon.SetupLazySetter(khBox.lazySetter);
console.log('   ✓ LazyLoader 已注册');

// 设置日志文件路径（放在网站目录下）
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const logFilePath = path.join(PAGES_DIR, `log_${timestamp}.log`);

try {
    const logResult = addon.SetLogFilePath(logFilePath);
    console.log('   ✓ 日志文件已设置:', path.basename(logFilePath));
} catch (err) {
    console.warn('   ⚠ 日志文件设置失败:', err.message);
}

// ==========================================
// 6. 设置 document.all（必须在创建 Proxy 之前）
// ==========================================
console.log('\n📋 设置 document.all...');

const allHandler = khBox.createAllHandler();
addon.SetAllHandler(allHandler);

// 开启追踪日志（调试用）
// addon.SetTraceLog(true);  // 调用链日志
// addon.SetVerboseLog(true); // 详细日志

// 在原始 document 上定义 document.all
Object.defineProperty(document, 'all', {
    get: function() {
        return addon.khall;
    },
    configurable: true,
    enumerable: false
});

console.log('   ✓ document.all 已设置');

// ==========================================
// 7. 创建 Proxy 包装对象
// ==========================================
console.log('\n🛡️  创建 Proxy 包装...');

const proxyDocument = addon.watch(document);
const proxyNavigator = addon.watch(navigator);
const proxyWindow = addon.watch(window);
// proxyDocument = document;
// proxyNavigator = navigator;

console.log('   ✓ Document Proxy 已创建');
console.log('   ✓ Navigator Proxy 已创建');
console.log('   ✓ Window Proxy 已创建');

// ==========================================
// 8. 执行用户脚本
// ==========================================
console.log('\n▶️  执行用户脚本...');
console.log('========================================\n');

const userScript = fs.readFileSync(INPUT_JS, 'utf-8');

// 创建执行上下文
const sandbox = {
    console,
    document: proxyDocument,
    navigator: proxyNavigator,
    window: proxyWindow,
    // 添加构造函数（用于 instanceof 和原型链检查）
    Document: dom.window.Document,
    HTMLDocument: dom.window.HTMLDocument,
    Navigator: dom.window.Navigator,
    Window: dom.window.Window,
    Node: dom.window.Node,
    EventTarget: dom.window.EventTarget,
    Element: dom.window.Element,
    HTMLElement: dom.window.HTMLElement,
    // Node.js 全局对象
    Buffer,
    require,
    __dirname: PAGES_DIR,
    __filename: INPUT_JS
};

try {
    const script = new vm.Script(userScript, {
        filename: INPUT_JS
    });
    
    const context = vm.createContext(sandbox);
    script.runInContext(context);
    
    console.log('\n========================================');
    console.log('✅ 脚本执行完成');
    console.log('========================================\n');
    
} catch (err) {
    console.error('\n========================================');
    console.error('❌ 脚本执行出错');
    console.error('========================================\n');
    console.error(err.stack);
    process.exit(1);
}
