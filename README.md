# 上海气候周 2026 网站

> 最后更新: 2026-03-23

本目录是当前正式运行的 Web 应用代码库，基于 Next.js App Router、Prisma、NextAuth 和 next-intl 构建。

这份 README 面向研发交接，目标是让新接手同学可以在最短时间内完成以下事情：

- 理解系统边界和模块组成
- 启动本地开发环境
- 完成数据库初始化和种子数据导入
- 找到关键业务入口、页面、API 和测试脚本
- 理解当前已完成能力、未覆盖边界和上线要求

## 1. 当前项目范围

当前系统包括以下主要模块：

- **官网前台**：首页、活动、嘉宾、合作伙伴、新闻、关于、联系、FAQ、隐私、条款
- **用户认证**：注册（自动生成气候护照）、登录、忘记密码、重置密码
- **个人中心**：资料、密码、通知、通行证（含真实二维码）、我的日程、积分、气候护照
- **后台管理**：活动、嘉宾、合作伙伴、用户管理（含积分管理、角色设置）
- **现场验证**：二维码扫描验码、签到、积分发放
- **API 层**：认证、用户资料、密码、找回密码、后台 CRUD、二维码、验码、积分
- **数据层**：Prisma + PostgreSQL
- **国际化**：中文 / 英文双语路由与消息

## 2. 快速开始

### 环境要求

- Node.js 20+
- npm 10+
- PostgreSQL 14+

### 安装依赖

```bash
npm install
```

### 配置环境变量

复制环境变量模板并按本地环境填写：

```bash
cp .env.example .env
```

至少需要配置：

- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`

如需测试邮件找回密码功能，还需要配置：

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `FROM_EMAIL`

### 初始化数据库

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

补充 live 验证脚本：

- `node --import tsx tests/live-admin-api-check.ts`
- `node --import tsx tests/live-verifier-points-check.ts`

### 启动开发环境

```bash
npm run dev
```

默认访问地址：

- 中文首页：`http://localhost:3000/zh`
- 英文首页：`http://localhost:3000/en`

### 生产构建与启动

```bash
npm run build
npm run start
```

## 3. 常用命令

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test
npm run db:generate
npm run db:migrate
npm run db:studio
npm run db:seed
```

## 3.1 当前验证状态

- `npm run lint` 已通过，当前为零 warning
- `npm run build` 已通过
- `tests/live-admin-api-check.ts` 已通过
- `tests/live-verifier-points-check.ts` 已通过
- verifier / QR / points / role 相关接口已统一接入 API 本地化消息体系

## 4. 文档索引

以下文档是当前正式交接文档：

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)：系统架构、模块边界、认证、国际化、数据模型
- [docs/FEATURES.md](docs/FEATURES.md)：页面地图、功能范围、角色权限、关键业务流
- [docs/API_SPEC.md](docs/API_SPEC.md)：当前 API 清单、权限要求、关键请求与响应约束
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)：环境变量、数据库初始化、构建发布、运行检查
- [docs/HANDOFF.md](docs/HANDOFF.md)：当前交付状态、测试结果、接手建议、已知后续项

以下文档保留为历史文档，仅用于回溯，不再作为当前实现事实源：

- [DEVELOPMENT_REPORT.md](DEVELOPMENT_REPORT.md)
- [TEST_PLAN.md](TEST_PLAN.md)
- [TEST_REPORT.md](TEST_REPORT.md)

## 5. 项目结构概览

```text
my-app/
├── app/
│   ├── [locale]/                # 所有前台、认证、个人中心、后台页面
│   │   ├── verifier/            # 现场验码页面（VERIFIER角色）
│   │   └── dashboard/
│   │       ├── pass/page.tsx    # 通行证（含二维码、气候护照）
│   │       └── schedule/page.tsx # 我的日程（已报名/收藏）
│   └── api/                     # App Router API
│       ├── qrcode/              # 二维码生成
│       ├── checkin/             # 验码签到
│       └── user/
│           └── registrations/   # 用户活动记录
├── components/                  # 通用 UI 与业务组件
├── i18n/                        # next-intl 路由与请求配置
├── lib/                         # 认证、Prisma、工具函数、数据访问辅助
├── messages/                    # 中英文翻译消息
├── prisma/                      # schema、migrations、seed
├── public/                      # 静态资源
├── tests/                       # 单元测试与 live check 脚本
└── docs/                        # 正式交接文档
```

## 6. 本地种子账号

执行 `npm run db:seed` 后可得到默认测试账号：

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 管理员 | `admin@shcw2026.org` | `admin123` |
| 普通用户 | `user@example.com` | `user12345` |
| 验证人员 | `verifier@shcw2026.org` | `verifier123` |

仅用于本地开发和测试，不得直接沿用到生产环境。

### 验证人员账号说明

- 用于现场扫码验证用户身份
- 登录后可访问 `/zh/verifier` 或 `/en/verifier`
- 可扫描二维码进行签到验证
- 自动发放活动积分

## 7. 当前技术栈

- Next.js 14 App Router
- React 18
- TypeScript
- Prisma + PostgreSQL
- NextAuth Credentials
- next-intl
- Radix UI + Tailwind CSS
- Framer Motion
- html5-qrcode（二维码扫描）
- qrcode（二维码生成）

## 8. 首次接手建议顺序

1. 先读 [docs/HANDOFF.md](docs/HANDOFF.md)
2. 再读 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
3. 然后按 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) 跑起本地环境
4. 最后结合 [docs/API_SPEC.md](docs/API_SPEC.md) 和 [docs/FEATURES.md](docs/FEATURES.md) 开始改动

## 9. 新功能快速测试

### 测试二维码生成

1. 以普通用户登录
2. 访问 `/zh/dashboard/pass`
3. 查看气候护照二维码和活动通行证二维码

### 测试验码流程

1. 以验证人员账号登录 (`verifier@shcw2026.org`)
2. 访问 `/zh/verifier`
3. 使用另一设备以普通用户登录并展示二维码
4. 扫码验证并完成签到

### 测试积分系统

1. 管理员登录后台 `/zh/admin`
2. 进入用户管理
3. 点击用户下拉菜单 → 查看积分
4. 可手动调整积分并查看历史记录

### 当前回归结论

- 中英文页面切换正常
- API 错误消息可按 locale 返回
- 后台 CRUD 主链路稳定
- 护照二维码、活动二维码、验码签到、积分发放链路稳定
