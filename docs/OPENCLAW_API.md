# SHCW2026 OpenClaw API 使用文档

> 供 AI Agent（如 OpenClaw、Dify、LangChain 等）调用的 REST API。  
> Base URL（生产）：`https://shcw2026.vercel.app`  
> 所有路径以 `/api/v1/` 开头。

---

## 目录

1. [认证方式](#1-认证方式)
2. [通用响应结构](#2-通用响应结构)
3. [活动 Events](#3-活动-events)
4. [议程 Agenda](#4-议程-agenda)
5. [嘉宾 Speakers](#5-嘉宾-speakers)
6. [新闻 News](#6-新闻-news)
7. [合作伙伴 Partners](#7-合作伙伴-partners)
8. [用户密码重置 Users](#8-用户密码重置-users)
9. [错误码参考](#9-错误码参考)
10. [权限说明](#10-权限说明)

---

## 1. 认证方式

所有 `/api/v1/` 接口均需携带 API 密钥，支持两种方式（任选其一）：

```http
Authorization: Bearer sk_oc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

```http
x-api-key: sk_oc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

- API 密钥由管理员在后台「API 密钥管理」页面生成。
- 密钥格式：`sk_oc_` 开头，共 38 个字符。
- 密钥明文只在创建时显示一次，请立即保存。
- 若配置了 IP 白名单，请求 IP 不在白名单内时返回 `403`。

---

## 2. 通用响应结构

### 成功

```json
{
  "success": true,
  "data": { ... },
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

> `pagination` 仅在列表接口中出现。

### 失败

```json
{
  "success": false,
  "error": "错误描述"
}
```

---

## 3. 活动 Events

### 3.1 获取活动列表

```
GET /api/v1/events
```

**所需权限：** `events:read`

**Query 参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | number | `1` | 页码 |
| `pageSize` | number | `20` | 每页数量，最大 100 |
| `search` | string | — | 按标题/场地模糊搜索 |
| `type` | string | — | 活动类型，见下方枚举 |
| `trackId` | string | — | 按专题轨道 ID 过滤 |
| `published` | string | `true` | `true`/`false`/`all` |

**活动类型（type）枚举：** `forum` · `workshop` · `ceremony` · `conference` · `networking`

**示例请求：**

```http
GET /api/v1/events?page=1&pageSize=10&type=forum&published=true
Authorization: Bearer sk_oc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**响应示例：**

```json
{
  "success": true,
  "data": [
    {
      "id": "clxyz123",
      "title": "2026上海气候周开幕式",
      "titleEn": "SHCW2026 Opening Ceremony",
      "description": "...",
      "startDate": "2026-06-15T00:00:00.000Z",
      "endDate": "2026-06-15T00:00:00.000Z",
      "startTime": "09:00",
      "endTime": "12:00",
      "venue": "上海世博中心",
      "venueEn": "Shanghai World Expo Center",
      "type": "ceremony",
      "isPublished": true,
      "isFeatured": true,
      "maxAttendees": 500,
      "isClosed": false,
      "track": {
        "id": "track001",
        "name": "旗舰活动",
        "nameEn": "Flagship Events",
        "code": "flagship",
        "color": "#2563eb"
      },
      "eventDateSlots": [],
      "_count": { "registrations": 128 }
    }
  ],
  "pagination": { "page": 1, "pageSize": 10, "total": 32, "totalPages": 4 }
}
```

---

### 3.2 获取单个活动详情（含完整议程）

```
GET /api/v1/events/{id}
```

**所需权限：** `events:read`

返回活动完整信息，含 `agendaItems`（议程列表，每项含嘉宾信息）和 `eventDateSlots`。

---

### 3.3 创建活动

```
POST /api/v1/events
Content-Type: application/json
```

**所需权限：** `events:write`

**请求体：**

```json
{
  "title": "2026上海气候周开幕式",
  "titleEn": "SHCW2026 Opening Ceremony",
  "description": "活动简介（中文）",
  "descriptionEn": "Event description in English.",
  "shortDesc": "简短摘要",
  "shortDescEn": "Short summary",
  "startDate": "2026-06-15",
  "endDate": "2026-06-15",
  "startTime": "09:00",
  "endTime": "12:00",
  "venue": "上海世博中心",
  "venueEn": "Shanghai World Expo Center",
  "address": "上海市浦东新区世博大道1099号",
  "addressEn": "No.1099 Shibo Ave, Pudong, Shanghai",
  "city": "上海",
  "cityEn": "Shanghai",
  "type": "ceremony",
  "trackId": "track001",
  "maxAttendees": 500,
  "requireApproval": false,
  "isClosed": false,
  "isPublished": true,
  "isFeatured": true,
  "isPinned": false,
  "eventDateSlots": [
    { "scheduleDate": "2026-06-15", "startTime": "09:00", "endTime": "12:00" }
  ]
}
```

**必填字段：** `title`、`description`、`venue`、`type`、`startDate`

**验证规则：**
- `type` 必须是枚举值之一
- `endDate` 须 ≥ `startDate`
- `endTime` 须 > `startTime`（格式 `HH:MM`）
- 同名活动不允许重复（大小写不敏感）
- `trackId` 若提供须存在于数据库

**响应：** HTTP 201，返回创建的活动对象（含 `rawKey` 密钥字段）

---

### 3.4 更新活动

```
PUT /api/v1/events/{id}
Content-Type: application/json
```

**所需权限：** `events:write`

请求体与创建相同，所有字段均为可选（只传需要修改的字段）。  
若传 `eventDateSlots`，将完整替换现有日期安排。

---

### 3.5 删除活动

```
DELETE /api/v1/events/{id}
```

**所需权限：** `events:write`

永久删除。成功返回 `{ "success": true, "message": "Event deleted" }`。

---

## 4. 议程 Agenda

### 4.1 获取活动议程列表

```
GET /api/v1/events/{eventId}/agenda
```

**所需权限：** `events:read`

按日期 → 排序号 → 开始时间排序返回。每项含 `speakers`（演讲嘉宾）和 `moderator`（主持人）。

---

### 4.2 新增议程项

```
POST /api/v1/events/{eventId}/agenda
Content-Type: application/json
```

**所需权限：** `events:write`

**请求体：**

```json
{
  "title": "主旨演讲：迈向净零",
  "titleEn": "Keynote: Path to Net Zero",
  "description": "内容简介",
  "descriptionEn": "Description in English",
  "agendaDate": "2026-06-15",
  "startTime": "09:30",
  "endTime": "10:00",
  "type": "keynote",
  "venue": "主会场",
  "order": 1,
  "speakerIds": ["speaker_id_1", "speaker_id_2"],
  "moderatorId": "speaker_id_3",
  "speakerMeta": {
    "orderedIds": ["speaker_id_1", "speaker_id_2"],
    "topics": { "speaker_id_1": "净零路径" },
    "topicsEn": { "speaker_id_1": "Net Zero Path" }
  }
}
```

**必填字段：** `title`、`agendaDate`（YYYY-MM-DD）、`startTime`、`endTime`

**议程类型（type）枚举：** `keynote` · `panel` · `workshop` · `sharing` · `launch` · `break` · `networking`

**验证规则：**
- `agendaDate` 须在活动 `startDate`～`endDate` 范围内
- `endTime` 须 > `startTime`
- 同一活动同一日期内，时间段不允许重叠
- `speakerIds` 中所有 ID 须存在于数据库

---

### 4.3 获取单个议程项

```
GET /api/v1/events/{eventId}/agenda/{agendaId}
```

**所需权限：** `events:read`

---

### 4.4 更新议程项

```
PUT /api/v1/events/{eventId}/agenda/{agendaId}
Content-Type: application/json
```

**所需权限：** `events:write`

所有字段可选。若传 `speakerIds`，将完整替换现有演讲嘉宾列表（set 操作）。

---

### 4.5 删除议程项

```
DELETE /api/v1/events/{eventId}/agenda/{agendaId}
```

**所需权限：** `events:write`

---

## 5. 嘉宾 Speakers

### 5.1 获取嘉宾列表

```
GET /api/v1/speakers
```

**所需权限：** `speakers:read`

**Query 参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | number | `1` | 页码 |
| `pageSize` | number | `20` | 每页数量，最大 100 |
| `search` | string | — | 按姓名/机构搜索 |
| `isKeynote` | boolean | — | `true` 只返回主旨嘉宾 |

> **注意：** 出于隐私保护，`email` 字段不在 API 响应中返回。

---

### 5.2 获取单个嘉宾

```
GET /api/v1/speakers/{id}
```

**所需权限：** `speakers:read`

---

### 5.3 创建嘉宾

```
POST /api/v1/speakers
Content-Type: application/json
```

**所需权限：** `speakers:write`

**请求体：**

```json
{
  "name": "张三",
  "nameEn": "Zhang San",
  "salutation": "Dr.",
  "title": "首席执行官",
  "titleEn": "CEO",
  "organization": "绿色科技集团",
  "organizationEn": "Green Tech Group",
  "organizationLogo": "https://example.com/logo.png",
  "bio": "个人简介（中文）",
  "bioEn": "Biography in English.",
  "avatar": "https://example.com/avatar.jpg",
  "email": "zhang@example.com",
  "linkedin": "https://linkedin.com/in/zhangsan",
  "twitter": "https://twitter.com/zhangsan",
  "website": "https://example.com",
  "isKeynote": false,
  "order": 10
}
```

**必填字段：** `name`、`title`、`organization`

**验证规则：** 同名嘉宾（忽略大小写、空格、连字符）不允许重复。

---

### 5.4 更新嘉宾

```
PATCH /api/v1/speakers/{id}
Content-Type: application/json
```

**所需权限：** `speakers:write`

所有字段可选。

---

### 5.5 删除嘉宾

```
DELETE /api/v1/speakers/{id}
```

**所需权限：** `speakers:write`

若该嘉宾已被分配至议程项，删除将被拒绝（返回 `409`），需先从议程中移除。

---

## 6. 新闻 News

### 6.1 获取新闻列表

```
GET /api/v1/news
```

**所需权限：** `news:read`

**Query 参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | number | `1` | 页码 |
| `pageSize` | number | `20` | 每页数量，最大 100 |
| `published` | string | `true` | `true`/`false`/`all` |

---

### 6.2 获取单条新闻

```
GET /api/v1/news/{idOrSlug}
```

**所需权限：** `news:read`

`{idOrSlug}` 可以是数据库 ID，也可以是文章的 `slug`。

---

### 6.3 创建新闻

```
POST /api/v1/news
Content-Type: application/json
```

**所需权限：** `news:write`

**请求体：**

```json
{
  "title": "2026上海气候周正式启动",
  "titleEn": "SHCW2026 Officially Launched",
  "slug": "shcw2026-launch",
  "excerpt": "摘要（中文）",
  "excerptEn": "Excerpt in English.",
  "content": "正文内容（支持 Markdown/HTML）",
  "contentEn": "Full content in English.",
  "coverImage": "https://example.com/cover.jpg",
  "isPublished": true
}
```

**必填字段：** `title`、`content`

**验证规则：**
- `slug` 若不提供，将自动由 `title` 生成（英文转换）
- `slug` 不允许重复
- `isPublished: true` 时自动设置 `publishedAt` 为当前时间

---

### 6.4 更新新闻

```
PATCH /api/v1/news/{idOrSlug}
Content-Type: application/json
```

**所需权限：** `news:write`

---

### 6.5 删除新闻

```
DELETE /api/v1/news/{idOrSlug}
```

**所需权限：** `news:write`

---

## 7. 合作伙伴 Partners

### 7.1 获取合作伙伴列表

```
GET /api/v1/partners
```

**所需权限：** `partners:read`

**Query 参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `tier` | string | — | 按级别过滤 |
| `activeOnly` | boolean | `true` | `false` 则返回所有（含非活跃） |

**合作伙伴级别（tier）枚举：** `platinum` · `gold` · `silver` · `bronze` · `partner`

---

### 7.2 获取单个合作伙伴

```
GET /api/v1/partners/{id}
```

**所需权限：** `partners:read`

---

### 7.3 创建合作伙伴

```
POST /api/v1/partners
Content-Type: application/json
```

**所需权限：** `partners:write`

**请求体：**

```json
{
  "name": "绿色能源集团",
  "nameEn": "Green Energy Group",
  "logo": "https://example.com/logo.png",
  "website": "https://example.com",
  "description": "机构简介（中文）",
  "descriptionEn": "Organization description in English.",
  "tier": "gold",
  "order": 5,
  "isActive": true,
  "showOnHomepage": true
}
```

**必填字段：** `name`、`logo`、`tier`

**验证规则：** 同级别内同名合作伙伴不允许重复（大小写不敏感）。

---

### 7.4 更新合作伙伴

```
PATCH /api/v1/partners/{id}
Content-Type: application/json
```

**所需权限：** `partners:write`

---

### 7.5 删除合作伙伴

```
DELETE /api/v1/partners/{id}
```

**所需权限：** `partners:write`

---

## 8. 用户密码重置 Users

### 8.1 重置用户密码

```
POST /api/v1/users/reset-password
Content-Type: application/json
```

**所需权限：** `users:write`

直接将指定用户的密码设置为新密码，**无需提供原密码**。操作成功后，该用户此前通过忘记密码流程获取的邮件重置链接将同时失效。

> ⚠️  此接口为高权限操作，仅应在受控场景下使用（如 AI Agent 代运营维护、后台批量管理）。API 密钥的 IP 白名单建议配置以限制调用来源。

**请求体：**

```json
{
  "email": "user@example.com",
  "newPassword": "NewSecurePass123"
}
```

**字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `email` | string | ✅ | 用户注册邮箱（大小写不敏感） |
| `newPassword` | string | ✅ | 新密码，至少 8 个字符 |

**验证规则：**
- `email` 必须已存在于数据库
- `newPassword` 长度 ≥ 8 个字符
- 已被停用（`SUSPENDED`）的账号无法重置密码（返回 `403`）

**成功响应（HTTP 200）：**

```json
{
  "success": true,
  "message": "Password for user@example.com has been reset successfully.",
  "data": {
    "userId": "clxyz123",
    "email": "user@example.com",
    "name": "张三"
  }
}
```

**失败响应示例：**

```json
{ "success": false, "error": "newPassword must be at least 8 characters" }
{ "success": false, "error": "No user found with that email address" }
{ "success": false, "error": "Cannot reset password for a suspended account" }
```

---

## 9. 错误码参考

| HTTP 状态码 | 含义 |
|------------|------|
| `200` | 操作成功 |
| `201` | 创建成功 |
| `400` | 请求参数错误（缺少必填字段、格式非法、枚举值无效等） |
| `401` | 未携带 API 密钥，或密钥无效 |
| `403` | 密钥权限不足，或请求 IP 不在白名单 |
| `404` | 资源不存在 |
| `409` | 数据冲突（重复标题/slug/名称，或嘉宾被议程引用无法删除） |
| `500` | 服务器内部错误 |

**错误响应示例：**

```json
{ "success": false, "error": "An event with title \"SHCW2026 Opening\" already exists (id: clxyz123)" }
```

---

## 10. 权限说明

每个 API 密钥可授予以下权限的任意组合：

| 权限 | 可执行操作 |
|------|-----------|
| `events:read` | 读取活动列表、详情、议程 |
| `events:write` | 创建/更新/删除活动和议程 |
| `speakers:read` | 读取嘉宾列表和详情 |
| `speakers:write` | 创建/更新/删除嘉宾 |
| `news:read` | 读取新闻列表和详情 |
| `news:write` | 创建/更新/删除新闻 |
| `partners:read` | 读取合作伙伴列表和详情 |
| `partners:write` | 创建/更新/删除合作伙伴 |
| `users:write` | 重置任意用户密码 |

---

## 附：AI Agent 调用示例（Python）

```python
import httpx

BASE_URL = "https://shcw2026.vercel.app"
API_KEY = "sk_oc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}

# 查询已发布活动（第1页，每页10条）
resp = httpx.get(f"{BASE_URL}/api/v1/events", params={"page": 1, "pageSize": 10}, headers=headers)
events = resp.json()["data"]

# 创建活动
new_event = httpx.post(f"{BASE_URL}/api/v1/events", json={
    "title": "净零科技论坛",
    "titleEn": "Net Zero Tech Forum",
    "description": "探讨净零科技最新进展。",
    "startDate": "2026-06-16",
    "endDate": "2026-06-16",
    "startTime": "14:00",
    "endTime": "17:00",
    "venue": "上海世博中心 C厅",
    "type": "forum",
    "isPublished": True,
}, headers=headers)
print(new_event.json())

# 为活动添加议程
event_id = new_event.json()["data"]["id"]
httpx.post(f"{BASE_URL}/api/v1/events/{event_id}/agenda", json={
    "title": "开场致辞",
    "agendaDate": "2026-06-16",
    "startTime": "14:00",
    "endTime": "14:20",
    "type": "keynote",
}, headers=headers)
```

---

*文档版本：v1.1 · 2026-04-10*
