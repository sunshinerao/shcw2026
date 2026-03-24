# 系统架构

> 最后更新: 2026-03-23

## 1. 架构概览

当前项目是一个基于 Next.js App Router 的全栈应用，前端页面、服务端渲染、API 路由、认证和数据库访问都在同一代码库内完成。

核心架构分层如下：

- 表现层：`app/[locale]/**` 页面、布局和客户端交互
- 组件层：`components/**`
- 应用服务层：`lib/**`，包括认证、国际化辅助、邮件、工具函数、数据组装
- API 层：`app/api/**`
- 数据层：Prisma ORM + PostgreSQL
- 配置层：`i18n/**`、`middleware.ts`、`.env`

## 2. 页面与模块边界

### 前台页面

位于 `app/[locale]/**`，主要包括：

- 首页
- 活动列表、活动详情、活动报名页
- 嘉宾页
- 合作伙伴页
- 新闻页
- 关于页
- 联系页
- FAQ / Terms / Privacy

### 认证与用户中心

- 认证页面：`app/[locale]/auth/**`
- 用户中心：`app/[locale]/dashboard/**`

### 管理后台

- 后台总览：`app/[locale]/admin/page.tsx`
- 活动管理：`app/[locale]/admin/events/page.tsx`
- 嘉宾管理：`app/[locale]/admin/speakers/page.tsx`
- 合作伙伴管理：`app/[locale]/admin/partners/page.tsx`
- 用户管理：`app/[locale]/admin/users/page.tsx`

### 现场验证

- 验码页面：`app/[locale]/verifier/page.tsx`（仅 VERIFIER/ADMIN/STAFF 可访问）

## 3. 国际化设计

国际化由 `next-intl` 驱动。

关键特征：

- 支持语言：`zh`、`en`
- 默认语言：`zh`
- URL 必带 locale 前缀
- 使用 `NEXT_LOCALE` cookie 持久化语言偏好

关键文件：

- `i18n/routing.ts`
- `middleware.ts`
- `messages/zh.json`
- `messages/en.json`

路由规则：

- 中文：`/zh/...`
- 英文：`/en/...`

说明：文档和沟通中若写 `/events`，默认表示逻辑页面；实际访问 URL 应为 `/zh/events` 或 `/en/events`。

## 4. 认证设计

认证基于 NextAuth Credentials Provider。

### 认证要点

- 用户通过邮箱和密码登录
- Session 使用 JWT 策略
- Session Cookie 名称为 `next-auth.session-token`
- 生产环境必须设置 `NEXTAUTH_SECRET`
- 用户状态不是 `ACTIVE` 时禁止登录

关键文件：

- `lib/auth.ts`
- `lib/auth-config.ts`
- `app/api/auth/[...nextauth]/route.ts`

### 开发环境辅助认证

`lib/auth-helpers.ts` 中存在 `verifyAuthDev`，支持开发环境下通过 `x-dev-user-id` 进行认证绕过。

前提条件：

- 非生产环境
- 显式设置 `ENABLE_DEV_AUTH_BYPASS=true`

这项机制只能用于本地调试，不允许进入生产环境文档外的默认操作流程。

## 5. 权限模型

用户角色定义在 Prisma `UserRole` 枚举中：

- `VISITOR` - 访客（未注册用户）
- `ATTENDEE` - 参会观众
- `ORGANIZATION` - 机构代表
- `SPONSOR` - 赞助商
- `SPEAKER` - 演讲嘉宾
- `MEDIA` - 媒体
- `ADMIN` - 管理员
- `STAFF` - 工作人员
- `VERIFIER` - 现场验证人员

用户状态定义：

- `PENDING` - 待审核
- `ACTIVE` - 已激活
- `SUSPENDED` - 已禁用

权限约束简述：

- `ADMIN`：拥有后台所有资源的完全管理权限
- `STAFF`：可访问后台读操作和部分管理接口，但受限于资源类型
- `VERIFIER`：可访问现场验码页面，扫描用户二维码进行签到验证
- 普通用户：只能访问自己的资料与个人中心相关接口

## 6. 数据模型

核心模型如下：

- `User` - 用户
- `Organization` - 机构
- `Track` - 赛道
- `Event` - 活动
- `Registration` - 报名表
- `AgendaItem` - 议程项
- `Speaker` - 嘉宾
- `CheckIn` - 验码记录
- `Sponsor` - 赞助商
- `News` - 新闻
- `Wishlist` - 收藏
- `PointTransaction` - 积分交易

