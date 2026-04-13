# API 说明

> 最后更新: 2026-04-12

## V2 版本化说明

- OpenClaw Agent API 已提供 `v2` 路径，推荐新接入使用 `/api/v2/**`。
- 目前 `v2` 与 `v1` 行为一致，便于平滑迁移与后续无破坏迭代。
- `v2` 响应统一携带 `X-API-Version: v2` 响应头，便于版本审计与流量观测。
- `v2` JSON 错误响应统一包含 `code` 字段（缺失时自动补齐）。
- 详细文档：
  - `docs/OPENCLAW_API_V2.md`（推荐）
  - `docs/OPENCLAW_API.md`（v1，维护模式）
  - `docs/openapi.v2.json`（OpenAPI 3.1 机器可读规范）
  - `docs/OPENAPI_V2_USAGE.md`（SDK 与工具接入说明）

## 1. 约定

### 返回格式

大部分接口遵循以下结构：

```json
{
  "success": true,
  "message": "optional",
  "data": {}
}
```

失败时通常返回：

```json
{
  "success": false,
  "error": "localized message"
}
```

### 认证方式

- 前台用户接口：依赖 NextAuth Session
- 后台管理接口：依赖 NextAuth Session，并按角色做权限判断
- 部分开发调试接口路径会走 `verifyAuthDev`，仅本地开发可使用 header 绕过

### 语言参数

接口错误消息支持中英文。locale 可来源于：

- URL / Cookie
- 请求体中的 `locale`
- 查询参数中的 `locale`

## 2. 认证与账户接口

### `POST /api/register`

用途：用户注册。

认证：无需登录。

关键字段：

- `name`
- `email`
- `password`
- `phone`
- `title`
- `role`
- `organization`
- `locale`

规则：

- `name/email/password` 必填
- 邮箱格式校验
- 密码长度至少 8 位
- 自动生成唯一 `passCode` 和 `climatePassportId`
- ATTENDEE 注册后默认激活，其他角色默认待审核

### `GET|POST /api/auth/[...nextauth]`

用途：NextAuth 标准认证入口。

说明：项目使用 Credentials 登录。

### `POST /api/forgot-password`

用途：发起找回密码。

认证：无需登录。

关键字段：

- `email`
- `locale`

规则：

- 若邮箱不存在，也返回成功提示，避免暴露用户存在性
- 若 SMTP 未配置或发送失败，返回 `503`

### `GET /api/reset-password?token=...`

用途：校验密码重置链接是否有效。

### `POST /api/reset-password`

用途：提交新密码。

关键字段：

- `token`
- `password`
- `locale`

规则：

- token 必须有效且未过期
- 新密码至少 8 位

## 3. 用户中心接口

### `GET /api/user/profile`

用途：获取当前登录用户资料。

认证：已登录用户。

返回内容包括：

- 用户基本信息
- 机构信息
- 报名数、签到数统计
- 积分 (`points`)
- 气候护照ID (`climatePassportId`)

### `PUT /api/user/profile`

用途：更新当前登录用户资料。

可更新字段：

- `name`
- `phone`
- `title`
- `bio`
- `avatar`

### `PUT /api/user/password`

用途：修改当前登录用户密码。

关键字段：

- `oldPassword`
- `newPassword`
- `locale`

规则：

- 必须验证旧密码
- 新旧密码不能相同
- 新密码长度至少 8 位

### `GET /api/user/registrations`

用途：获取当前用户的报名和收藏活动。

认证：已登录用户。

返回内容包括：

- `registrations`: 已报名的活动列表（含验码状态、获得积分）
- `wishlist`: 收藏的活动列表

### `POST /api/user/registrations`

用途：添加/取消收藏活动。

认证：已登录用户。

请求体：

- `action`: `"add_wishlist"` | `"remove_wishlist"`
- `eventId`: 活动ID

## 4. 二维码与验码接口

### `GET /api/qrcode`

用途：生成用户通行证二维码。

认证：已登录用户。

查询参数：

- `type`: `"passport"` | `"event"` - 二维码类型
- `eventId`: 活动ID（当 type=event 时必需）

返回：

- `qrCode`: SVG 格式的二维码图片
- `qrData`: 二维码原始数据（调试用）

二维码格式：

- 护照二维码: `SCW2026://PASSPORT/{userId}/{passCode}`
- 活动二维码: `SCW2026://EVENT/{eventId}/{userId}/{registrationId}/{timestamp}`

说明：活动二维码有效期为 5 分钟。

### `POST /api/checkin`

用途：二维码验证和签到。

认证：`ADMIN`、`STAFF` 或 `VERIFIER` 角色。

请求体：

- `qrData`: 扫描二维码得到的数据

返回：

- 用户信息
- 活动信息（如果是活动二维码）
- 验码状态（是否已入场）
- 发放的积分

规则：

- 验证二维码有效期（5分钟）
- 自动发放活动积分
- 记录验码历史

### `GET /api/checkin`

用途：获取验码记录。

认证：`ADMIN`、`STAFF` 或 `VERIFIER` 角色。

查询参数：

