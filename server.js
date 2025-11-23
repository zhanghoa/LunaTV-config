// server.js
const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 8080;

// 设置静态文件目录，用于托管生成的 report.md, tvbox-config-healthy.json 等
app.use(express.static(path.join(__dirname)));
app.use(express.urlencoded({ extended: true })); // 用于解析 POST 请求的表单数据

// -----------------------------------------------------
// 1. 主页面 (Dashboard) 路由
// -----------------------------------------------------
app.get('/', (req, res) => {
    // 异步读取 README.md 的内容作为状态展示
    // 注意：如果 README.md 不存在，这里会抛出同步错误，生产环境中应使用异步读取和错误处理
    try {
        const readmeContent = fs.readFileSync(path.join(__dirname, 'README.md'), 'utf-8');
        
        // 构建一个简单的 HTML 页面
        res.send(`
            <!DOCTYPE html>
            <html lang="zh-CN">
            <head>
                <meta charset="UTF-8">
                <title>LunaTV API 监控中心</title>
                <style>
                    body { font-family: sans-serif; margin: 30px; }
                    .report-content { white-space: pre-wrap; background: #f4f4f4; padding: 15px; border-radius: 5px; }
                    .action-form { margin-top: 20px; border: 1px solid #ccc; padding: 15px; border-radius: 5px; }
                </style>
            </head>
            <body>
                <h1>📺 LunaTV API 监控中心</h1>

                <div class="action-form">
                    <h2>手动触发 API 检查</h2>
                    <form action="/trigger-check" method="POST">
                        <label for="keyword">搜索关键字:</label>
                        <input type="text" id="keyword" name="keyword" value="斗罗大陆" placeholder="请输入搜索关键字">
                        <button type="submit">立即运行检查</button>
                    </form>
                    <p id="status-message" style="color: blue;"></p>
                </div>
                
                <h2>下载链接</h2>
                <ul>
                    <li><a href="/tvbox-config-healthy.json" download>下载健康 TVBox 配置 (.json)</a></li>
                    <li><a href="/report.md" download>下载详细健康报告 (.md)</a></li>
                </ul>

                <h2>最新状态 (README.md)</h2>
                <div class="report-content">
                    ${readmeContent}
                </div>
                <script>
                    // 提交表单时显示状态信息
                    document.querySelector('form').onsubmit = function() {
                        document.getElementById('status-message').innerText = '任务已发送到后台，请等待后台执行，任务可能需要几分钟...';
                    };
                </script>
            </body>
            </html>
        `);
    } catch (e) {
        res.status(500).send(`无法读取 README.md，请先运行 API 检查脚本。错误: ${e.message}`);
    }
});

// -----------------------------------------------------
// 2. 触发 API 检查任务的 POST 路由
// -----------------------------------------------------
app.post('/trigger-check', (req, res) => {
    const keyword = req.body.keyword || '斗罗大陆';

    // 运行脚本序列：检查 -> 生成配置 -> 更新 README
    const command = `node check_api.js "${keyword}" && node generate_tvbox_config.js && node update_readme.js`;
    
    // 在后台运行命令
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`[任务错误]: ${error.message}`);
            // 生产环境中应有更健壮的错误通知机制
            return;
        }
        console.log(`[任务完成]: ${stdout}`);
    });

    // 立即重定向回主页，让用户看到状态信息
    res.redirect('/');
});


// 启动服务器
app.listen(PORT, () => {
    console.log(`🎉 监控中心已启动: http://localhost:${PORT}`);
});
