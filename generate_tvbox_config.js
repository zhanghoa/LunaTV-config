// generate_tvbox_config.js

const fs = require('fs');
const path = require('path');

// === 配置路径 ===
const CONFIG_PATH = path.join(__dirname, 'LunaTV-config.json');
const REPORT_PATH = path.join(__dirname, 'report.md');
const TVBOX_CONFIG_PATH = path.join(__dirname, 'tvbox-config-healthy.json');

// === TVBox 配置常量 ===
const SPIDER_URL = "https://raw.gitmirror.com/FongMi/CatVodSpider/main/jar/custom_spider.jar;md5;e7eabe878887922e3e2e6b011caa80fc";
const LIVE_URL = ""; 
const DEFAULT_HEADERS = {
    "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 10; Mi 9 Build/QKQ1.190828.002)",
    "Accept": "application/json, */*",
    "Connection": "close"
};

// === 辅助函数：读取原始配置 ===
const loadOriginalConfig = () => {
    if (!fs.existsSync(CONFIG_PATH)) {
        console.error("❌ 配置文件不存在:", CONFIG_PATH);
        process.exit(1);
    }
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
    // 返回包含 key (域名) 和 value (站点信息) 的对象
    return config.api_site || {}; 
};

// === 辅助函数：读取 API 报告状态 ===
const loadApiStatus = () => {
    if (!fs.existsSync(REPORT_PATH)) {
        console.error('❌ report.md 不存在，请先运行 API 检查脚本');
        process.exit(1);
    }
    const reportContent = fs.readFileSync(REPORT_PATH, 'utf-8');
    
    // 提取 Markdown 表格
    const tableMatch = reportContent.match(/\| 状态 \|[\s\S]+?\n\n/);
    if (!tableMatch) {
        console.error('❌ report.md 中未找到表格');
        process.exit(1);
    }
    
    // 解析表格，提取状态和 API 地址
    const tableMd = tableMatch[0].trim();
    const lines = tableMd.split('\n').slice(2); // 跳过表头和分割线
    
    const apiStatusMap = new Map();
    lines.forEach(line => {
        const cols = line.split('|').map(c => c.trim());
        const status = cols[1]; // 状态列
        const apiLinkMatch = cols[4].match(/\[Link\]\((.*?)\)/); // 从 | [Link](API) | 中提取 API 地址
        
        if (apiLinkMatch && apiLinkMatch[1]) {
            apiStatusMap.set(apiLinkMatch[1], status);
        }
    });
    return apiStatusMap;
};

// === 主转换逻辑 ===
const generateConfig = () => {
    console.log("⏳ 正在读取配置和 API 状态，并生成 TVBox 配置...");
    
    const originalSites = loadOriginalConfig();
    const apiStatusMap = loadApiStatus();
    const tvboxSites = [];
    let healthyCount = 0;
    
    for (const key in originalSites) {
        const site = originalSites[key];
        const api = site.api; // 基础 API 地址
        
        // 1. 获取最新状态：从 report.md 中获取状态
        const status = apiStatusMap.get(api) || '❌'; 
        
        // 2. 过滤：只保留状态为 ✅ (成功) 或 🚫 (手动禁用但配置中保留) 的 API
        // 🚨 和 ❌ 状态的 API 将被排除
        if (status !== '✅' && status !== '🚫') {
             continue;
        }
        
        // 3. 构造 TVBox 站点对象
        // TVBox API 需要加上分类参数 ?ac=list
        const apiListUrl = api.includes('apijson.php') ? `${api}?ac=list` : `${api}/?ac=list`;

        const tvboxSite = {
            // 使用原始 key，替换点号/短横线以确保兼容性
            "key": key.replace(/\./g, '_').replace(/-/g, '_'), 
            "name": site.name,
            "type": 1, 
            "api": apiListUrl,
            "searchable": 1, 
            "quickSearch": 1, 
            "filterable": 1, 
            "original_api": api,
            "ext": site.detail,
            "header": DEFAULT_HEADERS,
            "playerType": 1,
            "playUrl": ""
        };
        
        tvboxSites.push(tvboxSite);
        healthyCount++;
    }

    // 4. 构建最终的 TVBox 完整配置结构
    const finalConfig = {
        "spider": SPIDER_URL,
        "sites": tvboxSites,
        "live": {
            "url": LIVE_URL,
            "ext": {}
        },
        "rules": [],
        "ads": []
    };
    
    // 5. 保存文件
    const jsonOutput = JSON.stringify(finalConfig, null, 2);
    fs.writeFileSync(TVBOX_CONFIG_PATH, jsonOutput, "utf-8");
    
    console.log(`\n🎉 成功生成 TVBox 配置 (${healthyCount} 个健康 API):`);
    console.log(`   文件路径: ${TVBOX_CONFIG_PATH}`);
};

generateConfig();
