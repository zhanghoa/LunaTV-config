# 使用官方 Node.js 20 精简版作为基础镜像
FROM node:20-alpine

# 设置容器内的工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json (如果存在)
COPY package*.json ./

# 安装项目依赖 (包括 axios 和 express)
RUN npm install --production

# 复制所有应用代码和配置文件到容器中
# 🚨 确保您的所有 .js 脚本和 LunaTV-config.json 在构建上下文中
COPY check_api.js generate_tvbox_config.js update_readme.js server.js ./
COPY LunaTV-config.json ./
COPY README.md ./

# 暴露 Web 服务器端口
EXPOSE 8080

# 定义容器启动时执行的命令 (启动 Express 服务器)
CMD ["node", "server.js"]
