#!/usr/bin/env node
/**
 * 生成 ecma_standard.json 基础配置文件
 * 从 envs 文件夹解析元数据并整合
 */

const fs = require('fs');
const path = require('path');

// 配置路径
const ENVS_DIR = path.resolve('E:/code/html_code/my_sandbox_jsdom/envs');
const OUTPUT_FILE = path.resolve(__dirname, '../profiles/base/ecma_standard.json');

// 解析属性定义行（需要多行处理）
function parsePropertyDefinition(lines, startIndex) {
    let line = lines[startIndex];
    
    // 匹配开始: khBox.toolsFunc.defineProperty(ClassName.prototype,"propName",{
    const startRegex = /khBox\.toolsFunc\.defineProperty\((\w+)(?:\.prototype)?,["]([\w]+)["],\{/;
    const match = line.match(startRegex);
    
    if (!match) return null;
    
    const [, className, propName] = match;
    
    // 收集完整的配置对象（可能跨多行）
    let configStr = line;
    let braceCount = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
    let i = startIndex;
    
    while (braceCount > 0 && i < lines.length - 1) {
        i++;
        configStr += lines[i];
        braceCount += (lines[i].match(/\{/g) || []).length;
        braceCount -= (lines[i].match(/\}/g) || []).length;
    }
    
    // 解析配置
    const config = {
        configurable: /configurable:\s*true/.test(configStr),
        enumerable: /enumerable:\s*true/.test(configStr),
        writable: /writable:\s*true/.test(configStr)
    };
    
    // 判断类型
    let type = 'property';
    const hasGetter = /get:\s*function/.test(configStr);
    const hasSetter = /set:\s*function/.test(configStr);
    const hasValue = /value:\s*function/.test(configStr);
    const setterUndefined = /set:\s*undefined/.test(configStr);
    
    if (hasValue) {
        type = 'method';  // 有 value: function
    } else if (hasGetter && (hasSetter || !setterUndefined)) {
        type = 'accessor';  // 有 getter 和 setter
    } else if (hasGetter) {
        type = 'property';  // 只有 getter（只读属性）
    }
    
    return {
        className,
        propName,
        type,
        configurable: config.configurable,
        writable: config.writable,
        enumerable: config.enumerable
    };
}

// 解析继承关系
function parseInheritance(content, className) {
    // 匹配: khBox.toolsFunc.safeConstructorProto(ClassName, ParentClass)
    const inheritRegex = new RegExp(`khBox\\.toolsFunc\\.safeConstructorProto\\(${className}\\s*,\\s*(\\w+)\\)`);
    const match = content.match(inheritRegex);
    return match ? match[1] : null;
}

// 检查是否是非法构造函数
function hasIllegalConstructor(content) {
    return content.includes("throwError('TypeError','Illegal constructor')");
}

// 解析单个 JS 文件
function parseEnvFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    // 获取类名（从文件名）
    const className = path.basename(filePath, '.js');
    
    // 解析继承
    const proto = parseInheritance(content, className);
    
    // 检查非法构造函数
    const illegalConstructor = hasIllegalConstructor(content);
    
    // 解析属性
    const props = {};
    
    for (let i = 0; i < lines.length; i++) {
        const prop = parsePropertyDefinition(lines, i);
        if (prop && prop.className === className) {
            props[prop.propName] = {
                type: prop.type,
                configurable: prop.configurable,
                writable: prop.writable,
                enumerable: prop.enumerable
            };
        }
    }
    
    return {
        className,
        proto,
        illegalConstructor,
        props
    };
}

// 递归遍历目录
function traverseDirectory(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            traverseDirectory(fullPath, fileList);
        } else if (file.endsWith('.js')) {
            fileList.push(fullPath);
        }
    }
    
    return fileList;
}

