# 权限自动化测试用例（可执行）

## 1. 目标

本文件给出可自动化执行的权限测试用例，覆盖：
- `lib/permissions.ts` 的角色与 staffPermissions 判定逻辑
- 后台 section 访问控制与默认落地页逻辑

对应自动化测试文件：
- `tests/permissions-rbac.test.ts`
- `tests/api-permissions-policy.test.ts`

## 2. 执行命令

在 `my-app` 目录执行：

```bash
npm test
```

仅执行权限测试：

```bash
node --import tsx --test tests/permissions-rbac.test.ts
```

仅执行 API 权限策略回归：

```bash
node --import tsx --test tests/api-permissions-policy.test.ts
```

## 3. 用例清单（与自动化测试一一对应）

| 用例ID | 场景 | 预期 | 自动化测试名称 |
|---|---|---|---|
| RBAC-001 | `parseStaffPermissions` 输入混合合法/非法值 | 仅保留合法 key | `parseStaffPermissions keeps only valid permission keys` |
| RBAC-002 | 后台入口角色识别 | ADMIN / EVENT_MANAGER / SPECIAL_PASS_MANAGER / STAFF 为 true；无 staffPermissions 的 ATTENDEE 为 false | `isAdminConsoleRole follows role and staffPermissions rules` |
| RBAC-003 | 非后台角色附加 staffPermissions | ATTENDEE + `news` 可进入后台（true） | `isAdminConsoleRole follows role and staffPermissions rules` |
| RBAC-004 | `canManageEvents` | ADMIN、EVENT_MANAGER 为 true；STAFF 为 false | `resource management helpers grant expected permissions` |
| RBAC-005 | `canManageSpecialPassApplications` | ADMIN、SPECIAL_PASS_MANAGER 为 true；EVENT_MANAGER 为 false | `resource management helpers grant expected permissions` |
| RBAC-006 | `canManageTracks` | 仅 ADMIN 为 true | `resource management helpers grant expected permissions` |
| RBAC-007 | staffPermissions 细粒度授权 | STAFF + 对应 key 可管理 speakers/news/insights/posters/institutions/messages/faq | `resource management helpers grant expected permissions` |
| RBAC-008 | Admin section 可见性（角色） | EVENT_MANAGER 仅可见 events/invitations，不可见 users | `canAccessAdminSection enforces dashboard and section visibility` |
| RBAC-009 | Admin section 可见性（STAFF） | STAFF 仅可见授权 section；有权限时可见 dashboard | `canAccessAdminSection enforces dashboard and section visibility` |
| RBAC-010 | 非后台角色的 section 可见性 | 非后台角色可因 staffPermissions 访问 dashboard 与授权 section | `canAccessAdminSection enforces dashboard and section visibility` |
| RBAC-011 | 后台默认落地页 | ADMIN->`/admin`，EVENT_MANAGER->`/admin/events`，SPECIAL_PASS_MANAGER->`/admin/special-pass` | `getAdminLandingPath returns role-aware default path` |
| RBAC-012 | staffPermissions 驱动默认落地页 | STAFF/非后台角色按首个授权模块落地（faq/news） | `getAdminLandingPath returns role-aware default path` |
| RBAC-013 | Admin only section 标记 | `users`、`apiKeys` 为 true；`events`、`specialPass` 为 false | `isAdminOnlySection marks high-privilege admin sections` |

## 3.1 API 权限策略回归（静态断言）

| 用例ID | 场景 | 预期 | 自动化测试名称 |
|---|---|---|---|
| API-RBAC-001 | 活动列表未发布可见范围 | `canViewAllEvents` 包含 EVENT_MANAGER | `events list keeps EVENT_MANAGER in unpublished visibility set` |
| API-RBAC-002 | 活动编辑范围 | EVENT_MANAGER 可编辑未发布活动 | `events update allows EVENT_MANAGER to edit unpublished events` |
| API-RBAC-003 | 活动删除范围 | EVENT_MANAGER 删除仍限本人负责活动 | `events delete remains assigned-only for EVENT_MANAGER` |
| API-RBAC-004 | FAQ 公开读取保护 | 非管理者仅可读已发布 FAQ | `faq GET keeps non-manager published-only filter` |
| API-RBAC-005 | 用户敏感字段保护 | 用户详情接口不返回 `passCode` | `user detail API does not expose passCode field` |
| API-RBAC-006 | 海报模板权限守卫 | GET/POST 均调用 `requirePosterAdmin` | `poster templates API enforces requirePosterAdmin in GET and POST` |
| API-RBAC-007 | 机构类型白名单 | v1 institutions PATCH 含 `VALID_ORG_TYPES` 校验 | `v1 institutions detail route keeps orgType whitelist` |
| API-RBAC-008 | v1 scope 路由映射 | 各资源路由保留 `verifyApiKey` 对应 scope | `v1 API routes keep verifyApiKey scope mapping` |

## 4. CI 建议

建议在 CI 中将下列步骤作为最小权限回归门槛：

1. `npm test`
2. `npm run build`

如后续对 `lib/permissions.ts`、`app/[locale]/admin/**`、`components/admin/**` 做权限改动，应强制跑上述两项。

## 5. 后续可扩展项

当前用例以“权限函数层”为主，建议后续增加：
- API 层集成测试（Mock Session / Mock DB）验证 401/403 与数据范围过滤
- v1 API key scope 集成测试（权限不足、IP 白名单拒绝）
- 关键高风险接口（events、users、checkin）的端到端权限回归
