const fs = require('fs');
const path = require('path');

function formatJson(filePath) {
  const absolutePath = path.resolve(filePath);
  
  if (!fs.existsSync(absolutePath)) {
    console.error(`文件不存在: ${absolutePath}`);
    process.exit(1);
  }
  
  const content = fs.readFileSync(absolutePath, 'utf-8');
  const json = JSON.parse(content);
  const formatted = JSON.stringify(json, null, 2);
  
  fs.writeFileSync(absolutePath, formatted, 'utf-8');
  console.log(`已格式化: ${absolutePath}`);
}

// 从命令行参数获取文件路径
const filePath = process.argv[2];
if (!filePath) {
  console.error('请提供 JSON 文件路径');
  console.error('用法: node format_json.js <file.json>');
  process.exit(1);
}

formatJson(filePath);

