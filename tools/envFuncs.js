/**
 * 自定义环境实现
 * 所有需要覆盖JSDOM默认行为的函数都在这里定义
 */

module.exports = {
    // ====================
    // Navigator 相关（注意：这些是 getter，不是方法）
    // ====================
    "Navigator_webdriver_get": function() {
        return undefined;  // 隐藏自动化标志
    },
    
    "Navigator_userAgent_get": function() {
        return "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    },
    
    "Navigator_platform_get": function() {
        return "Win32";
    },
    
    "Navigator_vendor_get": function() {
        return "Google Inc.";
    },
    
    // ====================
    // Document 相关
    // ====================
    "Document_cookie_get": function() {
        // getter
        const khBox = require('./toolFuncs');
        return khBox.memory.cache.cookie || '';
    },
    
    "Document_cookie_set": function(value) {
        // setter
        const khBox = require('./toolFuncs');
        console.log(`[🍪 Cookie Setter] 设置 cookie: ${value}`);
        khBox.memory.cache.cookie = value;
    },
    
    // ====================
    // HTMLAllCollection 相关
    // ====================
    "HTMLAllCollection_item": function(index) {
        console.log(`[envFuncs] item called with index: ${index}`);
        const khBox = require('./toolFuncs');
        const document = khBox.memory.jsdom.document;
        if (document) {
            const all = document.getElementsByTagName('*');
            return all[index] || null;
        }
        return null;
    },
    
    "HTMLAllCollection_namedItem": function(name) {
        console.log(`[envFuncs] namedItem called with name: ${name}`);
        const khBox = require('./toolFuncs');
        const document = khBox.memory.jsdom.document;
        if (document) {
            const byId = document.getElementById(name);
            if (byId) return byId;
            
            const byName = document.getElementsByName(name);
            if (byName && byName.length > 0) return byName[0];
        }
        return null;
    },
    
    // 可以继续添加更多自定义实现...
};
