# API 全面检查与 V2 发布报告

> 日期：2026-04-12

## 1. 检查范围

本次检查覆盖：
- `app/api/**` 全部路由
- OpenClaw 机器接口 `app/api/v1/**`
- 新增版本化接口 `app/api/v2/**`
- 文档同步：`docs/API_SPEC.md`、`docs/OPENCLAW_API.md`、`docs/OPENCLAW_API_V2.md`

## 2. 总体结果

- API 路由文件总数：`112`
- V1 路由数：`15`
- V2 路由数：`15`
- 结论：V2 已覆盖全部 V1 机器接口资源。

## 3. 鉴权机制分布（代码扫描）

- Session 鉴权（`getServerSession`）：`57` 个路由文件
- API Key 鉴权（`verifyApiKey`）：`15` 个路由文件
- Poster 专用鉴权（`requirePosterAdmin`）：`9` 个路由文件

说明：
- 以上统计是按“路由文件包含鉴权调用关键字”计数。
- 某些路由通过封装函数实现权限（如 `requireInsightAdmin`），不一定直接出现关键字。

## 4. V2 实施方案

V2 采用“版本化兼容层”方案：
- 新增 `app/api/v2/**` 与 `app/api/v1/**` 同结构路由。
- 每个 V2 路由通过 `export * from "@/app/api/v1/.../route"` 复用现有逻辑。

当前实现（已增强）：
- V2 路由包装 V1 处理器并统一注入 `X-API-Version: v2` 响应头（`lib/api-versioning.ts`）。
- V2 对 JSON 错误响应统一补齐 `code` 字段（仅当原响应缺失 `code` 时注入，保持兼容）。

优点：
- 零行为差异，迁移风险最低。
- 能立即提供独立版本前缀，满足客户端升级管理。
- 后续可以在不影响 V1 的前提下逐步演进 V2 内部实现。

## 5. V2 覆盖清单

- `/api/v2/events`
- `/api/v2/events/[id]`
- `/api/v2/events/[id]/agenda`
- `/api/v2/events/[id]/agenda/[aid]`
- `/api/v2/speakers`
- `/api/v2/speakers/[id]`
- `/api/v2/news`
- `/api/v2/news/[id]`
- `/api/v2/partners`
- `/api/v2/partners/[id]`
- `/api/v2/insights`
- `/api/v2/insights/[id]`
- `/api/v2/institutions`
- `/api/v2/institutions/[id]`
- `/api/v2/users/reset-password`

## 6. 文档更新结果

已更新：
- `docs/OPENCLAW_API.md`：增加 V1 维护模式与 V2 指引
- `docs/OPENCLAW_API_V2.md`：新增 V2 文档与迁移说明
- `docs/API_SPEC.md`：新增 V2 版本化说明与文档入口

## 7. 后续建议（V2 真升级阶段）

当前 V2 为兼容层。建议下一阶段按资源逐步落地“真实 V2 增量”：

1. 统一错误码结构（增加 `code` 字段）
2. 统一分页结构（固定 `pagination` 字段）
3. 增加幂等与版本头（如 `X-API-Version: 2`）
4. 引入 OpenAPI 3.1 规范文件并自动生成 SDK
5. 按资源分批下线 V1（发布 deprecation 时间表）
