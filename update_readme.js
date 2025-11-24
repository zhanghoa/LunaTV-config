const fs = require('fs');
const path = require('path');

// 🚨 路径适配
const DATA_DIR = process.env.DATA_DIR_ENV || path.join(__dirname, 'data');
const REPORT_PATH = path.join(DATA_DIR, 'report.md');
const README_PATH = path.join(DATA_DIR, 'README.md');

if (!fs.existsSync(REPORT_PATH)) process.exit(1);
const reportContent = fs.readFileSync(REPORT_PATH, 'utf-8');
const tableMatch = reportContent.match(/\| 状态 \|[\s\S]+?\n\n/);
if (!tableMatch) process.exit(1);

let readmeContent = "";
// 尝试读取现有 README，如果不存在则新建一个头
if (fs.existsSync(README_PATH)) {
    readmeContent = fs.readFileSync(README_PATH, 'utf-8');
} else {
    readmeContent = "# LunaTV API Status\n\n\n";
}

// 直接使用 report.md 的表格部分替换 README 的标记部分
const newTable = tableMatch[0];
const updatedReadme = readmeContent.replace(
    /[\s\S]*?/,
    `\n${newTable}\n`
);

// 如果没有找到标记，就追加（容错）
if (readmeContent === updatedReadme && !readmeContent.includes("API_TABLE_START")) {
    fs.writeFileSync(README_PATH, readmeContent + "\n\n" + newTable, 'utf-8');
} else {
    fs.writeFileSync(README_PATH, updatedReadme, 'utf-8');
}
console.log("✅ README 更新完成");
