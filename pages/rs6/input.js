/**
 * 用户要执行的 JavaScript 代码
 * 这个脚本会在补环境初始化后执行
 */

// 示例：访问 DOM
console.log('Document title:', document.title);
console.log('Document URL:', document.URL);

// 示例：访问 Navigator
console.log('User Agent:', navigator.userAgent);
console.log('Platform:', navigator.platform);

// 示例：操作 Cookie
document.cookie = 'test=value; path=/';
console.log('Cookie:', document.cookie);

// 在这里编写你的业务逻辑
// ...
