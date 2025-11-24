const fs = require('fs');
const path = require('path');

// 🚨 路径适配
const DATA_DIR = process.env.DATA_DIR_ENV || path.join(__dirname, 'data');
const CONFIG_PATH = path.join(DATA_DIR, 'LunaTV-config.json');
const REPORT_PATH = path.join(DATA_DIR, 'report.md');

const FILE_HEALTHY = path.join(DATA_DIR, 'tvbox-healthy.json');
const FILE_FULL = path.join(DATA_DIR, 'tvbox-full.json');

// === TVBox 配置常量 ===
const SPIDER_URL = "https://raw.gitmirror.com/FongMi/CatVodSpider/main/jar/custom_spider.jar;md5;e7eabe878887922e3e2e6b011caa80fc";
const LIVE_URL = "https://live.fanmingming.com/tv/m3u/ipv6.m3u"; 
const DEFAULT_HEADERS = { "User-Agent": "Dalvik/2.1.0", "Accept": "*/*", "Connection": "close" };

const isAdultContent = (name) => ['🔞', '福利', '伦理', '成人', '激情'].some(kw => name.includes(kw));

const loadOriginalConfig = () => {
    if (!fs.existsSync(CONFIG_PATH)) return {};
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8")).api_site || {}; 
};

const loadApiStatus = () => {
    if (!fs.existsSync(REPORT_PATH)) return new Map();
    const content = fs.readFileSync(REPORT_PATH, 'utf-8');
    const tableMatch = content.match(/\| 状态 \|[\s\S]+?\n\n/);
    if (!tableMatch) return new Map();
    const map = new Map();
    tableMatch[0].trim().split('\n').slice(2).forEach(line => {
        const cols = line.split('|').map(c => c.trim());
        const match = cols[4].match(/\[Link\]\((.*?)\)/);
        const url = match ? match[1] : cols[4];
        if (url) map.set(url, cols[1]);
    });
    return map;
};

const generateConfig = () => {
    console.log("⏳ 生成配置...");
    const originalSites = loadOriginalConfig();
    const apiStatusMap = loadApiStatus();
    const fullSites = [], healthySites = [];
    
    for (const key in originalSites) {
        const site = originalSites[key];
        const status = apiStatusMap.get(site.api) || '✅'; 
        if (status !== '✅' && status !== '🚫') continue;

        const apiListUrl = site.api.includes('apijson.php') ? `${site.api}?ac=list` : `${site.api}/?ac=list`;
        const siteObj = {
            "key": key.replace(/\./g, '_').replace(/-/g, '_'), "name": site.name, "type": 1, 
            "api": apiListUrl, "searchable": 1, "quickSearch": 1, "filterable": 1, 
            "original_api": site.api, "ext": site.detail, "header": DEFAULT_HEADERS, "playerType": 1
        };
        fullSites.push(siteObj);
        if (!isAdultContent(site.name)) healthySites.push(siteObj);
    }

    const baseConfig = { "spider": SPIDER_URL, "live": { "url": LIVE_URL, "ext": {} }, "rules": [], "ads": [] };
    fs.writeFileSync(FILE_FULL, JSON.stringify({ ...baseConfig, "sites": fullSites }, null, 2));
    fs.writeFileSync(FILE_HEALTHY, JSON.stringify({ ...baseConfig, "sites": healthySites }, null, 2));
    console.log("🎉 配置生成完成");
};

generateConfig();
