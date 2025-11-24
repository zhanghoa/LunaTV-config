# =========================================================
# Stage 1: 构建阶段 (Builder)
# 用于安装依赖、清理缓存并修复 Windows 换行符问题
# =========================================================
FROM node:20-alpine AS builder

# 1. 安装 dos2unix 工具
# 这是解决 "exec format error" 的关键，它将 Windows (CRLF) 转换为 Linux (LF)
RUN apk update && apk add --no-cache dos2unix

# 设置构建工作目录
WORKDIR /usr/src/app

# 2. 复制依赖定义文件
COPY package*.json ./

# 3. 安装生产环境依赖
# 只安装运行所需的包 (axios, express, bs58)，忽略开发依赖
RUN npm install --production

# 4. 激进清理 NPM 缓存
# 这一步可以减少几兆到几十兆的临时文件体积
RUN npm cache clean --force

# 5. 复制所有脚本和配置文件到构建目录
# 🚨 注意：这里假设您的主检查脚本名为 check_api.js
# 如果您的文件名是 check_sources_queue_retry.js，请修改下面的文件名
COPY check_api.js generate_tvbox_config.js update_readme.js server.js ./
COPY LunaTV-config.json ./
COPY README.md ./

# 6. 🚨 关键修复：强制转换所有 .js 文件的换行符
# 这将消除 Windows 编辑器引入的 \r 字符，防止 Linux 内核无法执行
RUN dos2unix check_api.js generate_tvbox_config.js update_readme.js server.js


# =========================================================
# Stage 2: 运行阶段 (Runtime)
# 仅复制必要文件，保持镜像极简 (约 80MB)
# =========================================================
FROM node:20-alpine

# 设置运行时工作目录
WORKDIR /app

# 1. 从构建阶段复制已安装的 node_modules
COPY --from=builder /usr/src/app/node_modules ./node_modules

# 2. 从构建阶段复制已修复换行符的脚本和配置
COPY --from=builder /usr/src/app/check_api.js ./
COPY --from=builder /usr/src/app/generate_tvbox_config.js ./
COPY --from=builder /usr/src/app/update_readme.js ./
COPY --from=builder /usr/src/app/server.js ./
COPY --from=builder /usr/src/app/LunaTV-config.json ./
COPY --from=builder /usr/src/app/README.md ./

# 3. 暴露 Web 端口
EXPOSE 8080

# 4. 启动命令
# 使用 ENTRYPOINT ["node"] 可以绕过基础镜像中潜在的 Shell 脚本问题
ENTRYPOINT ["node"]
CMD ["server.js"]
