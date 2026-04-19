export type SpeakerDisplayRole = {
  title?: string | null;
  titleEn?: string | null;
  organization?: string | null;
  organizationEn?: string | null;
  isCurrent?: boolean | null;
  order?: number | null;
};

export type SpeakerDisplayLike = {
  title?: string | null;
  titleEn?: string | null;
  organization?: string | null;
  organizationEn?: string | null;
  roles?: SpeakerDisplayRole[] | null;
};

export type SpeakerRoleDisplayMode = "primary" | "allCurrent";

function localize(locale: string, zh?: string | null, en?: string | null) {
  return locale === "en" ? en || zh || "" : zh || en || "";
}

export function getSpeakerCurrentRoles(speaker: SpeakerDisplayLike) {
  const roles = Array.isArray(speaker.roles) ? speaker.roles : [];
  const sortedRoles = [...roles].sort((left, right) => {
    const leftCurrent = left.isCurrent ? 1 : 0;
    const rightCurrent = right.isCurrent ? 1 : 0;
    if (leftCurrent !== rightCurrent) {
      return rightCurrent - leftCurrent;
    }

    const leftOrder = typeof left.order === "number" ? left.order : Number.MAX_SAFE_INTEGER;
    const rightOrder = typeof right.order === "number" ? right.order : Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder;
  });

  const currentRoles = sortedRoles.filter((role) => role.isCurrent);
  return currentRoles.length > 0 ? currentRoles : sortedRoles;
}

export function getSpeakerDisplayPairs(
  speaker: SpeakerDisplayLike,
  locale: string,
  mode: SpeakerRoleDisplayMode = "primary"
) {
  const fallback = [{
    title: localize(locale, speaker.title, speaker.titleEn),
    organization: localize(locale, speaker.organization, speaker.organizationEn),
  }].filter((pair) => pair.title || pair.organization);

  const roles = getSpeakerCurrentRoles(speaker)
    .map((role) => ({
      title: localize(locale, role.title, role.titleEn),
      organization: localize(locale, role.organization, role.organizationEn),
    }))
    .filter((pair) => pair.title || pair.organization);

  const selected = roles.length > 0 ? roles : fallback;
  if (mode === "primary") {
    return selected.slice(0, 1);
  }

  const seen = new Set<string>();
  return selected.filter((pair) => {
    const key = `${pair.title}__${pair.organization}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function getSpeakerDisplayTitle(
  speaker: SpeakerDisplayLike,
  locale: string,
  mode: SpeakerRoleDisplayMode = "primary"
) {
  const titles = getSpeakerDisplayPairs(speaker, locale, mode)
    .map((pair) => pair.title)
    .filter(Boolean);

  return Array.from(new Set(titles)).join(" / ");
}

export function getSpeakerDisplayOrganization(
  speaker: SpeakerDisplayLike,
  locale: string,
  mode: SpeakerRoleDisplayMode = "primary"
) {
  const organizations = getSpeakerDisplayPairs(speaker, locale, mode)
    .map((pair) => pair.organization)
    .filter(Boolean);

  return Array.from(new Set(organizations)).join(" / ");
}

export function getSpeakerDisplayMeta(
  speaker: SpeakerDisplayLike,
  locale: string,
  mode: SpeakerRoleDisplayMode = "primary"
) {
  return getSpeakerDisplayPairs(speaker, locale, mode)
    .map((pair) => [pair.title, pair.organization].filter(Boolean).join(" · "))
    .filter(Boolean)
    .join(" / ");
}
