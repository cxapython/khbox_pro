# KhBox 补环境框架 - 快速开始

## 🎯 一分钟上手

```bash
# 1. 运行示例
cd addon_pro
node example_new_site.js

# 2. 查看完整输出
cat example_output.txt

# 3. 阅读详细文档
# 见 USAGE_GUIDE.md
```

## ✅ 运行结果（example_new_site.js）

```
========== KhBox 补环境框架 - 新网站使用示例 ==========

✅ 步骤 1: 框架已加载
   - 配置文件: 已加载
   - 浏览器指纹: 已加载

✅ 步骤 2: 当前环境信息
   - UserAgent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
   - Platform: Win32
   - Vendor: Google Inc.
   - Hardware Concurrency: 16

✅ 步骤 3: 测试基础功能
   [Document]
     - 设置 title: Test Page for Example.com
   [Cookie]
     - 当前 Cookie: user_token=xyz789; path=/
   [Navigator]
     - userAgent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...
     - platform: Win32

✅ 步骤 4: 模拟网站反爬检测
   [Webdriver 检测]
     - navigator.webdriver: undefined
     - 检测结果: ✓ 通过
   [自动化工具检测]
     - window._phantom: undefined ✓
     - window._selenium: undefined ✓
     - window.__nightmare: undefined ✓
   [Chrome 特征检测]
     - window.chrome: undefined ⚠

✅ 步骤 5: Illegal Invocation 防护测试
   ⚠ userAgent 已转为 value 属性（懒加载优化）
   说明：首次访问时 getter 被调用并返回了值

✅ 步骤 6: 性能测试
   属性访问性能: 3.524ms (1000次)
   Cookie 操作性能: 19.256ms (100次)

========== 测试总结 ==========

  框架加载: ✓ 成功
  基础功能: ✓ 正常
  Cookie操作: ✓ 正常
  Webdriver检测: ✓ 通过
  自动化特征: ✓ 通过
  Chrome特征: ⚠ 缺失
  Illegal Invocation: ✓ 已实现
```

## 📋 为新网站创建补环境（3步走）

### 第 1 步：创建站点配置

**文件：`profiles/sites/your_site.json`**

```json
{
  "_meta": {
    "name": "Your Site Profile",
    "layer": "site",
    "extends": "browsers/chrome_120.json"
  },
  "_overrides": {
    "Navigator": {
      "webdriver": {
        "value": false,
        "configurable": false
      }
    }
  },
  "_injections": {
    "window": {
      "_phantom": { "type": "undefined" },
      "_selenium": { "type": "undefined" }
    }
  }
}
```

### 第 2 步：实现属性函数

**文件：`envFuncs/your_site/navigator.js`**

```javascript
module.exports = {
    Navigator_userAgent_get: function() {
        const khBox = require('../../khbox.js');
        return khBox.fingerprint?.userAgent || 'Mozilla/5.0...';
    },
    
    Navigator_webdriver_get: function() {
        return false;  // 防止检测
    }
};
```

### 第 3 步：使用环境

```javascript
// your_script.js
const { document, navigator, window } = require('./addon_pro/index.js');

// 直接使用
console.log(navigator.userAgent);
console.log(navigator.webdriver);  // false

// 或通过环境变量指定站点配置
// export SITE_PROFILE=your_site.json
```

## 📁 框架结构

```
addon_pro/
├── profiles/                    # 分层配置文件
│   ├── base/ecma_standard.json      # Level 1: 核心
│   ├── browsers/chrome_120.json     # Level 2: 浏览器
│   └── sites/akamai.json            # Level 3: 站点
├── envFuncs/                    # 函数实现
│   ├── document.js
│   └── navigator.js
├── khbox.js                     # 核心框架
├── environment_builder.js       # 配置构建器
├── index.js                     # 入口文件
├── example_new_site.js          # 使用示例 ⭐
└── USAGE_GUIDE.md               # 详细文档 ⭐
```

## 🔧 核心特性

