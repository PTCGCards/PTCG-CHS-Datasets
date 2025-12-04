const fs = require('fs');

/**
 * 将文件中的 Unicode 转义序列转换为可读的中文字符
 * @param {string} inputPath - 输入文件路径
 * @param {string} outputPath - 输出文件路径
 */
function convertUnicodeToReadable(inputPath, outputPath) {
  // 读取输入文件
  const content = fs.readFileSync(inputPath, 'utf-8');
  
  // 将 Unicode 转义序列 (\uXXXX) 转换为对应的字符
  const converted = content.replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
  
  // 写入输出文件
  fs.writeFileSync(outputPath, converted, 'utf-8');
  
  console.log(`转换完成: ${inputPath} -> ${outputPath}`);
}

// 从命令行参数获取输入和输出路径
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('用法: node convert_text.js <输入文件路径> <输出文件路径>');
  process.exit(1);
}

const [inputPath, outputPath] = args;
convertUnicodeToReadable(inputPath, outputPath);

module.exports = { convertUnicodeToReadable };

