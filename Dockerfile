# 多阶段构建 - 构建阶段
FROM node:20.12-alpine3.19 AS builder

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production && npm cache clean --force

# 复制源码
COPY . .

# 构建项目
RUN npm run build

# 运行阶段
FROM node:20.12-alpine3.19 AS runner

# 安装必要的系统依赖
RUN apk add --no-cache \
    sqlite \
    tzdata \
    ca-certificates

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./

# 仅安装生产依赖
RUN npm ci --only=production && npm cache clean --force
# 从构建阶段复制构建产物
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./

# 创建数据目录
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

# 创建日志目录
RUN mkdir -p /app/logs && chown -R nextjs:nodejs /app/logs
# 切换到非root用户
USER nextjs

# 暴露端口
EXPOSE 3000 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 启动命令
CMD ["npm", "start"]