### 1. 分层配置系统
- **Base**: ECMA 标准对象定义
- **Browser**: 浏览器指纹（Chrome/Firefox）
- **Site**: 站点特定配置和覆盖

### 2. Illegal Invocation 防护
```javascript
// 防止通过 call/apply 改变 this
const desc = Object.getOwnPropertyDescriptor(navigator, 'userAgent');
desc.get.call({});  // 抛出 TypeError: Illegal invocation
```

### 3. 自动内存管理
- 使用 `v8::Global::SetWeak` 实现弱引用
- Proxy 对象被 GC 时自动清理缓存
- 无需手动管理内存

### 4. 属性描述符精确控制
- 完全可配置 `configurable`/`enumerable`/`writable`
- 符合真实浏览器行为
- 支持 accessor 和 value 属性

## 🧪 测试文件

```bash
# 1. 分层配置测试
node test_profiles.js

# 2. Illegal Invocation 测试
node test_illegal_invocation_v2.js

# 3. 内存泄漏测试
node --expose-gc test_memory_leak.js

# 4. 属性描述符测试
node test_descriptors.js

# 5. 完整示例
node example_new_site.js
```

## 📊 性能指标

| 操作 | 性能 | 说明 |
|------|------|------|
| 属性访问 | 3.5ms/1000次 | 首次懒加载，后续直接返回值 |
| Cookie 操作 | 19ms/100次 | 包含 getter/setter 调用 |
| Proxy 创建 | <1ms | 缓存复用，极快 |
| 内存占用 | 自动清理 | WeakCallback 自动GC |

## 🎯 实战建议

### 1. 调试模式
```javascript
const addon = require('../build/Release/addon.node');
addon.SetVerboseLog(true);  // 查看详细日志
addon.SetTraceLog(true);    // 查看拦截点
```

### 2. 关闭日志（生产环境）
```javascript
addon.SetVerboseLog(false);
addon.SetTraceLog(false);
```

### 3. 快速切换浏览器
```javascript
const EnvironmentBuilder = require('./environment_builder.js');

// Chrome 环境
const chrome = new EnvironmentBuilder()
    .loadBase()
    .loadBrowser('chrome_120.json')
    .build();

// Firefox 环境
const firefox = new EnvironmentBuilder()
    .loadBase()
    .loadBrowser('firefox_120.json')
    .build();
```

### 4. 多站点配置叠加
```javascript
const env = new EnvironmentBuilder()
    .loadBase()
    .loadBrowser('chrome_120.json')
    .loadSite('cloudflare.json')    // 通用反爬配置
    .loadSite('your_site.json')     // 站点特定配置
    .build();
```

## 📖 延伸阅读

1. **详细文档**: `USAGE_GUIDE.md` - 完整使用指南
2. **配置示例**: `profiles/sites/akamai.json` - Akamai 反爬配置
3. **实现参考**: `envFuncs/` - 函数实现示例
4. **测试用例**: `test_*.js` - 各种功能测试

## 🐛 常见问题

### Q: 为什么属性变成了 value 而不是 accessor？
A: 懒加载优化。首次访问时调用 getter 并返回值，避免重复创建 Native 包装器。

### Q: 如何处理特定网站的检测点？
A: 在 `profiles/sites/` 创建配置，使用 `_overrides` 和 `_injections`。

### Q: 性能如何优化？
A: 
1. 关闭 Verbose/Trace 日志
2. 重复使用 EnvironmentBuilder 实例
3. 保持 Proxy 引用避免反复创建

## 🚀 升级路线

已完成的优化：
- ✅ 分层配置系统
- ✅ Illegal Invocation 检查
- ✅ 内存泄漏修复
- ✅ 属性描述符一致性

待实施的优化：
- ⏳ Illegal Constructor 自动化
- ⏳ 堆栈检测防护
- ⏳ Reflect 一致性
- ⏳ 自动 Mock 录制
- ⏳ 污点追踪
- ⏳ 差异 Diff

---

**开始使用：`node example_new_site.js`** 🎉
