// server.js (数据分离版)
const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 8080;

// 🚨 定义数据目录：所有配置和生成文件都放在这里
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

// 托管数据目录（下载文件）和当前目录（样式等）
app.use(express.static(DATA_DIR));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// === 工具函数 ===
const getConfigList = () => {
    try {
        const files = fs.readdirSync(DATA_DIR);
        return files.filter(f => f.endsWith('.json'));
    } catch (e) { return []; }
};

// API 路由
app.get('/api/files', (req, res) => res.json(getConfigList()));

app.get('/api/file/:filename', (req, res) => {
    const filepath = path.join(DATA_DIR, req.params.filename);
    if (path.dirname(filepath) !== DATA_DIR) return res.status(403).send('Forbidden');
    try { res.send(fs.readFileSync(filepath, 'utf-8')); } catch (e) { res.status(404).send('Not found'); }
});

app.post('/api/save', (req, res) => {
    const { filename, content } = req.body;
    try {
        JSON.parse(content);
        fs.writeFileSync(path.join(DATA_DIR, filename), content, 'utf-8');
        res.send({ success: true, message: '保存成功' });
    } catch (e) { res.status(400).send(e.message); }
});

app.post('/api/delete', (req, res) => {
    try {
        fs.unlinkSync(path.join(DATA_DIR, req.body.filename));
        res.send({ success: true });
    } catch(e) { res.status(500).send(e.message); }
});

app.post('/api/apply', (req, res) => {
    try {
        fs.copyFileSync(path.join(DATA_DIR, req.body.filename), path.join(DATA_DIR, 'LunaTV-config.json'));
        res.send({ success: true });
    } catch (e) { res.status(500).send(e.message); }
});

app.post('/trigger-check', (req, res) => {
    const keyword = req.body.keyword || '斗罗大陆';
    // 传递 DATA_DIR 给脚本
    const command = `node check_api.js "${keyword}" && node generate_tvbox_config.js && node update_readme.js`;
    exec(command, { env: { ...process.env, DATA_DIR_ENV: DATA_DIR } });
    res.redirect('/');
});

