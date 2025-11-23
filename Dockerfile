FROM node:20-alpine

# 设置容器内的工作目录
WORKDIR /app

# 复制合并后的 package.json 和 package-lock.json 
COPY package*.json ./

# 安装所有依赖 (包括 bs58, express, axios)
RUN npm install --production

# 复制所有应用代码和配置文件到容器中
# 🚨 确保您的 encode.js 和 server.js 都在构建上下文中
COPY check_api.js generate_tvbox_config.js update_readme.js server.js ./
COPY LunaTV-config.json ./
COPY README.md ./

# 暴露 Web 服务器端口
EXPOSE 8080

# 启动 Express 服务器
CMD ["node", "server.js"]
