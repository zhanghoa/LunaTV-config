// update_readme.js (最终版 - 无需修改)

const fs = require('fs');
const path = require('path');

// --- 路径配置 ---
// 在 GitHub Actions 环境中，__dirname 会指向脚本所在的目录
const DATA_DIR = process.env.DATA_DIR_ENV || path.join(__dirname, 'data');
const REPORT_PATH = path.join(DATA_DIR, 'report.md');
const README_PATH = path.join(__dirname, 'README.md'); // README 通常在项目根目录

// --- 定义标记 ---
const TABLE_START_MARKER = '<!-- API_TABLE_START -->';
const TABLE_END_MARKER = '<!-- API_TABLE_END -->';

// --- 主逻辑 ---
try {
    // 1. 提取 report.md 中的表格
    if (!fs.existsSync(REPORT_PATH)) {
        console.error(`错误: 报告文件未找到 at ${REPORT_PATH}`);
        process.exit(1);
    }
    const reportContent = fs.readFileSync(REPORT_PATH, 'utf-8');
    // 使用一个更健壮的正则表达式来捕获从表头开始的整个表格
    const tableMatch = reportContent.match(/\| 状态 \|[\s\S]*?(\n\n|$)/);
    if (!tableMatch || !tableMatch[0]) {
        console.error("错误: 未能在 report.md 中提取到表格内容。");
        process.exit(1);
    }
    const newTable = tableMatch[0].trim(); // trim() 移除末尾可能的多余换行
    console.log("✅ 成功从 report.md 提取表格。");

    // 2. 读取 README.md
    if (!fs.existsSync(README_PATH)) {
        console.error(`错误: README.md 文件未找到 at ${README_PATH}。请先创建它并添加标记。`);
        process.exit(1);
    }
    const readmeContent = fs.readFileSync(README_PATH, 'utf-8');

    // 3. 查找标记位置
    const startIndex = readmeContent.indexOf(TABLE_START_MARKER);
    const endIndex = readmeContent.indexOf(TABLE_END_MARKER);

    if (startIndex === -1 || endIndex === -1) {
        console.error(`错误: 未能在 README.md 中找到 ${TABLE_START_MARKER} 或 ${TABLE_END_MARKER}。`);
        process.exit(1);
    }

    // 4. 构建新的 README 内容
    // 截取标记之前的部分 (包括开始标记本身)
    const contentBefore = readmeContent.substring(0, startIndex + TABLE_START_MARKER.length);
    // 截取结束标记之后的部分 (包括结束标记本身)
    const contentAfter = readmeContent.substring(endIndex);

    const updatedReadme = `${contentBefore}\n${newTable}\n${contentAfter}`;

    // 5. 写回文件
    fs.writeFileSync(README_PATH, updatedReadme, 'utf-8');
    console.log("✅ README.md 已被精确更新！");

} catch (error) {
    console.error("更新 README 时发生未知错误:", error);
    process.exit(1);
}