// 生成配置
function generateConfig() {
    console.log('🔍 扫描 envs 目录...');
    console.log('   路径:', ENVS_DIR);
    
    if (!fs.existsSync(ENVS_DIR)) {
        console.error('❌ envs 目录不存在:', ENVS_DIR);
        process.exit(1);
    }
    
    // 获取所有 JS 文件
    const jsFiles = traverseDirectory(ENVS_DIR);
    console.log(`   找到 ${jsFiles.length} 个 JS 文件\n`);
    
    // 解析所有文件
    const classes = {};
    let parsedCount = 0;
    
    for (const file of jsFiles) {
        try {
            const classData = parseEnvFile(file);
            
            // 只保留有属性的类
            if (Object.keys(classData.props).length > 0 || classData.proto || classData.illegalConstructor) {
                classes[classData.className] = {
                    proto: classData.proto,
                    props: classData.props
                };
                
                // 如果有非法构造函数，添加标记
                if (classData.illegalConstructor) {
                    classes[classData.className].illegalConstructor = true;
                }
                
                parsedCount++;
                console.log(`✓ ${classData.className.padEnd(30)} (${Object.keys(classData.props).length} 个属性)`);
            }
        } catch (err) {
            console.error(`   ✗ 解析失败: ${path.basename(file)}`, err.message);
        }
    }
    
    console.log(`\n📊 解析完成: ${parsedCount} 个类\n`);
    
    // 构建最终配置
    const config = {
        "_meta": {
            "name": "ECMA Standard Base Profile",
            "description": "从 envs 元数据自动生成的 ECMA-262 标准对象和 DOM 核心接口定义",
            "version": "2.0.0",
            "layer": "base",
            "generated": new Date().toISOString(),
            "source": "envs/BomElement, envs/DomElement, envs/JsApiElement, envs/InstanceElement",
            "totalClasses": parsedCount
        },
        ...classes
    };
    
    // 写入文件
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(config, null, 2), 'utf-8');
    
    console.log('✅ 配置文件已生成:');
    console.log('   输出:', OUTPUT_FILE);
    console.log('   大小:', (fs.statSync(OUTPUT_FILE).size / 1024).toFixed(2), 'KB');
    console.log('   类数量:', parsedCount);
    
    // 统计信息
    let totalProps = 0;
    let totalMethods = 0;
    let totalAccessors = 0;
    let totalIllegalConstructors = 0;
    
    for (const [className, classData] of Object.entries(classes)) {
        totalProps += Object.keys(classData.props).length;
        
        if (classData.illegalConstructor) {
            totalIllegalConstructors++;
        }
        
        for (const [propName, propData] of Object.entries(classData.props)) {
            if (propData.type === 'method') totalMethods++;
            if (propData.type === 'accessor') totalAccessors++;
        }
    }
    
    console.log('\n📈 统计信息:');
    console.log('   - 总属性数:', totalProps);
    console.log('   - 方法数:', totalMethods);
    console.log('   - 访问器数:', totalAccessors);
    console.log('   - 普通属性数:', totalProps - totalMethods - totalAccessors);
    console.log('   - 非法构造函数:', totalIllegalConstructors);
    
    return config;
}

// 主函数
function main() {
    console.log('\n========================================');
    console.log('📦 KhBox 基础配置生成器');
    console.log('========================================\n');
    
    try {
        const config = generateConfig();
        
        console.log('\n========================================');
        console.log('✨ 生成成功！');
        console.log('========================================\n');
        
        // 显示部分示例
        console.log('📝 配置示例 (前 3 个类):');
        const classNames = Object.keys(config).filter(k => k !== '_meta').slice(0, 3);
        for (const className of classNames) {
            const classData = config[className];
            console.log(`\n  ${className}:`);
            console.log(`    proto: ${classData.proto || 'null'}`);
            console.log(`    props: ${Object.keys(classData.props).length} 个`);
            
            // 显示前 3 个属性
            const propNames = Object.keys(classData.props).slice(0, 3);
            for (const propName of propNames) {
                const prop = classData.props[propName];
                console.log(`      - ${propName}: ${prop.type} (${prop.configurable ? 'C' : ''}${prop.writable ? 'W' : ''}${prop.enumerable ? 'E' : ''})`);
            }
            if (Object.keys(classData.props).length > 3) {
                console.log(`      ... 还有 ${Object.keys(classData.props).length - 3} 个`);
            }
        }
        
        console.log('\n💡 使用提示:');
        console.log('   1. 配置文件位于: profiles/base/ecma_standard.json');
        console.log('   2. 可以在 EnvironmentBuilder 中使用 .loadBase() 加载');
        console.log('   3. 属性标记: C=configurable, W=writable, E=enumerable');
        console.log('   4. 类型: method=方法, accessor=访问器, property=属性\n');
        
    } catch (err) {
        console.error('\n❌ 生成失败:', err.message);
        console.error(err.stack);
        process.exit(1);
    }
}

// 执行
if (require.main === module) {
    main();
}

module.exports = { parseEnvFile, generateConfig };
