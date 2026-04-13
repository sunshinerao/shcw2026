# SHCW2026 权限管理说明

## 1. 文档目的与覆盖范围

本文件用于梳理当前代码中的权限体系，作为开发、测试、审计的统一依据。

覆盖范围：
- Session 角色权限与 staffPermissions：`lib/permissions.ts`
- 登录态注入与刷新：`lib/auth.ts`
- 管理后台入口与菜单可见性：`app/[locale]/admin/layout.tsx`、`components/admin/admin-layout-shell.tsx`、`components/admin/admin-section-guard.tsx`
- 业务 API 权限：`app/api/**`
- OpenClaw API Key 权限：`lib/openclaw-auth.ts` 与 `app/api/v1/**`

---

## 2. 权限模型总览

### 2.1 用户角色（UserRole）

定义于 `prisma/schema.prisma`：
- VISITOR
- ATTENDEE
- ORGANIZATION
- SPONSOR
- SPEAKER
- MEDIA
- ADMIN
- EVENT_MANAGER
- SPECIAL_PASS_MANAGER
- STAFF
- VERIFIER

### 2.2 两套并行权限机制

1) Session 角色权限（后台与业务管理）
- 通过 `getServerSession(authOptions)` 获取登录态
- 核心判定函数在 `lib/permissions.ts`

2) API Key 权限（OpenClaw 对接）
- 通过 `verifyApiKey(req, requiredPermission)`
- 校验维度：密钥有效性、IP 白名单、scope 权限
- scope 列表见 `lib/openclaw-auth.ts` 的 `ALL_PERMISSIONS`

### 2.3 staffPermissions（细粒度模块授权）

`staffPermissions` 存储在 `User.staffPermissions`（JSON 字符串）中，解析函数为 `parseStaffPermissions`。

当前支持：
- speakers
- news
- insights
- posters
- institutions
- messages
- faq

可用于：
- STAFF 角色的细分授权
- 非 STAFF 角色的“附加后台能力”（`isAdminConsoleRole` 与 `canAccessAdminSection` 支持）

---

## 3. 管理后台入口权限

### 3.1 后台入口判定

后台布局 `app/[locale]/admin/layout.tsx` 使用 `isAdminConsoleRole(role, staffPermissions)`：
- 允许进入后台：ADMIN / EVENT_MANAGER / SPECIAL_PASS_MANAGER / STAFF / 任意拥有 staffPermissions 的用户
- 不满足则重定向到站点首页

### 3.2 后台导航可见性

`components/admin/admin-layout-shell.tsx` 通过 `canAccessAdminSection(role, section, staffPermissions)` 控制菜单项显示。

基础规则：
- ADMIN：可见全部 section
- EVENT_MANAGER：默认可见 events、invitations；如存在 staffPermissions，可额外可见对应 section
- SPECIAL_PASS_MANAGER：默认可见 specialPass；如存在 staffPermissions，可额外可见对应 section
- STAFF：仅可见 staffPermissions 对应 section（有任意权限时可见 dashboard）
- 其他角色：如配置了 staffPermissions，也可见对应 section（有任意权限时可见 dashboard）

---

## 4. 角色能力矩阵（业务视角）

说明：以下为“当前代码已实现”的实际行为，不是理想模型。

| 角色 | 后台入口 | 核心管理能力 |
|---|---|---|
| ADMIN | 是 | 全部后台模块、所有管理 API、API Key 管理、系统设置 |
| EVENT_MANAGER | 是 | 活动与邀请函管理；可查看全部未发布活动并编辑未发布活动；删除仅限自己负责活动 |
| SPECIAL_PASS_MANAGER | 是 | 特别通行证管理（审核、导出等） |
| STAFF | 取决于 staffPermissions（通常是） | 取决于 staffPermissions；另有部分接口使用 ADMIN/STAFF 直接放行 |
| VERIFIER | 否（默认） | 签到验码与签到记录查询（与 ADMIN/STAFF 同级） |
| ATTENDEE/ORGANIZATION/SPONSOR/SPEAKER/MEDIA/VISITOR | 否（默认） | 前台与个人接口；无后台管理权限 |

