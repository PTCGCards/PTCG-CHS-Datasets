import fs from 'fs';
import path from 'path';

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

    // 将 \\ 转换为 /
    const finalOutput = converted.replace(/\\\\/g, '/');

    // 写入输出文件
    fs.writeFileSync(outputPath, finalOutput, 'utf-8');

    console.log(`转换完成: ${inputPath} -> ${outputPath}`);
}

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


if (import.meta.url === `file://${process.argv[1]}`) {
    convertUnicodeToReadable('../ptcg_chs_infos.json', 'ptcg_chs_infos.json');
    formatJson('ptcg_chs_infos.json');
}


