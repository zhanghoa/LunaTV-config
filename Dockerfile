# =========================================================
# Stage 1: 构建阶段
# =========================================================
FROM node:20-alpine AS builder

# 安装工具
RUN apk update && apk add --no-cache dos2unix

WORKDIR /usr/src/app

# 复制依赖
COPY package*.json ./
RUN npm install --production
RUN npm cache clean --force

# 复制所有文件
# 🚨 确保这里包含您所有的 .js 和 .json
COPY check_api.js generate_tvbox_config.js update_readme.js server.js ./
COPY LunaTV-config.json ./
COPY README.md ./

# 修复换行符 (确保所有 JS 文件都被处理)
RUN dos2unix *.js

# =========================================================
# Stage 2: 运行阶段
# =========================================================
FROM node:20-alpine

WORKDIR /app

# 1. 复制依赖
COPY --from=builder /usr/src/app/node_modules ./node_modules

# 2. 复制脚本到 /app
COPY --from=builder /usr/src/app/*.js ./

# 3. 创建数据目录
RUN mkdir -p /app/data

# 4. 🚨 修正点：复制配置文件到 /app/ (作为初始化模板)
# 这样 check_api.js 里的初始化逻辑才能找到源文件
COPY --from=builder /usr/src/app/LunaTV-config.json ./
COPY --from=builder /usr/src/app/README.md ./

# 5. (可选) 同时复制一份到 /app/data/ 
# 这样如果不挂载卷，直接运行也能有默认配置
COPY --from=builder /usr/src/app/LunaTV-config.json /app/data/
COPY --from=builder /usr/src/app/README.md /app/data/

EXPOSE 8080
ENTRYPOINT ["node"]
CMD ["server.js"]
