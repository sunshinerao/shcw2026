# 研发交接说明

> 最后更新: 2026-03-23

## 1. 当前交付状态

当前项目已经完成以下核心交付：

- 中英文双语路由与页面渲染
- NextAuth 认证体系
- 用户注册、登录、忘记密码、重置密码
- 用户中心基础能力（含真实二维码、气候护照、积分）
- 后台活动、嘉宾、合作伙伴、用户管理
- **现场验码系统**（二维码扫描、签到、积分发放）
- **气候护照系统**（唯一身份标识）
- **积分系统**（活动签到奖励、后台管理）
- Prisma 数据模型与基础种子数据
- 核心后台 API 的权限控制与本地化错误返回

## 2. 最近一轮已确认事项

最近一轮修正与验证完成了这些关键点：

- 中英文切换链路稳定
- 后台 `users` 管理改为真实 API 驱动
- 后台 `events` 管理改为真实 API 驱动
- `users` 与 `events` API 已本地化并接入权限控制
- `qrcode` / `checkin` / `user/registrations` / `users/[id]/points` / `users/[id]/role` 已统一接入 API 本地化消息体系
- **二维码生成与验码系统已完成**
- **积分系统已完成**
- **气候护照系统已完成**
- **VERIFIER 验证人员角色已添加**
- 生产构建通过
- live admin CRUD 检查通过
- shell 初始化噪声已清理，不影响本地命令执行

## 3. 当前测试资产

### 自动化测试

- `tests/auth-config.test.ts`
- `tests/mailer.test.ts`
- `tests/users-i18n.test.ts`
- `tests/utils.test.ts`

### live 检查

- `tests/live-auth-check.ts`
- `tests/live-admin-api-check.ts`
- `tests/live-verifier-points-check.ts`

### 已验证结论

- `npm run lint` 可通过
- `npm run build` 可通过
- 管理员登录可用
- speakers / sponsors / users / events 的后台 CRUD 已实际跑通
- 二维码生成、护照验码、活动签到、积分查询、手动积分调整、验证人员角色切换已通过 `tests/live-verifier-points-check.ts` 实际跑通

### 2026-03-23 最新 live 结果

- 护照二维码生成成功
- 活动通行证二维码生成成功
- 接口本地化清理后，verifier 与 admin live 回归再次通过
- 护照二维码验证成功
- 活动二维码签到成功
- `ceremony` 活动实测发放 20 分，与当前积分规则一致
- 积分查询接口返回当前积分、已参加活动数、积分交易记录
- 管理员可将测试用户切换为 `VERIFIER`
- 管理员手动扣减积分成功

## 4. 接手建议

建议新接手研发按以下顺序进入项目：

1. 阅读 `README.md`
2. 阅读 `docs/ARCHITECTURE.md`
3. 配置 `.env` 并执行数据库初始化
4. 跑起 `npm run dev`
5. 使用种子账号进入前后台进行人工走查
6. 运行 `npm run lint`、`npm run build`、`npm run test`
7. 如需改后台资源，先对照 `docs/API_SPEC.md`

## 5. 当前已知边界

以下内容尚未作为正式完工范围：

- 支付与票务闭环
- News 后台发布管理
- ~~现场签到运营台完整 UI~~ （基础版本已完成）
- 统一 OpenAPI 文档
- 审计日志和监控告警体系

## 6. 对后续研发最重要的注意点

### 国际化不是只有静态文案

数据库实体中存在双语字段，做内容修改时要同时关注：

- `messages/*.json`
- Prisma 数据记录中的 `nameEn/titleEn/descriptionEn/bioEn` 等字段

### 管理后台不是纯 mock 页面

当前 `admin/users` 与 `admin/events` 已经切换为真实 API 驱动，改动时要同步考虑：

- 页面 UI
- API Route
- Prisma 数据结构
- 中英文本地化消息

### 忘记密码依赖 SMTP

如果环境缺少 SMTP，接口会返回服务不可用，这属于预期行为，不是纯前端 bug。

### 二维码有效期

活动通行证二维码有效期为 **5分钟**，过期后需刷新。当前 live 验证已覆盖活动二维码生成与验码成功链路。

### 积分计算规则

活动签到积分计算：
- ceremony: 20分
- forum: 15分
- conference: 15分
- workshop: 10分
- networking: 5分

## 7. 新功能快速参考

### 验证人员账号

种子数据包含验证人员测试账号：
- 邮箱: `verifier@shcw2026.org`
- 密码: `verifier123`

### 验证页面访问

登录验证人员账号后访问：`/{locale}/verifier`

### 设置验证人员

管理员可在后台用户管理中，通过下拉菜单将普通用户设置为验证人员。

### 查看积分

- 用户端：通行证页面 (`/dashboard/pass`)
- 管理端：用户详情 → 查看积分

## 8. 历史文档说明

以下文件已保留，但只作为历史阶段材料，不再代表当前实现：

- `DEVELOPMENT_REPORT.md`
- `TEST_PLAN.md`
- `TEST_REPORT.md`

如需更新正式交接文档，请以 `README.md` 和 `docs/*.md` 为主，不要继续覆盖历史报告。
