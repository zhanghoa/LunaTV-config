// server.js
const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 8080;

// 中间件配置
app.use(express.static(path.join(__dirname)));
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // 允许解析 JSON 请求体

// === 工具函数 ===
// 获取目录下所有 .json 文件 (排除非配置文件)
const getConfigList = () => {
    try {
        const files = fs.readdirSync(__dirname);
        return files.filter(file => 
            file.endsWith('.json') && 
            file !== 'package.json' && 
            file !== 'package-lock.json' &&
            file !== 'tvbox-config-healthy.json' // 排除生成的结果文件
        );
    } catch (e) {
        return [];
    }
};

// -----------------------------------------------------
// 1. API 路由 (用于前端 AJAX 调用)
// -----------------------------------------------------

// 获取文件列表
app.get('/api/files', (req, res) => {
    res.json(getConfigList());
});

// 读取特定文件内容
app.get('/api/file/:filename', (req, res) => {
    const filepath = path.join(__dirname, req.params.filename);
    // 安全检查：防止读取目录外文件
    if (path.dirname(filepath) !== __dirname) return res.status(403).send('Forbidden');
    
    try {
        const content = fs.readFileSync(filepath, 'utf-8');
        res.send(content);
    } catch (e) {
        res.status(404).send('File not found');
    }
});

// 保存文件 (新建或覆盖)
app.post('/api/save', (req, res) => {
    const { filename, content } = req.body;
    if (!filename || !filename.endsWith('.json')) return res.status(400).send('文件名无效 (必须以 .json 结尾)');
    
    try {
        // 验证 JSON 格式是否合法
        JSON.parse(content); 
        
        const filepath = path.join(__dirname, filename);
        fs.writeFileSync(filepath, content, 'utf-8');
        res.send({ success: true, message: '文件保存成功' });
    } catch (e) {
        res.status(400).send(`保存失败:JSON 格式错误或写入失败 - ${e.message}`);
    }
});

// 删除文件
app.post('/api/delete', (req, res) => {
    const { filename } = req.body;
    if (filename === 'LunaTV-config.json') return res.status(400).send('不能删除主配置文件');
    
    try {
        fs.unlinkSync(path.join(__dirname, filename));
        res.send({ success: true });
    } catch(e) {
        res.status(500).send(e.message);
    }
});

// 将某个文件“应用”为主配置 (覆盖 LunaTV-config.json)
app.post('/api/apply', (req, res) => {
    const { filename } = req.body;
    try {
        const sourcePath = path.join(__dirname, filename);
        const targetPath = path.join(__dirname, 'LunaTV-config.json');
        fs.copyFileSync(sourcePath, targetPath);
        res.send({ success: true, message: `已将 ${filename} 应用为当前主配置` });
    } catch (e) {
        res.status(500).send(e.message);
    }
});

// 触发检查任务
app.post('/trigger-check', (req, res) => {
    const keyword = req.body.keyword || '斗罗大陆';
    const command = `node check_api.js "${keyword}" && node generate_tvbox_config.js && node update_readme.js`;
    exec(command); // 异步执行
    res.redirect('/');
});

