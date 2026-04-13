# OpenAPI V2 使用说明

## 1. 规范文件

- OpenAPI 3.1 文件：`docs/openapi.v2.json`
- 覆盖范围：`/api/v2/**`（与当前 OpenClaw V2 机器接口一致）

## 2. 校验规范文件

在 `my-app` 目录执行：

```bash
node -e "JSON.parse(require('fs').readFileSync('docs/openapi.v2.json','utf8')); console.log('openapi.v2.json is valid JSON')"
```

## 3. 生成 TypeScript SDK（推荐）

### 方案 A：openapi-typescript（类型优先）

```bash
npx openapi-typescript docs/openapi.v2.json -o types/openapi-v2.d.ts
```

适用：只需要强类型，不需要请求客户端。

### 方案 B：OpenAPI Generator（完整客户端）

```bash
npx @openapitools/openapi-generator-cli generate \
  -i docs/openapi.v2.json \
  -g typescript-fetch \
  -o sdk/openapi-v2-fetch
```

适用：需要可直接调用的客户端 SDK。

## 4. Postman 导入

1. 打开 Postman
2. Import -> File
3. 选择 `docs/openapi.v2.json`
4. 导入后在 Collection 级配置：
   - `Authorization: Bearer {{api_key}}` 或 `x-api-key: {{api_key}}`

## 5. V2 响应约定

- 所有 V2 响应包含：`X-API-Version: v2`
- JSON 错误响应统一包含：`code`
  - 若业务层未显式返回 `code`，V2 会按 HTTP 状态自动补齐

## 6. 维护建议

每次新增或调整 `/api/v2/**` 接口时，需同步更新：

1. `docs/openapi.v2.json`
2. `docs/OPENCLAW_API_V2.md`
3. `docs/API_AUDIT_V2_REPORT.md`（必要时）
