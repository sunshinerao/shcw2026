/**
 * Knowledge Template Database Access Layer
 */

import { prisma } from "@/lib/prisma";
import type { KnowledgeTemplateType, KnowledgeTemplateConfig } from "@/lib/knowledge-template";
import { DEFAULT_TEMPLATES } from "@/lib/knowledge-template";
import type { Prisma } from "@prisma/client";

/**
 * 初始化默认模板（首次运行时）
 */
export async function initializeDefaultTemplates() {
  for (const template of Object.values(DEFAULT_TEMPLATES)) {
    const existing = await prisma.knowledgeTemplate.findUnique({
      where: { code: template.code },
    });

    if (!existing) {
      await prisma.knowledgeTemplate.create({
        data: {
          code: template.code,
          name: template.name,
          nameEn: template.nameEn,
          description: `${template.name} for ${template.templateType}`,
          templateType: template.templateType,
          isActive: true,
          isDefault: template.isDefault,
          sortOrder: 0,
          config: template.config as unknown as Prisma.InputJsonValue,
          documentFormat: (template as any).documentFormat,
          includeElements: template.templateType === "FORMAL_DOCUMENT"
            ? ((template.config.formal || {}) as unknown as Prisma.InputJsonValue)
            : undefined,
          componentType: template.templateType === "WEBPAGE_DISPLAY"
            ? (template.config.webpage?.layout || "standard")
            : undefined,
        },
      });
    }
  }
}

/**
 * 获取所有活跃的模板
 */
export async function getAllActiveTemplates(templateType?: KnowledgeTemplateType) {
  const where: any = { isActive: true };
  if (templateType) {
    where.templateType = templateType;
  }

  return prisma.knowledgeTemplate.findMany({
    where,
    orderBy: [
      { isDefault: "desc" },
      { sortOrder: "asc" },
      { createdAt: "desc" },
    ],
  });
}

/**
 * 根据ID获取模板
 */
export async function getTemplateById(id: string) {
  return prisma.knowledgeTemplate.findUnique({
    where: { id },
  });
}

/**
 * 根据代码获取模板
 */
export async function getTemplateByCode(code: string) {
  return prisma.knowledgeTemplate.findUnique({
    where: { code },
  });
}

/**
 * 获取指定类型的默认模板
 */
export async function getDefaultTemplate(templateType: KnowledgeTemplateType) {
  return prisma.knowledgeTemplate.findFirst({
    where: {
      templateType,
      isDefault: true,
      isActive: true,
    },
  });
}

/**
 * 获取指定类型的所有模板
 */
export async function getTemplatesByType(templateType: KnowledgeTemplateType) {
  return prisma.knowledgeTemplate.findMany({
    where: {
      templateType,
      isActive: true,
    },
    orderBy: [
      { isDefault: "desc" },
      { sortOrder: "asc" },
    ],
  });
}

/**
 * 创建新模板
 */
export async function createTemplate(data: {
  code: string;
  name: string;
  nameEn?: string;
  description?: string;
  templateType: KnowledgeTemplateType;
  config: KnowledgeTemplateConfig;
  isDefault?: boolean;
}) {
  const { code, name, nameEn, description, templateType, config, isDefault } = data;

  // 如果设置为默认，取消其他默认项
  if (isDefault) {
    await prisma.knowledgeTemplate.updateMany({
      where: { templateType, isDefault: true },
      data: { isDefault: false },
    });
  }

  return prisma.knowledgeTemplate.create({
    data: {
      code,
      name,
      nameEn: nameEn || name,
      description: description || `${name} template`,
      templateType,
      config: config as unknown as Prisma.InputJsonValue,
      isDefault: isDefault || false,
      isActive: true,
      sortOrder: 0,
      documentFormat: templateType === "FORMAL_DOCUMENT" ? "pdf" : undefined,
      componentType: templateType === "WEBPAGE_DISPLAY" ? (config.webpage?.layout || "standard") : undefined,
    },
  });
}

/**
 * 更新模板
 */
export async function updateTemplate(
  id: string,
  data: Partial<{
    name: string;
    nameEn: string;
    description: string;
    config: KnowledgeTemplateConfig;
    isActive: boolean;
    isDefault: boolean;
    sortOrder: number;
  }>
) {
  // 如果设置为默认，取消其他默认项
  if (data.isDefault) {
    const template = await prisma.knowledgeTemplate.findUnique({ where: { id } });
    if (template) {
      await prisma.knowledgeTemplate.updateMany({
        where: { templateType: template.templateType, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }
  }

  const { config, ...restData } = data;

  return prisma.knowledgeTemplate.update({
    where: { id },
    data: {
      ...restData,
      ...(config !== undefined
        ? { config: config as unknown as Prisma.InputJsonValue }
        : {}),
      updatedAt: new Date(),
    },
  });
}

/**
 * 删除模板（逻辑删除）
 */
export async function deactivateTemplate(id: string) {
  return prisma.knowledgeTemplate.update({
    where: { id },
    data: { isActive: false },
  });
}

/**
 * 创建生成任务
 */
export async function createGenerationJob(data: {
  knowledgeAssetId: string;
  templateId: string;
  jobType: "document" | "webpage" | "both";
}) {
  return prisma.knowledgeGenerationJob.create({
    data: {
      knowledgeAssetId: data.knowledgeAssetId,
      templateId: data.templateId,
      jobType: data.jobType,
      status: "PENDING",
      progress: 0,
    },
  });
}

/**
 * 获取生成任务
 */
export async function getGenerationJob(id: string) {
  return prisma.knowledgeGenerationJob.findUnique({
    where: { id },
    include: {
      knowledgeAsset: true,
      template: true,
    },
  });
}

/**
 * 获取知识资产的最新生成任务
 */
export async function getLatestGenerationJobForAsset(knowledgeAssetId: string) {
  return prisma.knowledgeGenerationJob.findFirst({
    where: { knowledgeAssetId },
    include: {
      template: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * 更新生成任务状态
 */
export async function updateGenerationJobStatus(
  id: string,
  data: {
    status: string;
    progress?: number;
    outputUrl?: string;
    outputFormat?: string;
    errorMessage?: string;
  }
) {
  return prisma.knowledgeGenerationJob.update({
    where: { id },
    data: {
      ...data,
      completedAt: data.status === "COMPLETED" ? new Date() : undefined,
      updatedAt: new Date(),
    },
  });
}

/**
 * 获取待处理的生成任务
 */
export async function getPendingGenerationJobs(limit = 10) {
  return prisma.knowledgeGenerationJob.findMany({
    where: {
      status: "PENDING",
    },
    include: {
      knowledgeAsset: true,
      template: true,
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
}