---

## 5. staffPermissions 与模块映射

| staffPermissions key | 对应判定函数 | 典型接口 |
|---|---|---|
| speakers | `canManageSpeakers` | `app/api/speakers/**` |
| news | `canManageNews` | `app/api/news/**`（注意 GET/POST 差异，见第 7 节） |
| insights | `canManageInsights` | `app/api/insights/**` + `lib/insight-auth.ts` |
| posters | `canManagePosters` | `app/api/posters/**` + `lib/poster-auth.ts` |
| institutions | `canManageInstitutions` | `app/api/institutions/**` |
| messages | `canManageMessages` | `app/api/contact/admin/route.ts` |
| faq | `canManageFaq` | `app/api/faqs/**` |

---

## 6. 重点业务域权限说明

## 6.1 活动与议程

相关：
- `app/api/events/route.ts`
- `app/api/events/[id]/route.ts`
- `app/api/events/[id]/agenda/**`

规则：
- 列表 GET：
  - ADMIN / STAFF / EVENT_MANAGER 可查看未发布活动
  - 其他用户只看已发布
- 详情 GET：
  - ADMIN / STAFF / EVENT_MANAGER 可查看未发布
  - 其他用户仅已发布
- 新建 POST：ADMIN / EVENT_MANAGER
- 更新 PUT：
  - ADMIN 可管理全部
  - EVENT_MANAGER 可管理“自己负责的活动”或“任意未发布活动”
- 删除 DELETE：
  - ADMIN 可删除全部
  - EVENT_MANAGER 仅可删除自己负责活动

## 6.2 赛道（Tracks）

相关：
- `app/api/tracks/route.ts`
- `app/api/tracks/[id]/route.ts`

规则：
- GET：公开可访问；非管理员仅统计已发布活动关联数
- POST/PUT/DELETE：`canManageTracks`，即 ADMIN only

## 6.3 邀请函

相关：`app/api/invitations/**`

规则：
- GET：
  - ADMIN：可看全部
  - EVENT_MANAGER：可看本人申请 + 自己管理活动下的邀请函申请
  - 其他登录用户：仅可看本人
- POST：任意登录用户可创建
- 其余编辑/渲染接口按 `canManageEvents`（ADMIN / EVENT_MANAGER）并结合归属约束

## 6.4 特别通行证

相关：`app/api/admin/special-pass/**`

规则：
- 使用 `canManageSpecialPassApplications`
- ADMIN / SPECIAL_PASS_MANAGER 可访问

## 6.5 嘉宾、新闻、机构、知识成果、海报引擎、FAQ、留言

- 嘉宾：`canManageSpeakers`（ADMIN 或 staffPermissions 包含 speakers）
- 新闻：写操作使用 `canManageNews`；列表读取存在 ADMIN 特例（见第 7 节）
- 机构：
  - 管理操作使用 `canManageInstitutions`
  - 列表 GET 允许 `isAdminConsoleRole`（后台下拉场景），但关系数据仅对可管理者返回
- 知识成果（Insights）：`requireInsightAdmin` -> `canManageInsights`
- 海报引擎：`requirePosterAdmin` -> `canManagePosters`
- FAQ：`canManageFaq`；公开 GET 默认仅返回已发布
- 留言后台：`canManageMessages`

## 6.6 用户与积分

相关：
- `app/api/users/route.ts`
- `app/api/users/[id]/route.ts`
- `app/api/users/[id]/points/route.ts`

规则：
- 用户列表 GET：ADMIN / STAFF
- 用户创建 POST：ADMIN only
- 用户详情/编辑/删除：采用单独 `checkPermission` 逻辑（ADMIN 全量、STAFF 有限制、用户本人可访问本人）
- 积分：
  - GET：本人或 ADMIN/STAFF
  - POST 调整积分：ADMIN/STAFF

