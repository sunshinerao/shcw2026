# 部署与运行指南

## 1. 前置要求

- Node.js 20+
- npm 10+
- PostgreSQL 14+

## 2. 环境变量

参考模板：`.env.example`

### 必填

- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`

### 邮件相关

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `FROM_EMAIL`

### 应用配置

- `APP_NAME`
- `APP_URL`

### 开发辅助

- `ENABLE_DEV_AUTH_BYPASS`

说明：

- 生产环境必须显式配置 `NEXTAUTH_SECRET`
- 如果未配置 SMTP，忘记密码流程不能真正发信
- `APP_URL` 未配置时会回退到 `NEXTAUTH_URL`

## 3. 本地开发部署

### 安装依赖

```bash
npm install
```

### 初始化数据库

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

### 启动开发服务

```bash
npm run dev
```

## 4. 生产部署流程

### 构建

```bash
npm run lint
npm run build
```

### 启动

```bash
npm run start
```

如需自定义端口：

```bash
PORT=3017 npm run start
```

## 5. 数据库说明

ORM 使用 Prisma。

常用命令：

```bash
npm run db:generate
npm run db:migrate
npm run db:studio
npm run db:seed
```

接手开发时建议先确认：

- 当前数据库结构是否与 `prisma/schema.prisma` 一致
- migrations 是否已完整执行
- seed 数据是否符合本地联调需求

## 6. 默认种子数据

种子脚本会创建：

- 管理员账户
- 普通测试用户
- 赛道样例
- 活动样例
- 嘉宾样例
- 赞助商样例

默认测试账号：

- 管理员：`admin@shcw2026.org / admin123`
- 普通用户：`user@example.com / user12345`

部署到测试或生产环境前，应替换这些默认口令。

## 7. 上线前检查

### 应用层

- `npm run lint` 通过
- `npm run build` 通过
- 中英文页面可访问
- 登录、注册、忘记密码流程可用
- 后台页面可正常访问并完成 CRUD

### 配置层

- `DATABASE_URL` 指向正确库
- `NEXTAUTH_URL` 为正式域名
- `NEXTAUTH_SECRET` 为安全随机值
- SMTP 配置可用

### 数据层

- 管理员账户已重新初始化为安全密码
- 非测试环境无开发演示账号或已替换口令

## 8. 验证建议

### 自动化检查

```bash
npm run test
npm run lint
npm run build
```

### live check

当前仓库包含可直接运行的 live 检查脚本：

- `tests/live-auth-check.ts`
- `tests/live-admin-api-check.ts`
- `tests/live-verifier-points-check.ts`

建议方式：

1. 先启动生产模式服务
2. 设置 `LIVE_TEST_BASE_URL`
3. 运行 live check 脚本

## 9. 常见问题

### 忘记密码接口返回 503

原因通常是 SMTP 未配置或发信失败。

### 生产环境登录失败

优先检查：

- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- Cookie 域和 HTTPS 设置

### 本地 API 需要模拟登录用户

仅开发环境可考虑使用 `ENABLE_DEV_AUTH_BYPASS=true` 配合 `x-dev-user-id`，但不要把这种方式写入正式业务流程。