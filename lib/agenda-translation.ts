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
  speakers?: Array<{
    id: string;
    name: string;
    nameEn?: string | null;
    title?: string | null;
    titleEn?: string | null;
    organization?: string | null;
    organizationEn?: string | null;
    roles?: Array<{
      id: string;
      title?: string | null;
      titleEn?: string | null;
      organization?: string | null;
      organizationEn?: string | null;
    }> | null;
  }>;
  moderator?: {
    id: string;
    name: string;
    nameEn?: string | null;
    title?: string | null;
    titleEn?: string | null;
    organization?: string | null;
    organizationEn?: string | null;
    roles?: Array<{
      id: string;
      title?: string | null;
      titleEn?: string | null;
      organization?: string | null;
      organizationEn?: string | null;
    }> | null;
  } | null;
};

type AgendaTranslationSpeaker = NonNullable<AgendaTranslationItem["speakers"]>[number];
type AgendaTranslationRole = NonNullable<AgendaTranslationSpeaker["roles"]>[number];
type AgendaTranslationSpeakerUpdate = {
  nameEn?: string;
  titleEn?: string;
  organizationEn?: string;
};
type AgendaTranslationRoleUpdate = {
  titleEn?: string;
  organizationEn?: string;
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

function normalizeSpeakerText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function getUniqueSpeakers(item: AgendaTranslationItem) {
  const speakers = [...(item.speakers || [])];
  if (item.moderator) {
    speakers.push(item.moderator);
  }

  const seen = new Set<string>();
  return speakers.filter((speaker) => {
    if (seen.has(speaker.id)) {
      return false;
    }
    seen.add(speaker.id);
    return true;
  });
}

async function backfillAgendaSpeakerEnglish<T extends AgendaTranslationItem>(item: T) {
  const speakers = getUniqueSpeakers(item);
  if (speakers.length === 0) {
    return { changed: false, speakers: item.speakers, moderator: item.moderator };
  }

  const missingSpeakerFields: Record<string, string> = {};
  const missingRoleFields: Record<string, string> = {};

  speakers.forEach((speaker) => {
    if (!normalizeSpeakerText(speaker.nameEn) && normalizeSpeakerText(speaker.name)) {
      missingSpeakerFields[`speaker:${speaker.id}:nameEn`] = speaker.name;
    }
    if (!normalizeSpeakerText(speaker.titleEn) && normalizeSpeakerText(speaker.title)) {
      missingSpeakerFields[`speaker:${speaker.id}:titleEn`] = speaker.title!;
    }
    if (!normalizeSpeakerText(speaker.organizationEn) && normalizeSpeakerText(speaker.organization)) {
      missingSpeakerFields[`speaker:${speaker.id}:organizationEn`] = speaker.organization!;
    }

    (speaker.roles || []).forEach((role) => {
      if (!normalizeSpeakerText(role.titleEn) && normalizeSpeakerText(role.title)) {
        missingRoleFields[`role:${role.id}:titleEn`] = role.title!;
      }
      if (!normalizeSpeakerText(role.organizationEn) && normalizeSpeakerText(role.organization)) {
        missingRoleFields[`role:${role.id}:organizationEn`] = role.organization!;
      }
    });
  });

  const [translatedSpeakerFields, translatedRoleFields]: [Record<string, string>, Record<string, string>] = await Promise.all([
    Object.keys(missingSpeakerFields).length > 0
      ? translateRecordValuesToEnglish(missingSpeakerFields, {
          additionalGuidance:
            "If a value is a person's Chinese name, transliterate it into standard pinyin without tone marks. If it is already a proper English name, keep it natural and unchanged.",
        })
      : Promise.resolve<Record<string, string>>({}),
    Object.keys(missingRoleFields).length > 0
      ? translateRecordValuesToEnglish(missingRoleFields)
      : Promise.resolve<Record<string, string>>({}),
  ]);

  const speakerUpdates = new Map<string, AgendaTranslationSpeakerUpdate>();
  Object.entries(translatedSpeakerFields).forEach(([key, value]) => {
    const [, speakerId, field] = key.split(":");
    if (!speakerId || !field || !value?.trim()) {
      return;
    }
    speakerUpdates.set(speakerId, {
      ...(speakerUpdates.get(speakerId) || {}),
      [field]: value.trim(),
    });
  });

  const roleUpdates = new Map<string, AgendaTranslationRoleUpdate>();
  Object.entries(translatedRoleFields).forEach(([key, value]) => {
    const [, roleId, field] = key.split(":");
    if (!roleId || !field || !value?.trim()) {
      return;
    }
    roleUpdates.set(roleId, {
      ...(roleUpdates.get(roleId) || {}),
      [field]: value.trim(),
    });
  });

  const changed = speakerUpdates.size > 0 || roleUpdates.size > 0;
  if (!changed) {
    return { changed: false, speakers: item.speakers, moderator: item.moderator };
  }

  await Promise.all([
    ...Array.from(speakerUpdates.entries()).map(([speakerId, update]) =>
      prisma.speaker.update({
        where: { id: speakerId },
        data: update,
      })
    ),
    ...Array.from(roleUpdates.entries()).map(([roleId, update]) =>
      prisma.speakerRole.update({
        where: { id: roleId },
        data: update,
      })
    ),
  ]);

  const applyRoleUpdates = (roles?: AgendaTranslationSpeaker["roles"] | null) =>
    (roles || []).map((role) => ({
      ...role,
      ...(roleUpdates.get(role.id) || {}),
    }));

  const applySpeakerUpdates = (speaker?: AgendaTranslationSpeaker | null) =>
    speaker
      ? {
          ...speaker,
          ...(speakerUpdates.get(speaker.id) || {}),
          roles: applyRoleUpdates(speaker.roles),
        }
      : speaker;

  return {
    changed: true,
    speakers: item.speakers?.map((speaker) => applySpeakerUpdates(speaker) as AgendaTranslationSpeaker),
    moderator: applySpeakerUpdates(item.moderator as AgendaTranslationSpeaker | null) as T["moderator"],
  };
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

      const speakerBackfill = await backfillAgendaSpeakerEnglish(item);
      if (speakerBackfill.changed) {
        changed = true;
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
        speakers: speakerBackfill.speakers,
        moderator: speakerBackfill.moderator,
      };
    })
  );
}
