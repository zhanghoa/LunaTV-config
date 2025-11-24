# =========================================================
# Stage 1: 构建阶段 (Builder) - 用于安装依赖和修复换行符
# =========================================================
FROM node:20-alpine AS builder

# 1. 安装必要的 Linux 工具 (包括 dos2unix 来修复 CRLF 错误)
RUN apk update && apk add --no-cache dos2unix

WORKDIR /usr/src/app

# 复制依赖文件
COPY package*.json ./

# 安装生产环境依赖
RUN npm install --production

# 激进清理缓存，以减小第一阶段体积
RUN npm cache clean --force

# 复制所有应用脚本和配置到构建器，并立即修复换行符 (CRLF -> LF)
# 🚨 必须确保所有可能被执行的文件都进行修复
COPY check_api.js generate_tvbox_config.js update_readme.js server.js ./
COPY LunaTV-config.json ./
COPY README.md ./

RUN dos2unix check_api.js generate_tvbox_config.js update_readme.js server.js


# =========================================================
# Stage 2: 运行阶段 (Runtime) - 仅包含运行代码所需的文件
# =========================================================
# 保持使用 node:20-alpine 作为最终运行环境，确保稳定性
FROM node:20-alpine

# 设置最终的工作目录
WORKDIR /app

# 复制 Stage 1 中安装好的 node_modules
COPY --from=builder /usr/src/app/node_modules ./node_modules

# 复制 Stage 1 中已修复和清理过的应用代码和配置
COPY --from=builder /usr/src/app/check_api.js ./
COPY --from=builder /usr/src/app/generate_tvbox_config.js ./
COPY --from=builder /usr/src/app/update_readme.js ./
COPY --from=builder /usr/src/app/server.js ./
COPY --from=builder /usr/src/app/LunaTV-config.json ./
COPY --from=builder /usr/src/app/README.md ./

# 暴露 Web 服务器端口
EXPOSE 8080

# 启动 Express 服务器
CMD ["node", "server.js"]
