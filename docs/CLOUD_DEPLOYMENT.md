# 上海气候周 2026 — 云端部署指南

> 最后更新：2026-03-24

---

## 目录

1. [项目技术概览](#1-项目技术概览)
2. [服务器环境要求](#2-服务器环境要求)
3. [环境变量配置](#3-环境变量配置)
4. [方案 A：Docker 部署（推荐）](#4-方案-adocker-部署推荐)
5. [方案 B：直接部署到 Linux 服务器](#5-方案-b直接部署到-linux-服务器)
6. [方案 C：Vercel 部署](#6-方案-cvercel-部署)
7. [数据库配置](#7-数据库配置)
8. [Nginx 反向代理与 HTTPS](#8-nginx-反向代理与-https)
9. [CI/CD 自动化部署](#9-cicd-自动化部署)
10. [监控与日志](#10-监控与日志)
11. [安全加固清单](#11-安全加固清单)
12. [常见问题排查](#12-常见问题排查)

---

## 1. 项目技术概览

| 组件         | 技术栈                     | 版本       |
| ------------ | -------------------------- | ---------- |
| 前端框架     | Next.js (App Router)       | 14.2.35    |
| 运行时       | Node.js                    | ≥ 20       |
| 语言         | TypeScript                 | 5.3.3      |
| 数据库       | PostgreSQL                 | ≥ 14       |
| ORM          | Prisma                     | 5.10+      |
| 认证         | NextAuth v4 (JWT + Credentials) | 4.24.13 |
| 国际化       | next-intl (zh / en)        | 4.8.3      |
| CSS          | Tailwind CSS               | 3.4.1      |
| 邮件         | Nodemailer (SMTP)          | 7.0.13     |

---

## 2. 服务器环境要求

### 最低配置

| 资源   | 最低要求         | 推荐配置            |
| ------ | ---------------- | ------------------- |
| CPU    | 1 核             | 2 核+               |
| 内存   | 1 GB             | 2 GB+               |
| 硬盘   | 20 GB SSD        | 40 GB SSD           |
| 系统   | Ubuntu 22.04 LTS | Ubuntu 22.04 / 24.04 |
| 网络   | 公网 IP + 开放 80/443 端口 |                    |

### 需要安装的软件

- **Node.js** ≥ 20（推荐使用 [nvm](https://github.com/nvm-sh/nvm) 管理）
- **npm** ≥ 10
- **PostgreSQL** ≥ 14（或使用托管数据库服务）
- **Nginx**（反向代理）
- **Certbot**（Let's Encrypt SSL 证书）
- **pm2** 或 **systemd**（进程管理）
- （可选）**Docker** ≥ 24 + **Docker Compose** ≥ 2.20

---

## 3. 环境变量配置

在服务器上创建 `.env.production` 文件（**绝对不要提交到 Git**）：

```bash
# ============ 数据库 ============
DATABASE_URL="postgresql://用户名:密码@数据库地址:5432/shcw2026?schema=public"

# ============ NextAuth ============
NEXTAUTH_URL="https://你的域名.com"
NEXTAUTH_SECRET="生成一个至少32字符的随机密钥"
# 生成方法：openssl rand -base64 32

# ============ SMTP 邮件 ============
SMTP_HOST="smtp.你的邮箱服务商.com"
SMTP_PORT=587
SMTP_USER="your-email@example.com"
SMTP_PASSWORD="your-smtp-password"
FROM_EMAIL="noreply@shanghaiclimateweek.org.cn"

# ============ 应用配置 ============
APP_NAME="上海气候周2026"
APP_URL="https://你的域名.com"
NODE_ENV="production"
PORT=3000
```

### 关键安全提醒

| 变量             | 说明                                           |
| ---------------- | ---------------------------------------------- |
| `NEXTAUTH_SECRET` | **必须**更换为强随机值，不能使用开发环境的默认值 |
| `DATABASE_URL`   | 使用强密码，限制数据库仅内网访问                  |
| `NEXTAUTH_URL`   | **必须**设置为生产域名，含 `https://`             |
| `SMTP_PASSWORD`  | 使用应用专用密码而非邮箱登录密码                  |

---

## 4. 方案 A：Docker 部署（推荐）

### 4.1 创建 Dockerfile

在 `my-app/` 目录下创建 `Dockerfile`：

```dockerfile
# ---- 依赖安装阶段 ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# ---- 构建阶段 ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- 运行阶段 ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 复制必要文件
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/messages ./messages

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

> **注意**：使用 standalone 输出需要在 `next.config.mjs` 中添加配置，见下方 4.2。

### 4.2 启用 standalone 输出

在 `next.config.mjs` 中添加 `output: "standalone"`：

```js
const nextConfig = {
  output: "standalone",          // ← 添加此行
  poweredByHeader: false,
  // ... 其余配置不变
};
```

### 4.3 创建 docker-compose.yml

在项目根目录（`my-app/`）创建：

```yaml
services:
  db:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_DB: shcw2026
      POSTGRES_USER: shcw
      POSTGRES_PASSWORD: ${DB_PASSWORD:-changeme}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "127.0.0.1:5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U shcw -d shcw2026"]
      interval: 5s
      timeout: 5s
      retries: 5

  app:
    build: .
    restart: always
    ports:
      - "127.0.0.1:3000:3000"
    environment:
      DATABASE_URL: "postgresql://shcw:${DB_PASSWORD:-changeme}@db:5432/shcw2026?schema=public"
      NEXTAUTH_URL: "${NEXTAUTH_URL}"
      NEXTAUTH_SECRET: "${NEXTAUTH_SECRET}"
      SMTP_HOST: "${SMTP_HOST}"
      SMTP_PORT: "${SMTP_PORT:-587}"
      SMTP_USER: "${SMTP_USER}"
      SMTP_PASSWORD: "${SMTP_PASSWORD}"
      FROM_EMAIL: "${FROM_EMAIL:-noreply@shanghaiclimateweek.org.cn}"
      APP_NAME: "${APP_NAME:-上海气候周2026}"
      APP_URL: "${NEXTAUTH_URL}"
      NODE_ENV: production
    depends_on:
      db:
        condition: service_healthy

volumes:
  pgdata:
```

### 4.4 创建 .dockerignore

```
node_modules
.next
.git
*.md
.env*
tests/
```

### 4.5 部署命令

```bash
# 1. 在服务器上克隆代码
git clone <仓库地址> && cd my-app

# 2. 创建 .env 文件（填写生产环境变量）
cp .env.example .env.production
nano .env.production

# 3. 构建并启动
docker compose --env-file .env.production up -d --build

# 4. 运行数据库迁移
docker compose exec app npx prisma migrate deploy

# 5. （首次）运行种子数据
docker compose exec app npx tsx prisma/seed.ts

# 6. 查看日志
docker compose logs -f app
```

### 4.6 更新部署

```bash
git pull origin main
docker compose --env-file .env.production up -d --build
docker compose exec app npx prisma migrate deploy
```

---

## 5. 方案 B：直接部署到 Linux 服务器

### 5.1 安装 Node.js

```bash
# 使用 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
node -v  # 确认 v20.x
```

### 5.2 安装 PostgreSQL

```bash
sudo apt update && sudo apt install -y postgresql postgresql-contrib

# 创建数据库和用户
sudo -u postgres psql <<EOF
CREATE USER shcw WITH PASSWORD '你的强密码';
CREATE DATABASE shcw2026 OWNER shcw;
GRANT ALL PRIVILEGES ON DATABASE shcw2026 TO shcw;
EOF
```

### 5.3 部署应用

```bash
# 1. 克隆代码
git clone <仓库地址> && cd my-app

# 2. 安装依赖
npm ci --only=production
npm run db:generate

# 3. 创建环境变量
cp .env.example .env.production
nano .env.production   # 填写生产配置

# 4. 设置环境变量
export $(grep -v '^#' .env.production | xargs)

# 5. 数据库迁移
npx prisma migrate deploy

# 6. （首次）种子数据
npx tsx prisma/seed.ts

# 7. 构建
npm run build

# 8. 启动
npm run start
```

### 5.4 使用 PM2 进程管理

```bash
# 安装 pm2
npm install -g pm2

# 创建 ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: "shcw2026",
    script: "npm",
    args: "run start",
    cwd: "/home/deploy/my-app",
    env: {
      NODE_ENV: "production",
      PORT: 3000,
    },
    env_file: ".env.production",
    instances: 1,
    autorestart: true,
    max_memory_restart: "1G",
    log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    error_file: "./logs/error.log",
    out_file: "./logs/out.log",
    merge_logs: true,
  }]
};
EOF

# 创建日志目录
mkdir -p logs

# 启动
pm2 start ecosystem.config.js

# 设置开机自启
pm2 startup
pm2 save

# 常用命令
pm2 status          # 查看状态
pm2 logs shcw2026   # 查看日志
pm2 restart shcw2026 # 重启
pm2 reload shcw2026  # 零停机重启
```

---

## 6. 方案 C：Vercel 部署

Vercel 是 Next.js 官方推荐的托管平台，配置最简单。

### 6.1 前置准备

- 将代码推送到 GitHub/GitLab
- 准备一个外部 PostgreSQL 数据库（推荐：[Supabase](https://supabase.com)、[Neon](https://neon.tech)、[Railway](https://railway.app)）

### 6.2 部署步骤

1. 登录 [vercel.com](https://vercel.com)，导入 Git 仓库
2. **Root Directory** 设为 `my-app`
3. **Framework Preset** 选择 `Next.js`
4. 在 **Environment Variables** 中配置所有生产环境变量
5. **Build Command**：`npx prisma generate && npm run build`
6. 点击 Deploy

### 6.3 数据库迁移

Vercel 不提供持久终端，需在本地或 CI 中运行迁移：

```bash
# 在本地使用生产 DATABASE_URL
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

### 6.4 注意事项

- **不需要** 在 `next.config.mjs` 中设置 `output: "standalone"`
- **不需要** Nginx 或 SSL 配置，Vercel 自动处理
- **免费额度**有限（Hobby 计划：100GB 带宽/月），商用建议 Pro 计划
- Serverless 函数冷启动可能影响首次请求速度

---

## 7. 数据库配置

### 7.1 生产数据库安全

```bash
# 仅允许本地和应用服务器连接（编辑 pg_hba.conf）
sudo nano /etc/postgresql/16/main/pg_hba.conf

# 添加：
# host  shcw2026  shcw  127.0.0.1/32  scram-sha-256
# host  shcw2026  shcw  应用服务器IP/32  scram-sha-256

# 重启 PostgreSQL
sudo systemctl restart postgresql
```

### 7.2 数据库连接池（高并发场景）

如并发用户数超过 50，建议使用连接池：

```bash
# 安装 PgBouncer
sudo apt install pgbouncer

# 配置 /etc/pgbouncer/pgbouncer.ini
[databases]
shcw2026 = host=127.0.0.1 port=5432 dbname=shcw2026

[pgbouncer]
listen_port = 6432
pool_mode = transaction
max_client_conn = 200
default_pool_size = 20
```

更新 `DATABASE_URL`：
```
DATABASE_URL="postgresql://shcw:密码@127.0.0.1:6432/shcw2026?schema=public&pgbouncer=true"
```

### 7.3 数据库备份

```bash
# 创建自动备份脚本
cat > /home/deploy/backup-db.sh << 'SCRIPT'
#!/bin/bash
BACKUP_DIR="/home/deploy/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

pg_dump -U shcw -h 127.0.0.1 shcw2026 | gzip > "$BACKUP_DIR/shcw2026_$TIMESTAMP.sql.gz"

# 保留最近 30 天的备份
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete
SCRIPT

chmod +x /home/deploy/backup-db.sh

# 添加 cron 任务（每天凌晨 3 点备份）
(crontab -l 2>/dev/null; echo "0 3 * * * /home/deploy/backup-db.sh") | crontab -
```

---

## 8. Nginx 反向代理与 HTTPS

### 8.1 安装 Nginx + Certbot

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 8.2 Nginx 配置

```nginx
# /etc/nginx/sites-available/shcw2026
server {
    listen 80;
    server_name 你的域名.com www.你的域名.com;

    # Let's Encrypt 验证
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # HTTP → HTTPS 重定向
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name 你的域名.com www.你的域名.com;

    # SSL 证书（certbot 自动填充）
    ssl_certificate /etc/letsencrypt/live/你的域名.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/你的域名.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 1000;

    # 静态资源缓存
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    location /images/ {
        proxy_pass http://127.0.0.1:3000;
        expires 30d;
        add_header Cache-Control "public";
    }

    # 反向代理到 Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
        client_max_body_size 10M;
    }
}
```

### 8.3 启用配置

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/shcw2026 /etc/nginx/sites-enabled/

# 删除默认配置
sudo rm /etc/nginx/sites-enabled/default

# 测试配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

### 8.4 申请 SSL 证书

```bash
# 先确保域名 DNS 已解析到服务器 IP
sudo certbot --nginx -d 你的域名.com -d www.你的域名.com

# 设置自动续期
sudo certbot renew --dry-run
```

---

## 9. CI/CD 自动化部署

### GitHub Actions 示例

在仓库中创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: my-app/package-lock.json

      - name: Install & Build
        working-directory: my-app
        run: |
          npm ci
          npx prisma generate
          npm run build

      - name: Deploy to Server
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /home/deploy/my-app
            git pull origin main
            npm ci --only=production
            npx prisma generate
            npx prisma migrate deploy
            npm run build
            pm2 reload shcw2026
```

### 需要配置的 GitHub Secrets

| Secret 名称       | 说明                   |
| ------------------ | ---------------------- |
| `SERVER_HOST`      | 服务器 IP 或域名       |
| `SERVER_USER`      | SSH 登录用户名         |
| `SSH_PRIVATE_KEY`  | SSH 私钥               |

---

## 10. 监控与日志

### PM2 监控

```bash
pm2 monit            # 实时 CPU / 内存监控
pm2 logs shcw2026    # 实时日志
pm2 logs --json      # JSON 格式日志
```

### 健康检查脚本

```bash
cat > /home/deploy/healthcheck.sh << 'SCRIPT'
#!/bin/bash
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 https://你的域名.com/en)
if [ "$HTTP_CODE" != "200" ]; then
  echo "[$(date)] ALERT: Site returned HTTP $HTTP_CODE" >> /home/deploy/logs/healthcheck.log
  pm2 restart shcw2026
fi
SCRIPT

chmod +x /home/deploy/healthcheck.sh

# 每 5 分钟检查一次
(crontab -l 2>/dev/null; echo "*/5 * * * * /home/deploy/healthcheck.sh") | crontab -
```

### Docker 部署的日志

```bash
docker compose logs -f --tail 100 app   # 应用日志
docker compose logs -f --tail 50 db     # 数据库日志
```

---

## 11. 安全加固清单

### 部署前必做

- [ ] `NEXTAUTH_SECRET` 已更换为强随机值（`openssl rand -base64 32`）
- [ ] `DATABASE_URL` 使用强密码
- [ ] 默认管理员密码已更改（`admin@shcw2026.org / admin123`）
- [ ] 默认用户密码已更改或删除（`user@example.com / user12345`）
- [ ] `.env` 文件已添加到 `.gitignore`，不会被提交
- [ ] `ENABLE_DEV_AUTH_BYPASS` 未设置或为 `false`
- [ ] `NODE_ENV` 设为 `production`

### 服务器安全

- [ ] SSH 禁用密码登录，仅使用密钥认证
- [ ] 启用防火墙（UFW），仅开放 22、80、443 端口
- [ ] PostgreSQL 仅监听 127.0.0.1
- [ ] 定期更新系统和依赖：`sudo apt update && sudo apt upgrade`
- [ ] 设置自动安全更新：`sudo apt install unattended-upgrades`

### 防火墙配置

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw enable
```

---

## 12. 常见问题排查

| 问题                               | 原因                                      | 解决方案                                             |
| ---------------------------------- | ----------------------------------------- | ---------------------------------------------------- |
| 登录后立刻被登出                    | `NEXTAUTH_URL` 与实际域名不匹配           | 确保 `NEXTAUTH_URL` 设为 `https://你的域名.com`      |
| Cookie 不生效                      | HTTPS 未配置但 secure cookie 已启用       | 配置 SSL 证书或确认 Nginx 正确转发 `X-Forwarded-Proto` |
| 忘记密码返回 503                   | SMTP 配置错误                              | 检查 `SMTP_HOST`、`SMTP_PORT`、`SMTP_PASSWORD`       |
| `prisma migrate deploy` 失败      | 数据库连接失败                             | 检查 `DATABASE_URL`，确认 PostgreSQL 服务运行中       |
| 页面 500 错误                      | 环境变量缺失                               | 检查所有必填环境变量是否已设置                         |
| 静态资源 404                       | Nginx 未正确代理或 standalone 缺少文件     | 确认 `public/` 目录已复制到运行目录                   |
| 中文路由 `/zh/` 返回 404           | Middleware 未生效                           | 确认 `messages/` 目录存在且包含 `zh.json`、`en.json`  |
| Docker 构建失败 `prisma generate`  | `.dockerignore` 排除了 `prisma/` 目录      | 确保 `.dockerignore` 不包含 `prisma/`                 |
| Next.js `Image` 组件报错          | 不影响，已设置 `unoptimized: true`          | 无需处理，图片以原始格式提供                          |

---

## 快速部署步骤总结

```bash
# === Docker 一键部署 ===

# 1. 克隆并进入项目
git clone <仓库地址> && cd my-app

# 2. 配置环境变量
cp .env.example .env.production
nano .env.production

# 3. 构建并启动
docker compose --env-file .env.production up -d --build

# 4. 数据库迁移+种子
docker compose exec app npx prisma migrate deploy
docker compose exec app npx tsx prisma/seed.ts

# 5. 配置 Nginx + SSL（参考第 8 节）

# 6. 修改默认密码！
# 登录 https://你的域名.com/zh/auth/login
# 管理员：admin@shcw2026.org → 立即修改密码

# ✅ 完成
```
