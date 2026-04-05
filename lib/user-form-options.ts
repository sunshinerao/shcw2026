export type FormLocale = "zh" | "en";

type LocalizedOption = {
  value: string;
  zh: string;
  en: string;
  zhOption: string;
  enOption: string;
};

const SALUTATION_OPTIONS: LocalizedOption[] = [
  { value: "Dr.", zh: "博士/医生", en: "Dr.", zhOption: "博士/医生（Dr.）", enOption: "Dr." },
  { value: "PhD", zh: "博士", en: "PhD", zhOption: "博士（PhD）", enOption: "PhD" },
  { value: "Mr.", zh: "先生", en: "Mr.", zhOption: "先生（Mr.）", enOption: "Mr." },
  { value: "Ms.", zh: "女士", en: "Ms.", zhOption: "女士（Ms.）", enOption: "Ms." },
  { value: "Mrs.", zh: "夫人", en: "Mrs.", zhOption: "夫人（Mrs.）", enOption: "Mrs." },
  { value: "Prof.", zh: "教授", en: "Prof.", zhOption: "教授（Prof.）", enOption: "Prof." },
];

const SALUTATION_ALIASES: Record<string, string> = Object.fromEntries(
  SALUTATION_OPTIONS.flatMap((option) => [
    [option.value, option.value],
    [option.zh, option.value],
    [option.en, option.value],
    [option.zhOption, option.value],
    [option.enOption, option.value],
  ])
);

const PHONE_AREA_BY_COUNTRY: Record<string, string> = {
  CN: "+86",
  US: "+1",
  CA: "+1",
  GB: "+44",
  JP: "+81",
  KR: "+82",
  DE: "+49",
  FR: "+33",
  AU: "+61",
  SG: "+65",
  HK: "+852",
  MO: "+853",
  TW: "+886",
  IN: "+91",
  AE: "+971",
  SA: "+966",
  RU: "+7",
  BR: "+55",
};

export function getLocalizedSalutationOptions(locale: FormLocale) {
  return SALUTATION_OPTIONS.map((option) => ({
    value: option.value,
    label: locale === "zh" ? option.zhOption : option.enOption,
  }));
}

export function normalizeSalutationValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  return SALUTATION_ALIASES[trimmed] || trimmed;
}

export function getLocalizedSalutationLabel(value: string | null | undefined, locale: FormLocale) {
  const normalized = normalizeSalutationValue(value);
  if (!normalized) {
    return "";
  }

  const matched = SALUTATION_OPTIONS.find((option) => option.value === normalized);
  if (!matched) {
    return normalized;
  }

  return locale === "zh" ? matched.zh : matched.en;
}

export function getPhoneAreaByCountry(countryCode: string | null | undefined) {
  if (!countryCode) {
    return "";
  }
  return PHONE_AREA_BY_COUNTRY[countryCode] || "";
}

export function splitPhoneNumber(phone: string | null | undefined) {
  const trimmed = (phone || "").trim();
  if (!trimmed) {
    return { phoneArea: "", phoneNumber: "" };
  }

  const matched = trimmed.match(/^(\+\d{1,4})(?:[\s-]+)?(.+)$/);
  if (!matched) {
    return { phoneArea: "", phoneNumber: trimmed };
  }

  return {
    phoneArea: matched[1],
    phoneNumber: matched[2].trim(),
  };
}

export function combinePhoneNumber(phoneArea: string, phoneNumber: string) {
  const normalizedNumber = phoneNumber.trim();
  const normalizedArea = phoneArea.trim();

  if (!normalizedNumber) {
    return null;
  }

  if (!normalizedArea) {
    return normalizedNumber;
  }

  return `${normalizedArea} ${normalizedNumber}`;
}