### 关键关系

- 一个 `User` 可关联一个 `Organization`
- 一个 `User` 可有多个 `Registration`、`Wishlist`、`PointTransaction`
- 一个 `Event` 属于一个 `Track`
- 一个 `Event` 可有多个 `Registration`、`AgendaItem`、`CheckIn`、`Wishlist`
- 一个 `AgendaItem` 可关联多个 `Speaker`

### 用户核心字段

- `passCode` - 唯一通行证代码（二维码用）
- `climatePassportId` - 气候护照唯一ID（格式：SCW2026-XXXXXX）
- `points` - 用户积分

### 报名表核心字段

- `status` - 状态（REGISTERED / CANCELLED / ATTENDED / WAITLIST）
- `checkedInAt` - 验码时间
- `checkedInBy` - 验码人员ID
- `checkInMethod` - 验码方式（QR_CODE / MANUAL）
- `pointsEarned` - 获得积分

### 双语字段设计

以下核心内容支持中英双语字段：

- `Track.name` / `Track.nameEn`
- `Event.title` / `Event.titleEn`
- `Speaker.name` / `Speaker.nameEn`
- `Speaker.title` / `Speaker.titleEn`
- `Speaker.organization` / `Speaker.organizationEn`
- `Speaker.bio` / `Speaker.bioEn`
- `Sponsor.name` / `Sponsor.nameEn`
- `Sponsor.description` / `Sponsor.descriptionEn`

这意味着 i18n 不只依赖静态翻译文件，也依赖数据库内容的双语字段。

## 7. API 设计原则

项目使用 App Router Route Handlers 作为 API 层。

主要特点：

- 统一返回 JSON
- 权限校验在 route handler 内完成
- 核心 auth / admin / verifier / 用户工具接口已统一接入中英文本地化错误返回
- 后台管理接口以 session 鉴权为主

核心 API 文件分布：

- `app/api/register/route.ts`
- `app/api/user/profile/route.ts`
- `app/api/user/password/route.ts`
- `app/api/user/registrations/route.ts` - 用户活动记录
- `app/api/forgot-password/route.ts`
- `app/api/reset-password/route.ts`
- `app/api/qrcode/route.ts` - 二维码生成
- `app/api/checkin/route.ts` - 验码签到
- `app/api/users/**`
- `app/api/events/**`
- `app/api/speakers/**`
- `app/api/sponsors/**`

## 8. 二维码与验码系统

### 二维码类型

1. **气候护照二维码** - 通用身份验证
   - 格式：`SCW2026://PASSPORT/{userId}/{passCode}`
   - 用于现场身份核验

2. **活动通行证二维码** - 活动签到
   - 格式：`SCW2026://EVENT/{eventId}/{userId}/{registrationId}/{timestamp}`
   - 有效期：5分钟
   - 用于活动现场签到

### 验码流程

1. 验证人员打开 `/verifier` 页面
2. 扫描参与者二维码
3. 系统验证二维码有效性
4. 自动记录签到并发放积分

## 9. 积分系统

### 积分获取方式

- 活动签到：基础10分 + 活动类型加成
  - ceremony: 20分
  - forum: 15分
  - workshop: 10分
  - conference: 15分
  - networking: 5分
- 管理员手动添加

### 积分记录

所有积分变动记录在 `PointTransaction` 表中，包含：

- 变动积分值
- 变动类型
- 关联活动
- 操作人
- 描述说明

## 10. 邮件与密码重置

密码找回邮件通过 Nodemailer 发送。

关键规则：

- 若 SMTP 未配置，密码找回接口返回服务不可用
- 找回密码链接包含 locale 路径
- reset token 有效期为 1 小时
- token 使用后会被清空

关键文件：

- `lib/mailer.ts`
- `app/api/forgot-password/route.ts`
- `app/api/reset-password/route.ts`

## 11. 当前架构边界

当前已落地的能力：

- 网站、认证、个人中心
- 后台 CRUD 和基础邮件能力
- **二维码生成与验码系统**
- **积分系统**
- **气候护照系统**
- **现场验证工作台**

尚未在当前实现中形成闭环或未作为正式上线能力交付的部分包括：

- 支付系统
- News 后台管理
- 更细粒度的操作审计日志
- 监控、告警、埋点、SEO 运维链路

这些内容应视为后续扩展，而不是当前交付物的一部分。
