# 用户字段对齐 - 变更日志

## 1. 需求解读

对比审计发现数据库 User 模型、注册页面、个人资料页面、管理员用户管理页面之间存在字段不对齐的问题：

- **数据库**缺少 `salutation`（称谓）字段
- **注册页面**缺少 phone、title、bio、salutation、organization 等字段
- **个人资料页面**缺少 salutation 显示/编辑、climatePassportId 显示、组织信息无法编辑
- **管理员页面**缺少 salutation、部分组织字段（logo/size/contactName/Email/Phone）、头像使用 URL 输入而非文件上传、创建用户时未自动生成 climatePassportId

### 字段要求

| 字段 | 注册页 | 资料页 | 管理员页 | 必填 |
|------|--------|--------|----------|------|
| salutation | 可选 | 可编辑 | 可编辑 | 否 |
| phone | 可选 | 已有 | 已有 | 否 |
| title | 必填 | 已有 | 已有 | 是 |
| bio | 可选 | 已有 | 已有 | 否 |
| organization.name | 可选 | 可编辑 | 已有 | 否 |
| organization.industry | 可选 | 可编辑 | 已有 | 否 |
| organization.website | 可选 | 可编辑 | 已有 | 否 |
| organization.description | 可选 | 可编辑 | 已有 | 否 |
| organization.size | - | - | 新增 | 否 |
| organization.logo | - | - | 新增 | 否 |
| organization.contactName | - | - | 新增 | 否 |
| organization.contactEmail | - | - | 新增 | 否 |
| organization.contactPhone | - | - | 新增 | 否 |
| climatePassportId | 自动生成 | 只读显示 | 自动生成 | 自动 |
| avatar | - | 已有 | 文件上传 | 否 |

## 2. 修改方法

1. **Prisma Schema**: 在 User 模型添加 `salutation String?` 字段，执行数据库迁移
2. **API 层**: 更新注册 API、用户资料 API、管理员用户 API，支持新字段的读写
3. **前端页面**: 更新注册页面、个人资料页面、管理员用户管理页面的表单和显示
4. **国际化**: 在中英文 i18n 文件中添加所有新字段的翻译

## 3. 修改内容

### 3.1 数据库迁移

**文件**: `prisma/schema.prisma`
- User 模型新增 `salutation String?` 字段
- 迁移文件: `20260330151643_add_salutation_to_user`

### 3.2 注册 API

**文件**: `app/api/register/route.ts`
- 解构新增 `bio`, `salutation` 字段
- `title` 增加必填校验
- 创建用户数据增加 `salutation`, `bio`
- 组织创建增加 `description` 字段

### 3.3 注册页面

**文件**: `app/[locale]/auth/register/page.tsx`
- 新增表单字段: salutation (Select)、phone、title（必填）、bio (Textarea)
- 新增可折叠组织信息区域: name、industry、website、description
- 容器宽度从 `max-w-md` 调整为 `max-w-lg`
- 提交逻辑验证 title 必填
- 新增 imports: Phone, Briefcase, Building2, ChevronDown/Up, Textarea, Select 组件

### 3.4 用户资料 API

**文件**: `app/api/user/profile/route.ts`
- GET: select 增加 `salutation`
- PUT: 接收 `salutation` 和 `organization` 对象
- PUT: 使用 `prisma.$transaction` 实现组织信息的 upsert（存在则更新，不存在则创建）
- 返回完整用户信息含 salutation 和 climatePassportId

### 3.5 个人资料页面

**文件**: `app/[locale]/dashboard/profile/page.tsx`
- 新增 salutation Select 下拉框（可编辑）
- 新增 climatePassportId 只读输入框（带 Award 图标）
- 组织信息 Tab 从只读显示改为可编辑表单（name, industry, website, description + Save 按钮）
- 移除 "联系管理员" 提示和空状态显示
- 组织 state 类型从 `Organization | null` 改为始终 `Organization`（带空默认值）

### 3.6 管理员用户 API

**文件**: `app/api/users/route.ts`
- POST: 新增 `generateUniqueClimatePassportId()` 函数，创建用户时自动生成 climatePassportId
- POST/GET: 增加 `salutation` 和 `climatePassportId` 字段

**文件**: `app/api/users/[id]/route.ts`
- GET/PUT: 增加 `salutation` 和 `climatePassportId` 字段
- PUT: 支持 salutation 字段更新

### 3.7 管理员用户页面

**文件**: `app/[locale]/admin/users/page.tsx`
- 新增 salutation Select 下拉框
- 头像从 URL 文本输入改为文件上传（FileReader 转 base64）
- 新增组织信息区域标题
- 新增 5 个组织字段: size, contactName, contactEmail, contactPhone, logo
- 扩展 ManagedUser 和 UserFormState 类型定义

### 3.8 国际化翻译

**文件**: `messages/zh.json`, `messages/en.json`
- 注册页: salutation/title/phone/bio 标签和占位符、组织区域标签、titleRequired 错误
- 资料页: salutation/climatePassportId 字段标签、组织可编辑表单标签
- 管理员页: salutation、组织区域标题及 5 个新字段标签

---

**修改日期**: 2025-07-22
**影响范围**: 注册流程、用户资料管理、管理员用户管理
**兼容性**: 所有新字段均为可选（除 title 必填），不影响现有用户数据