## 6.7 签到（Check-in）

相关：`app/api/checkin/route.ts`

规则：
- 允许角色：ADMIN / STAFF / VERIFIER
- EVENT_MANAGER 在指定 eventId 且为该活动 manager 时可执行相关签到能力

## 6.8 商务信息（Sponsors / Cooperation Plans）

相关：
- `app/api/sponsors/**`
- `app/api/cooperation-plans/**`

规则：
- GET：公开读取（前台可用）
- 写操作：ADMIN / STAFF（直接 role 判断）

## 6.9 系统设置与 API Key 管理

相关：
- `app/api/admin/settings/route.ts`
- `app/api/admin/api-keys/**`

规则：
- ADMIN only

---

## 7. 当前实现中的“差异与例外”

以下是代码中已存在且需要团队知悉的规则差异：

1) 新闻模块读写判定不完全一致
- `app/api/news/route.ts` 的 GET 将“查看未发布新闻”限定为 ADMIN
- 但 POST 使用 `canManageNews`，因此具备 news staffPermissions 的 STAFF 可以写

2) 机构列表 GET 与管理权限分离
- `app/api/institutions/route.ts` 的 GET 对 `isAdminConsoleRole` 开放
- 但完整关系字段需要 `canManageInstitutions`

3) 活动管理中 EVENT_MANAGER 的细分规则
- 可编辑任意未发布活动
- 删除仍仅限本人负责活动

---

## 8. OpenClaw v1 API Key 权限映射

鉴权实现：`lib/openclaw-auth.ts`

已实现 scope：
- events:read / events:write
- speakers:read / speakers:write
- news:read / news:write
- insights:read / insights:write
- partners:read / partners:write
- institutions:read / institutions:write
- users:write

路由映射（按资源）：
- events：`app/api/v1/events/**`
- speakers：`app/api/v1/speakers/**`
- news：`app/api/v1/news/**`
- insights：`app/api/v1/insights/**`
- partners：`app/api/v1/partners/**`
- institutions：`app/api/v1/institutions/**`
- users:write：`app/api/v1/users/reset-password/route.ts`

附加校验：
- API Key 必须 active
- 若配置 IP 白名单，来源 IP 必须命中
- 通过后会记录 lastUsedAt 与 usageCount

---

## 9. 权限变更建议流程（团队约定）

建议后续所有权限变更按以下顺序提交，防止前后端不一致：

1) 更新 `lib/permissions.ts`（角色/section/helper）
2) 更新后台入口与菜单可见性（`admin/layout`、`admin-layout-shell`、`admin-section-guard`）
3) 更新对应 API 路由判定
4) 回归验证：
- 目标角色可访问
- 非目标角色被拒绝（401/403）
- 数据范围过滤正确（尤其 unpublished / owner-scoped 场景）

---

## 10. 参考文件索引

- `prisma/schema.prisma`
- `lib/permissions.ts`
- `lib/auth.ts`
- `lib/openclaw-auth.ts`
- `lib/insight-auth.ts`
- `lib/poster-auth.ts`
- `app/[locale]/admin/layout.tsx`
- `components/admin/admin-layout-shell.tsx`
- `components/admin/admin-section-guard.tsx`
- `app/api/events/route.ts`
- `app/api/events/[id]/route.ts`
- `app/api/invitations/route.ts`
- `app/api/admin/special-pass/route.ts`
- `app/api/users/route.ts`
- `app/api/users/[id]/route.ts`
- `app/api/users/[id]/points/route.ts`
- `app/api/checkin/route.ts`
- `app/api/speakers/route.ts`
- `app/api/news/route.ts`
- `app/api/insights/route.ts`
- `app/api/institutions/route.ts`
- `app/api/faqs/route.ts`
- `app/api/contact/admin/route.ts`
- `app/api/sponsors/route.ts`
- `app/api/cooperation-plans/route.ts`
- `app/api/admin/settings/route.ts`
- `app/api/admin/api-keys/route.ts`
- `app/api/v1/**`