- `eventId`: 可选，筛选特定活动
- `limit`: 返回记录数量，默认 50

## 5. 后台用户管理接口

### `GET /api/users`

用途：分页查询用户列表。

认证：`ADMIN` 或 `STAFF`。

支持查询参数：

- `page`
- `pageSize`
- `search`
- `role`
- `status`
- `sortBy`
- `sortOrder`

返回内容包括：

- 用户基本资料
- 机构信息
- 报名记录
- 积分 (`points`)
- 气候护照ID (`climatePassportId`)
- 计数统计
- 分页信息

### `POST /api/users`

用途：创建用户。

认证：仅 `ADMIN`。

关键字段：

- `name`
- `email`
- `password`
- `phone`
- `title`
- `bio`
- `role`
- `status`
- `avatar`
- `organization`
- `locale`

### `GET /api/users/[id]`

用途：获取单个用户详情。

认证：

- `ADMIN`
- `STAFF`
- 或用户本人

### `PUT /api/users/[id]`

用途：更新单个用户。

权限规则：

- `ADMIN` 可完整更新
- `STAFF` 不能修改管理员账户
- 普通用户只能修改自己的非敏感字段
- 密码修改必须走独立密码接口

### `DELETE /api/users/[id]`

用途：删除用户。

认证：仅 `ADMIN`。

特殊规则：

- 不允许删除自己的管理员账户

### `PUT /api/users/[id]/role`

用途：更新用户角色（如设置为验证人员）。

认证：仅 `ADMIN`。

请求体：

- `role`: 新角色

规则：

- 不能修改自己的角色

### `GET /api/users/[id]/points`

用途：获取用户积分历史和交易记录。

认证：`ADMIN`、`STAFF` 或用户本人。

返回：

- 用户当前积分
- 积分交易记录列表

### `POST /api/users/[id]/points`

用途：管理员调整用户积分。

认证：`ADMIN` 或 `STAFF`。

请求体：

- `points`: 积分变化（正数增加，负数减少）
- `description`: 调整原因
- `type`: `"MANUAL_ADD"` | `"MANUAL_DEDUCT"` | `"BONUS"`

## 6. 后台活动管理接口

### `GET /api/events`

用途：查询活动列表。

认证：`ADMIN` 或 `STAFF`。

支持查询参数：

- `page`
- `pageSize`
- `search`
- `type`
- `published`

返回内容包括：

- 活动基础信息
- 赛道信息
- 报名数、签到数、议程项数统计

### `POST /api/events`

用途：创建活动。

认证：仅 `ADMIN`。

关键字段：

- `title`
- `titleEn`
- `description`
- `shortDesc`
- `date`
- `startTime`
- `endTime`
- `venue`
- `address`
- `image`
- `type`
- `trackId`
- `maxAttendees`
- `isPublished`
- `isFeatured`
- `locale`

允许的 `type`：

- `forum`
- `workshop`
- `ceremony`
- `conference`
- `networking`

### `GET /api/events/[id]`

用途：获取活动详情。

认证：`ADMIN` 或 `STAFF`。

### `PUT /api/events/[id]`

用途：更新活动。

认证：仅 `ADMIN`。

### `DELETE /api/events/[id]`

用途：删除活动。

认证：仅 `ADMIN`。

## 7. 后台嘉宾管理接口

### `GET /api/speakers`

用途：查询嘉宾列表。

支持参数：

- `page`
- `limit`
- `search`
- `isKeynote`

当前实现说明：GET 接口用于后台列表获取，不强制要求登录；写操作要求管理员或工作人员权限。若后续上线策略提升，应优先补齐读取权限限制。

### `POST /api/speakers`

用途：创建嘉宾。

认证：`ADMIN` 或 `STAFF`。

关键字段：

- `name`
- `nameEn`
- `title`
- `titleEn`
- `organization`
- `organizationEn`
- `organizationLogo`
- `bio`
- `bioEn`
- `email`
- `linkedin`
- `twitter`
- `website`
- `avatar`
- `isKeynote`
- `order`

### `GET|PUT|DELETE /api/speakers/[id]`

用途：嘉宾详情、更新、删除。

认证：详情和写操作遵循后台权限控制。

## 8. 后台合作伙伴管理接口

### `GET /api/sponsors`

用途：查询赞助商列表。

支持参数：

- `tier`
- `isActive`
- `sortBy`
- `order`

### `POST /api/sponsors`

用途：创建赞助商。

认证：`ADMIN` 或 `STAFF`。

关键字段：

- `name`
- `nameEn`
- `logo`
- `website`
- `description`
- `descriptionEn`
- `tier`
- `order`
- `isActive`

合法 `tier`：

- `platinum`
- `gold`
- `silver`
- `bronze`
- `partner`

### `GET|PUT|DELETE /api/sponsors/[id]`

用途：赞助商详情、更新、删除。

## 9. 文档外注意事项

- 当前 API 没有统一 OpenAPI 描述文件
- 部分接口采用宽松 JSON 返回，前端对字段有一定耦合
- 若后续要开放第三方集成，建议先补统一 DTO、输入校验和 OpenAPI 生成链路
