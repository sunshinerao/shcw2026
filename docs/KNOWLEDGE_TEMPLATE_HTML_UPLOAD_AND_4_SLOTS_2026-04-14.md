# Knowledge Template HTML 上传与四模板槽位更新

## 需求解读

本次需要补齐两项关键能力：

1. 管理员可以直接上传 HTML 文件导入正式文档模板，而不仅是手动粘贴 HTML 源码。
2. 每种 Knowledge 文档类型都需要可以独立配置 4 种不同模板，便于后续按标准正式、简化正式、标准网页、卡片网页方式调用。

## 修改方法

- 扩展 Knowledge 类型配置结构，在原有默认正式模板和默认网页模板基础上，增加 4 个显式模板槽位。
- 更新系统设置页的 Knowledge 管理界面，让管理员可视化配置这 4 个模板槽位。
- 扩展 HTML 导入接口，支持 multipart form data，从上传的 HTML 文件中直接读取源码并导入模板。
- 同步更新成果创建页面的默认模板推荐逻辑，使其优先使用新的标准槽位。

## 修改内容

- 在 Knowledge 类型配置中新增：
  - formalTemplateCodeStandard
  - formalTemplateCodeSimple
  - webTemplateCodeStandard
  - webTemplateCodeCard
- 在系统设置页增加 HTML 文件上传控件，支持上传 .html 或 .htm 文件。
- 保留粘贴 HTML 的方式，形成“上传文件 + 手动粘贴”双通道导入。
- 导入接口新增 multipart form data 处理逻辑，可直接读取上传文件内容。
- 成果创建页默认模板推荐逻辑改为读取新的标准模板槽位。
- 更新中英文设置说明文案，使管理员明确理解 4 个模板槽位的用途。
