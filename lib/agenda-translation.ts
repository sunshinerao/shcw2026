import { Prisma } from "@prisma/client";
import { translateMissingEventFieldsToEnglish, translateRecordValuesToEnglish } from "@/lib/ai-translation";
import { prisma } from "@/lib/prisma";

type AgendaTranslationItem = {
  id: string;
  title: string;
  titleEn?: string | null;
  description?: string | null;
  descriptionEn?: string | null;
  speakerMeta?: unknown;
};

function normalizeTopicMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim().length > 0
    )
  );
}

export async function backfillAgendaEnglish<T extends AgendaTranslationItem>(items: T[]): Promise<T[]> {
  return Promise.all(
    items.map(async (item) => {
      let changed = false;
      let nextTitleEn = item.titleEn || null;
      let nextDescriptionEn = item.descriptionEn || null;
      let nextSpeakerMeta = item.speakerMeta;

      if (!nextTitleEn || (!nextDescriptionEn && item.description)) {
        try {
          const translated = await translateMissingEventFieldsToEnglish({
            title: !nextTitleEn ? item.title : undefined,
            description: !nextDescriptionEn ? item.description : undefined,
          });

          if (!nextTitleEn && translated.titleEn) {
            nextTitleEn = translated.titleEn;
            changed = true;
          }

          if (!nextDescriptionEn && translated.descriptionEn) {
            nextDescriptionEn = translated.descriptionEn;
            changed = true;
          }
        } catch {
          // Non-blocking fallback
        }
      }

      if (item.speakerMeta && typeof item.speakerMeta === "object" && !Array.isArray(item.speakerMeta)) {
        const rawMeta = item.speakerMeta as Record<string, unknown>;
        const topics = normalizeTopicMap(rawMeta.topics);
        const topicsEn = normalizeTopicMap(rawMeta.topicsEn);
        const missingTopics = Object.fromEntries(
          Object.entries(topics).filter(([key]) => !topicsEn[key])
        );

        if (Object.keys(missingTopics).length > 0) {
          try {
            const translatedTopics = await translateRecordValuesToEnglish(missingTopics);
            if (Object.keys(translatedTopics).length > 0) {
              nextSpeakerMeta = {
                ...rawMeta,
                topicsEn: {
                  ...topicsEn,
                  ...translatedTopics,
                },
              };
              changed = true;
            }
          } catch {
            // Non-blocking fallback
          }
        }
      }

      if (changed) {
        await prisma.agendaItem.update({
          where: { id: item.id },
          data: {
            titleEn: nextTitleEn,
            descriptionEn: nextDescriptionEn,
            ...(nextSpeakerMeta !== undefined
              ? { speakerMeta: nextSpeakerMeta as Prisma.InputJsonValue }
              : {}),
          },
        });
      }

      return {
        ...item,
        titleEn: nextTitleEn,
        descriptionEn: nextDescriptionEn,
        speakerMeta: nextSpeakerMeta,
      };
    })
  );
}
