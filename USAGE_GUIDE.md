# KhBox 补环境框架使用指南

## 📚 目录
- [快速开始](#快速开始)
- [为新网站创建补环境](#为新网站创建补环境)
- [配置文件说明](#配置文件说明)
- [高级特性](#高级特性)
- [常见问题](#常见问题)

---

## 🚀 快速开始

### 1. 基础使用

```javascript
// example_basic.js
const { document, navigator, window } = require('./index.js');

// 直接使用，就像在浏览器中一样
console.log('UserAgent:', navigator.userAgent);
console.log('Platform:', navigator.platform);
console.log('Cookie:', document.cookie);

// 所有访问都会被自动拦截和记录
document.title = 'Test Page';
console.log('Title:', document.title);
```

**运行：**
```bash
node example_basic.js
```

---

## 🌐 为新网站创建补环境

### 场景：需要爬取 example.com，该网站有反爬虫检测

### 步骤 1：创建站点配置文件

```bash
# 在 profiles/sites/ 目录下创建新配置
touch profiles/sites/example_com.json
```

**profiles/sites/example_com.json**
```json
{
  "_meta": {
    "name": "Example.com Site Profile",
    "description": "针对 example.com 的特定配置",
    "layer": "site",
    "extends": "browsers/chrome_120.json",
    "target_url": "https://example.com"
  },
  
  "_overrides": {
    "Navigator": {
      "webdriver": {
        "value": false,
        "configurable": false,
        "writable": false,
        "_strict_this": true
      },
      "plugins": {
        "value": "[PluginArray]",
        "configurable": true,
        "enumerable": true
      }
    },
    "Window": {
      "chrome": {
        "value": {
          "runtime": {}
        },
        "configurable": false,
        "enumerable": true
      }
    }
  },
  
  "_injections": {
    "window": {
      "_phantom": { "type": "undefined" },
      "_selenium": { "type": "undefined" },
      "callPhantom": { "type": "undefined" },
      "__nightmare": { "type": "undefined" }
    },
    "navigator": {
      "brave": { "type": "undefined" }
    }
  },
  
  "_fingerprint_overrides": {
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "platform": "Win32",
    "hardwareConcurrency": 8
  }
}
```

### 步骤 2：创建环境函数实现

```bash
# 在 envFuncs/ 目录下创建实现
mkdir -p envFuncs/example_com
```

**envFuncs/example_com/navigator.js**
```javascript
// 针对 example.com 的 Navigator 属性实现
module.exports = {
    // navigator.userAgent getter
    Navigator_userAgent_get: function() {
        const khBox = require('../../khbox.js');
        return khBox.fingerprint?.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
    },
    
    // navigator.platform getter
    Navigator_platform_get: function() {
        const khBox = require('../../khbox.js');
        return khBox.fingerprint?.platform || 'Win32';
    },
    
    // navigator.plugins getter
    Navigator_plugins_get: function() {
        // 返回空的 PluginArray（避免检测）
        return {
            length: 0,
            item: function() { return null; },
            namedItem: function() { return null; }
        };
    },
    
    // navigator.webdriver getter
    Navigator_webdriver_get: function() {
        // 强制返回 false，防止被检测
        return false;
    }
};
```

**envFuncs/example_com/document.js**
```javascript
// 针对 example.com 的 Document 属性实现
module.exports = {
    // document.cookie getter
    Document_cookie_get: function() {
        const khBox = require('../../khbox.js');
        return khBox.memory.cache.cookie || '';
    },
    
    // document.cookie setter
    Document_cookie_set: function(value) {
        const khBox = require('../../khbox.js');
        khBox.memory.cache.cookie = value;
        console.log('[Cookie SET]', value);
    },
    
    // document.referrer getter
    Document_referrer_get: function() {
        return 'https://www.google.com/';
    }
};
```

**envFuncs/example_com/index.js**
```javascript
// 导出所有实现
module.exports = {
    ...require('./navigator.js'),
    ...require('./document.js')
};
```

### 步骤 3：使用站点配置

**方式 1：通过环境变量**
```bash
# 设置环境变量
export SITE_PROFILE=example_com.json

# 运行脚本
node your_script.js
```

**方式 2：在代码中指定**
```javascript
// your_script.js
const EnvironmentBuilder = require('./environment_builder.js');

// 创建针对 example.com 的环境
const envBuilder = new EnvironmentBuilder()
    .loadBase()
    .loadBrowser('chrome_120.json')
    .loadSite('example_com.json')  // 加载站点配置
    .build();

const config = envBuilder.getConfig();
const fingerprint = envBuilder.getFingerprint();

// 初始化 KhBox
const khBox = require('./khbox.js');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');

khBox.init({
    document: dom.window.document,
    window: dom.window,
    navigator: dom.window.navigator,
    _config: config,
    _fingerprint: fingerprint
});

// 加载站点特定的函数实现
khBox.loadProfile('example_com');

// 现在可以使用了
const addon = require('../build/Release/addon.node');
const proxyDocument = addon.watch(dom.window.document);
const proxyNavigator = addon.watch(dom.window.navigator);

console.log('UserAgent:', proxyNavigator.userAgent);
console.log('Webdriver:', proxyNavigator.webdriver);  // false
console.log('Plugins:', proxyNavigator.plugins.length);  // 0
```

**方式 3：使用静态工厂方法**
```javascript
const EnvironmentBuilder = require('./environment_builder.js');

// 创建预定义的环境
const envBuilder = EnvironmentBuilder.createChrome120();

// 或者创建包含站点配置的环境
// （需要在 EnvironmentBuilder 中添加工厂方法）
```

### 步骤 4：运行测试

**test_example_com.js**
```javascript
const { document, navigator, window } = require('./index.js');

console.log('\n========== Example.com 补环境测试 ==========\n');

// 测试 1：基础属性
console.log('✅ 测试 1: 基础属性');
console.log('  UserAgent:', navigator.userAgent);
console.log('  Platform:', navigator.platform);
console.log('  Webdriver:', navigator.webdriver);  // 应该是 false

// 测试 2：反爬检测点
console.log('\n✅ 测试 2: 反爬检测点');
console.log('  window._phantom:', typeof window._phantom);  // undefined
console.log('  window._selenium:', typeof window._selenium);  // undefined
console.log('  navigator.webdriver:', navigator.webdriver);  // false

// 测试 3：Cookie 操作
console.log('\n✅ 测试 3: Cookie 操作');
document.cookie = 'test=value; path=/';
console.log('  Cookie:', document.cookie);

// 测试 4：Illegal Invocation 防护
console.log('\n✅ 测试 4: Illegal Invocation 防护');
try {
    const _ = navigator.userAgent;
    const desc = Object.getOwnPropertyDescriptor(navigator, 'userAgent');
    if (desc && desc.get) {
        desc.get.call({});  // 应该抛出错误
        console.log('  ✗ 未检测到非法调用');
    } else {
        console.log('  ⚠ 属性已转为值类型');
    }
} catch (e) {
    if (e.message === 'Illegal invocation') {
        console.log('  ✓ 正确拦截非法调用');
    } else {
        console.log('  ✗ 错误信息不匹配:', e.message);
    }
}

console.log('\n========== 测试完成 ==========\n');
```

**运行测试：**
```bash
# 设置站点配置
export SITE_PROFILE=example_com.json

# 运行测试
node test_example_com.js
```

---

## 📝 配置文件说明

### 三层配置架构

```
profiles/
├── base/                # Level 1: 核心通用层
│   └── ecma_standard.json    # ECMA 标准对象
├── browsers/            # Level 2: 浏览器层
│   ├── chrome_120.json       # Chrome 120 指纹
│   └── firefox_120.json      # Firefox 120 指纹
└── sites/               # Level 3: 站点层
    ├── akamai.json           # Akamai 反爬
    ├── cloudflare.json       # Cloudflare 5秒盾
    └── example_com.json      # 自定义网站
```

### 配置字段说明

```json
{
  "_meta": {
    "name": "配置名称",
    "description": "配置描述",
    "layer": "base|browser|site",
    "extends": "继承的配置文件"
  },
  
  "ClassName": {
    "proto": "父类名称",
    "props": {
      "propertyName": {
        "type": "accessor|method|property",
        "configurable": true|false,
        "writable": true|false,
        "enumerable": true|false
      }
    }
  },
  
  "_fingerprint": {
    "userAgent": "浏览器 UA",
    "platform": "平台",
    "vendor": "供应商",
    "hardwareConcurrency": 8,
    "deviceMemory": 8
  },
  
  "_overrides": {
    "ClassName": {
      "propertyName": {
        "value": "覆盖的值",
        "configurable": false,
        "_strict_this": true
      }
    }
  },
  
  "_injections": {
    "objectName": {
      "propertyName": { "type": "undefined|null|value" }
    }
  }
}
```

---

## 🔧 高级特性

### 1. 动态切换浏览器指纹

```javascript
const EnvironmentBuilder = require('./environment_builder.js');

// Chrome 环境
const chromeEnv = new EnvironmentBuilder()
    .loadBase()
    .loadBrowser('chrome_120.json')
    .build();

// Firefox 环境
const firefoxEnv = new EnvironmentBuilder()
    .loadBase()
    .loadBrowser('firefox_120.json')
    .build();
```

### 2. 多站点配置叠加

```javascript
const envBuilder = new EnvironmentBuilder()
    .loadBase()
    .loadBrowser('chrome_120.json')
    .loadSite('cloudflare.json')    // 先加载 Cloudflare 配置
    .loadSite('example_com.json')   // 再叠加站点特定配置
    .build();
```

### 3. 运行时修改指纹

```javascript
const khBox = require('./khbox.js');

// 修改 UserAgent
khBox.fingerprint.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...';

// 修改平台
khBox.fingerprint.platform = 'MacIntel';
```

### 4. 日志控制

```javascript
const addon = require('./build/Release/addon.node');

// 开启详细日志
addon.SetVerboseLog(true);

// 开启追踪日志
addon.SetTraceLog(true);

// 设置日志文件路径
addon.SetLogFilePath('./khbox.log');
```

### 5. 内存管理

```javascript
// 框架自动管理内存，使用 WeakCallback
// 当 Proxy 对象不再使用时，GC 会自动清理缓存

// 手动触发 GC（需要 --expose-gc 标志）
if (global.gc) {
    global.gc();
}
```

---

## 🐛 常见问题

### Q1: 为什么属性第一次访问后变成了值类型？

**A:** 这是懒加载机制的设计。首次访问时：
1. C++ 拦截器调用 JS 的 lazyLoader
2. JS 返回实现函数
3. C++ 创建 Native 包装器并焊死到对象上
4. **同时调用 getter 返回值**（第 207 行）

这样可以避免每次访问都重新创建 Native 包装器。

**解决方案：** 如果需要保持 accessor 特性，可以修改 `khbox_watcher.cc:207-211`，不调用 getter。

### Q2: 如何处理网站特有的检测点？

**A:** 在站点配置的 `_injections` 中添加：

```json
"_injections": {
  "window": {
    "_特殊变量名": { "type": "undefined" }
  }
}
```

或在 envFuncs 中实现自定义逻辑。

### Q3: Illegal Invocation 检查失败？

**A:** 确保：
1. lazyLoader 返回了 `className` 字段
2. 原始对象的构造函数名正确
3. 使用的是 KhBox 包装的 Proxy 对象

### Q4: 如何调试？

```javascript
// 1. 开启日志
addon.SetVerboseLog(true);
addon.SetTraceLog(true);

// 2. 查看拦截点
// 所有属性访问都会打印日志：
// [LazyLoader GET] 找到自定义实现: Navigator_userAgent_get
// [KhBox] [LazyLoad] Welded Navigator.userAgent (get)

// 3. 检查配置加载
console.log('Config:', khBox.config);
console.log('Fingerprint:', khBox.fingerprint);
```

---

## 📊 性能优化建议

1. **配置缓存**：重复使用同一个 EnvironmentBuilder 实例
2. **按需加载**：只加载需要的站点配置
3. **避免频繁 GC**：保持 Proxy 引用，避免反复创建
4. **日志控制**：生产环境关闭 Verbose/Trace 日志

---

## 🎯 最佳实践

### 1. 目录结构

```
your_project/
├── addon_pro/              # KhBox 框架
│   ├── profiles/           # 配置文件
│   ├── envFuncs/           # 函数实现
│   └── index.js            # 入口
├── scripts/                # 你的爬虫脚本
│   ├── example_com.js
│   └── another_site.js
└── configs/                # 站点特定配置
    └── sites.json
```

### 2. 配置管理

```javascript
// config_manager.js
class ConfigManager {
    constructor() {
        this.cache = new Map();
    }
    
    getEnvironment(siteName) {
        if (this.cache.has(siteName)) {
            return this.cache.get(siteName);
        }
        
        const EnvironmentBuilder = require('./addon_pro/environment_builder.js');
        const env = new EnvironmentBuilder()
            .loadBase()
            .loadBrowser('chrome_120.json')
            .loadSite(`${siteName}.json`)
            .build();
        
        this.cache.set(siteName, env);
        return env;
    }
}

module.exports = new ConfigManager();
```

### 3. 错误处理

```javascript
try {
    const result = navigator.userAgent;
    console.log('Success:', result);
} catch (e) {
    if (e.message === 'Illegal invocation') {
        console.error('检测到非法调用，请检查 this 指向');
    } else if (e.message.includes('需要补环境')) {
        console.error('缺少环境实现:', e.message);
    } else {
        console.error('未知错误:', e);
    }
}
```

---

## 📞 支持

- 查看测试文件：`test_*.js`
- 查看配置示例：`profiles/sites/akamai.json`
- 查看实现示例：`envFuncs/`

**祝你补环境顺利！** 🎉