// -----------------------------------------------------
// 2. 主页面 (Dashboard)
// -----------------------------------------------------
app.get('/', (req, res) => {
    let readmeContent = "暂无状态报告，请运行检查...";
    if (fs.existsSync(path.join(__dirname, 'README.md'))) {
        readmeContent = fs.readFileSync(path.join(__dirname, 'README.md'), 'utf-8');
    }

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
                
                /* 布局 */
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                @media(max-width: 768px) { .grid { grid-template-columns: 1fr; } }
                
                .card { background: var(--card); padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-bottom: 20px; }
                h2 { margin-top: 0; border-bottom: 2px solid #eee; padding-bottom: 10px; font-size: 1.2rem; }
                
                /* 表单元素 */
                input, select, button { padding: 10px; border-radius: 5px; border: 1px solid #ddd; margin-bottom: 10px; }
                button { background: var(--primary); color: white; border: none; cursor: pointer; font-weight: bold; }
                button:hover { opacity: 0.9; }
                button.secondary { background: #6c757d; }
                button.danger { background: #dc3545; }
                
                textarea { width: 100%; height: 400px; font-family: monospace; background: #2d2d2d; color: #ccc; border-radius: 5px; padding: 10px; border: none; box-sizing: border-box; resize: vertical; }
                
                /* 顶部工具栏 */
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
                        <button onclick="applyConfig()" title="将此文件覆盖为 LunaTV-config.json">⚡ 设为当前配置</button>
                        <button onclick="deleteFile()" class="danger">🗑️ 删除</button>
                        <span id="currentFileLabel" class="file-status"></span>
                    </div>
                    
                    <div style="display:flex; gap:10px; margin-bottom: 10px;">
                        <input type="text" id="newFileName" placeholder="另存为新文件名 (例如: backup.json)" style="flex:1">
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
                        <p style="font-size:0.9em; color:#666;">* 任务将基于当前的 <b>LunaTV-config.json</b> 运行</p>
                    </div>

                    <div class="card">
                        <h2>📥 结果下载</h2>
                        <div class="download-list">
                            <a href="/tvbox-config-healthy.json" download>📺 健康配置 (JSON)</a>
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
                
                // 初始化：加载文件列表
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
                        // 尝试格式化 JSON
                        try {
                            const json = JSON.parse(text);
                            editor.value = JSON.stringify(json, null, 4);
                        } catch(e) {
                            editor.value = text;
                        }
                        document.getElementById('currentFileLabel').innerText = '正在编辑: ' + filename;
                    } else {
                        alert('读取失败');
                    }
                }

                async function saveFile() {
                    const filename = fileSelect.value;
                    if (!filename) return alert('请先选择一个文件');
                    await doSave(filename);
                }

                async function saveAs() {
                    const name = document.getElementById('newFileName').value;
                    if (!name) return alert('请输入文件名');
                    if (!name.endsWith('.json')) return alert('文件名必须以 .json 结尾');
                    await doSave(name);
                    document.getElementById('newFileName').value = '';
                    await fetchFiles(); // 刷新列表
                    fileSelect.value = name; // 选中新文件
                    loadFile();
                }

                async function doSave(filename) {
                    const content = editor.value;
                    try {
                        JSON.parse(content); // 校验 JSON
                    } catch(e) {
                        return alert('❌ 保存失败：JSON 格式错误！请检查语法。\\n' + e.message);
                    }

                    const res = await fetch('/api/save', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ filename, content })
                    });
                    const result = await res.json();
                    if(res.ok) alert('✅ ' + result.message);
                    else alert('❌ ' + result.message || '保存失败');
                }
                
                async function applyConfig() {
                    const filename = fileSelect.value;
                    if (!filename) return alert('请先选择文件');
                    if (filename === 'LunaTV-config.json') return alert('该文件已经是主配置了');
                    
                    if(!confirm('确定要将 ' + filename + ' 覆盖为 LunaTV-config.json 吗？\\n这将改变下次检测使用的源列表。')) return;

                    const res = await fetch('/api/apply', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ filename })
                    });
                    if(res.ok) {
                        alert('✅ 应用成功！现在 LunaTV-config.json 的内容已更新。');
                        fetchFiles(); // 刷新列表状态
                    }
                }

                async function deleteFile() {
                    const filename = fileSelect.value;
                    if (!filename) return;
                    if (!confirm('确定要删除 ' + filename + ' 吗？此操作不可恢复！')) return;
                    
                    const res = await fetch('/api/delete', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ filename })
                    });
                    if(res.ok) {
                        alert('已删除');
                        editor.value = '';
                        fetchFiles();
                    } else {
                        alert('删除失败');
                    }
                }
            </script>
        </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`🎉 配置管理中心已启动: http://localhost:${PORT}`);
});
