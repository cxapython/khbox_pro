/**
 * KhBox 原型链、toString 保护、Illegal Invocation 测试 Demo
 *
 * 测试内容：
 * 1. 原型链继承关系
 * 2. toString 伪装检测
 * 3. Illegal Invocation 保护
 */

console.log('\n========================================');
console.log('🧪 KhBox 原型链 & 保护机制测试');
console.log('========================================\n');

// ==========================================
// 第一部分：原型链测试
// ==========================================
console.log('📌 Part 1: 原型链继承测试\n');

console.log('--- 1.1 构造函数存在性 ---');
console.log('Document 存在:', typeof Document !== 'undefined');
console.log('Navigator 存在:', typeof Navigator !== 'undefined');
console.log('Window 存在:', typeof Window !== 'undefined');
console.log('Node 存在:', typeof Node !== 'undefined');
console.log('EventTarget 存在:', typeof EventTarget !== 'undefined');

console.log('\n--- 1.2 原型链关系 ---');
console.log('Document.prototype 存在:', !!Document.prototype);
console.log('Document.prototype.constructor.name:', Document.prototype.constructor.name);

// 检查原型链：Document -> Node -> EventTarget
const nodeProto = Object.getPrototypeOf(Document.prototype);
console.log('Document.prototype 的父类:', nodeProto ? nodeProto.constructor.name : 'null');

const eventTargetProto = nodeProto ? Object.getPrototypeOf(nodeProto) : null;
console.log('Node.prototype 的父类:', eventTargetProto ? eventTargetProto.constructor.name : 'null');

console.log('\n--- 1.3 属性定义位置 ---');
// cookie 定义在 Document.prototype
console.log('cookie 在 Document.prototype:', 'cookie' in Document.prototype);

// addEventListener 定义在 EventTarget.prototype
console.log('addEventListener 在 EventTarget.prototype:', 'addEventListener' in EventTarget.prototype);

// ==========================================
// 第二部分：toString 保护测试
// ==========================================
console.log('\n\n📌 Part 2: toString 保护机制测试\n');

console.log('--- 2.1 Function.prototype.toString() - Native Code 伪装 ---');
try {
    const javaEnabledStr = String(navigator.javaEnabled);
    console.log('navigator.javaEnabled.toString():');
    console.log(javaEnabledStr);
    console.log('包含 [native code]:', /\[native code\]/.test(javaEnabledStr));
} catch (e) {
    console.log('错误:', e.message);
}

// ==========================================
// 第三部分：Illegal Invocation 测试
// ==========================================
console.log('\n\n📌 Part 3: Illegal Invocation 保护测试\n');

console.log('--- 3.1 正常调用（应该成功）✅ ---');
try {
    const ua = navigator.userAgent;
    console.log('✅ navigator.userAgent:', ua.substring(0, 50) + '...');
} catch (e) {
    console.log('❌ 错误:', e.message);
}

try {
    const enabled = navigator.javaEnabled();
    console.log('✅ navigator.javaEnabled():', enabled);
} catch (e) {
    console.log('❌ 错误:', e.message);
}

console.log('\n--- 3.2 非法调用 - 错误的 this 绑定（应该失败）❌ ---');

// 测试 1: 将 navigator.userAgent 的 getter 绑定到 window
try {
    const uaGetter = Object.getOwnPropertyDescriptor(Navigator.prototype, 'userAgent').get;
    const result = uaGetter.call(window);
    console.log('❌ window 调用 userAgent getter 成功（不应该）:', result);
} catch (e) {
    console.log('✅ 抛出 Illegal Invocation:', e.message);
}

// 测试 2: 直接调用方法（没有 this）
try {
    const javaEnabled = navigator.javaEnabled;
    const result = javaEnabled();  // this 丢失
    console.log('❌ 无 this 调用成功（不应该）:', result);
} catch (e) {
    console.log('✅ 抛出 Illegal Invocation:', e.message);
}

console.log('\n--- 3.3 正确的绑定方式（应该成功）✅ ---');

// 使用 bind 绑定正确的 this
try {
    const javaEnabled = navigator.javaEnabled.bind(navigator);
    const result = javaEnabled();
    console.log('✅ 使用 bind 绑定成功:', result);
} catch (e) {
    console.log('❌ 错误:', e.message);
}

// 使用 call 但传入正确的 this
try {
    const result = navigator.javaEnabled.call(navigator);
    console.log('✅ 使用 call 绑定正确 this:', result);
} catch (e) {
    console.log('❌ 错误:', e.message);
}

console.log('\n========================================');
console.log('✨ 测试完成！');
console.log('========================================\n');
