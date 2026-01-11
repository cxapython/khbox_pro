模板目录使用说明
==================

这是创建新网站配置的模板目录。

快速开始：
---------
1. 复制整个 _template 目录
   cp -r pages/_template pages/你的网站名

2. 修改三个文件：
   - input.html: 静态HTML页面（给JSDOM用）
   - input.js: 你要执行的JavaScript代码
   - userVar.js: 网站特定配置（浏览器指纹、属性覆盖等）

3. 修改 main.js 中的 SITE_NAME
   const SITE_NAME = '你的网站名';

4. 运行
   node main.js

文件说明：
---------
input.html  - JSDOM加载的HTML页面
input.js    - 用户执行的JS脚本
userVar.js  - 网站配置文件（对应原来的 profiles/sites/xxx.json）
