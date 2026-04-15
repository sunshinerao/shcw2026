# Figma HTML 模版导入规范（Knowledge Formal Template）

## 需求解读

管理员在 Figma 中完成不同正式文档模版的设计后，可能会导出 HTML 文件作为视觉稿。该 HTML 不能直接作为最终文档模版渲染器使用，因为系统必须统一遵守以下硬性规则：

1. 目录自动分页
2. 正文章节自动分页
3. 章节之间强制分页
4. 目录页码必须根据正文实际分页结果回填
5. 同一份模版既要支持 HTML 预览，也要支持 PDF 导出

因此，Figma 导出的 HTML 在系统中应被视为“视觉皮肤来源”，而不是直接替代分页引擎。

## 修改方法

本次改造采用“设计稿适配层 + 系统分页引擎”的方案：

1. 管理员上传 Figma 导出的 HTML 文件。
2. 系统先对 HTML 做清洗与安全处理，去掉脚本和危险属性。
3. 从 HTML / CSS 中提取视觉 token，例如：
   - 主色
   - 字体族
   - 局部 CSS 样式
4. 将这些视觉信息归一化为系统正式模版配置。
5. 真正的目录分页、章节分页、页码回填仍由系统统一的白皮书分页引擎负责。

这样可以保证：
- 模版可以有不同视觉风格
- 但不会破坏统一的导出规则与页码正确性

## 修改内容

### 一、导入后的模版契约

导入后的正式文档模板必须统一转换为系统契约：

- `renderMode = figma_whitepaper`
- `includeTableOfContents = true`
- `forceChapterPageBreak = true`
- `includePageNumbers = true`
- `includeChapters = true`

### 二、统一字段与版面映射

Figma HTML 中的视觉结构，最终映射到系统的标准内容槽位：

- Cover → 封面
- TOC → 目录页
- Intro → 摘要 / 导言
- Quote → 引语页
- Chapter → 章节首页与续页
- Recommendations → 建议页
- About → 封底页

### 三、推荐导入流程

推荐调用：

- `POST /api/knowledge-templates/import-html`

输入：
- 模版名称
- Figma 导出的 HTML 源码
- 可选基础配置

输出：
- 已规范化的正式模版配置
- 检查结果与警告信息
- 可选直接创建成系统模版记录

### 四、必须遵守的原则

无论设计稿如何变化，下列逻辑始终由系统控制：

- 目录是否分页，不由 HTML 决定，而由内容长度和 `tocItemsPerPage` 决定
- 章节正文如何拆成首页与续页，不由 HTML 决定，而由分页器决定
- 章节之间必须分页，不允许模板绕过
- 目录页码以实际规划页序为准，统一回填

因此，Figma HTML 的职责是“定义视觉样式”，而系统模版引擎的职责是“定义文档行为”。