app.get('/', (req, res) => {
    let readmeContent = "暂无状态...";
    const readmePath = path.join(DATA_DIR, 'README.md');
    if (fs.existsSync(readmePath)) readmeContent = fs.readFileSync(readmePath, 'utf-8');
    
    // ... (此处省略 HTML 模板，HTML 内容保持不变，只需确保 HTML 里的 download 链接指向正确即可)
    // 为节省篇幅，请保留您之前的 HTML 模板代码，
    // 唯独需要确认的是 fetch('/api/...') 的逻辑没变，HTML 不需要大改。
    // 将以下 HTML 重新粘贴回去：
    res.send(`
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>LunaTV 配置管理中心</title>
            <style>
                :root { --primary: #4a90e2; --bg: #f4f6f9; --card: #fff; }
                body { font-family: sans-serif; background: var(--bg); color: #333; padding: 20px; margin: 0; }
                .container { max-width: 1000px; margin: 0 auto; }
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                @media(max-width: 768px) { .grid { grid-template-columns: 1fr; } }
                .card { background: var(--card); padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-bottom: 20px; }
                h2 { margin-top: 0; border-bottom: 2px solid #eee; padding-bottom: 10px; font-size: 1.2rem; }
                input, select, button { padding: 10px; border-radius: 5px; border: 1px solid #ddd; margin-bottom: 10px; }
                button { background: var(--primary); color: white; border: none; cursor: pointer; font-weight: bold; }
                button.secondary { background: #6c757d; }
                button.danger { background: #dc3545; }
                textarea { width: 100%; height: 400px; font-family: monospace; background: #2d2d2d; color: #ccc; border-radius: 5px; padding: 10px; border: none; box-sizing: border-box; resize: vertical; }
                .editor-toolbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 10px; }
                .file-status { font-size: 0.9em; color: #666; margin-left: auto; }
                .download-list a { display: block; padding: 10px; background: #f8f9fa; margin-bottom: 5px; text-decoration: none; color: #333; border-radius: 5px; }
                .download-list a:hover { background: #e2e6ea; color: var(--primary); }
                .log-box { background: #1e1e1e; color: #ccc; padding: 15px; border-radius: 5px; height: 300px; overflow: auto; white-space: pre-wrap; font-family: monospace; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1 style="text-align: center; color: #2c3e50;">📺 LunaTV 配置管理中心</h1>
                
                <div class="card">
                    <h2>📝 JSON 配置编辑器</h2>
                    <div class="editor-toolbar">
                        <select id="fileSelect" onchange="loadFile()">
                            <option value="" disabled selected>选择配置文件...</option>
                        </select>
                        <button onclick="loadFile()" class="secondary">🔄 刷新</button>
                        <button onclick="saveFile()">💾 保存</button>
                        <button onclick="applyConfig()" title="覆盖主配置">⚡ 设为当前配置</button>
                        <button onclick="deleteFile()" class="danger">🗑️ 删除</button>
                        <span id="currentFileLabel" class="file-status"></span>
                    </div>
                    <div style="display:flex; gap:10px; margin-bottom: 10px;">
                        <input type="text" id="newFileName" placeholder="另存为文件名 (如: backup.json)" style="flex:1">
                        <button onclick="saveAs()" class="secondary">另存为</button>
                    </div>
                    <textarea id="jsonEditor" spellcheck="false"></textarea>
                </div>

                <div class="grid">
                    <div class="card">
                        <h2>⚙️ 运行检测</h2>
                        <form action="/trigger-check" method="POST">
                            <div style="display:flex; gap:10px;">
                                <input type="text" name="keyword" value="斗罗大陆" placeholder="搜索关键字..." style="flex:1">
                                <button type="submit">🚀 运行</button>
                            </div>
                        </form>
                    </div>
                    <div class="card">
                        <h2>📥 结果下载</h2>
                        <div class="download-list">
                            <a href="/tvbox-healthy.json" download>📺 纯净版配置 (Healthy)</a>
                            <a href="/tvbox-full.json" download>🔥 完整版配置 (Full)</a>
                            <a href="/report.md" download>📊 详细报告 (MD)</a>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <h2>📈 实时状态</h2>
                    <div class="log-box">${readmeContent}</div>
                </div>
            </div>

            <script>
                const editor = document.getElementById('jsonEditor');
                const fileSelect = document.getElementById('fileSelect');
                
                fetchFiles();
                async function fetchFiles() {
                    const res = await fetch('/api/files');
                    const files = await res.json();
                    fileSelect.innerHTML = '<option value="" disabled selected>选择文件...</option>';
                    files.forEach(f => {
                        const option = document.createElement('option');
                        option.value = f;
                        option.text = f + (f === 'LunaTV-config.json' ? ' (当前主配置)' : '');
                        if(f === 'LunaTV-config.json') option.style.fontWeight = 'bold';
                        fileSelect.appendChild(option);
                    });
                }
                async function loadFile() {
                    const filename = fileSelect.value;
                    if (!filename) return;
                    const res = await fetch('/api/file/' + filename);
                    if (res.ok) {
                        const text = await res.text();
                        try { editor.value = JSON.stringify(JSON.parse(text), null, 4); } catch(e) { editor.value = text; }
                        document.getElementById('currentFileLabel').innerText = '正在编辑: ' + filename;
                    }
                }
                async function saveFile() {
                    const filename = fileSelect.value;
                    if (!filename) return alert('请先选择一个文件');
                    doSave(filename);
                }
                async function saveAs() {
                    const name = document.getElementById('newFileName').value;
                    if (!name || !name.endsWith('.json')) return alert('文件名无效');
                    doSave(name);
                    document.getElementById('newFileName').value = '';
                    setTimeout(() => { fetchFiles(); fileSelect.value = name; loadFile(); }, 500);
                }
                async function doSave(filename) {
                    const content = editor.value;
                    try { JSON.parse(content); } catch(e) { return alert('JSON 格式错误'); }
                    const res = await fetch('/api/save', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ filename, content })
                    });
                    if(res.ok) alert('✅ 保存成功');
                }
                async function applyConfig() {
                    const filename = fileSelect.value;
                    if (!filename) return;
                    if(!confirm('覆盖主配置？')) return;
                    const res = await fetch('/api/apply', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ filename })
                    });
                    if(res.ok) { alert('✅ 已应用'); fetchFiles(); }
                }
                async function deleteFile() {
                    const filename = fileSelect.value;
                    if (!filename || !confirm('确定删除？')) return;
                    const res = await fetch('/api/delete', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ filename })
                    });
                    if(res.ok) { alert('已删除'); editor.value = ''; fetchFiles(); }
                }
            </script>
        </body>
        </html>
    `);
});

app.listen(PORT, () => { console.log(`启动成功: http://localhost:${PORT}`); });
