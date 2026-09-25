export type AvatarLanguage = {
  code: string;
  label: string;
};

/** Codes ElevenLabs can lock with a language-aware model. */
export const AVATAR_LANGUAGES: AvatarLanguage[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "pt", label: "Portuguese" },
  { code: "de", label: "German" },
  { code: "it", label: "Italian" },
  { code: "tl", label: "Filipino" },
  { code: "hi", label: "Hindi" },
  { code: "ar", label: "Arabic" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "zh", label: "Chinese" },
  { code: "vi", label: "Vietnamese" },
  { code: "id", label: "Indonesian" },
  { code: "nl", label: "Dutch" },
  { code: "tr", label: "Turkish" },
  { code: "pl", label: "Polish" },
  { code: "sv", label: "Swedish" },
  { code: "th", label: "Thai" },
  { code: "ru", label: "Russian" },
];

const CODES = new Set(AVATAR_LANGUAGES.map((item) => item.code));

const PLACE_LANGUAGE: Array<[RegExp, string]> = [
  [/manila|philippines|cebu|quezon|davao/, "tl"],
  [/bogot|colombia|mexico|madrid|spain|barcelona|buenos aires|argentina|lima|peru|santiago|chile|mexico city/, "es"],
  [/paris|france|lyon|montreal/, "fr"],
  [/berlin|germany|munich|vienna|austria|zurich/, "de"],
  [/rome|italy|milan|naples/, "it"],
  [/lisbon|portugal|brazil|são paulo|sao paulo|rio de janeiro/, "pt"],
  [/tokyo|japan|osaka|kyoto/, "ja"],
  [/seoul|korea/, "ko"],
  [/beijing|shanghai|china|taipei|taiwan|hong kong/, "zh"],
  [/mumbai|delhi|india|bangalore|bengaluru/, "hi"],
  [/cairo|egypt|dubai|riyadh|saudi|morocco|casablanca/, "ar"],
  [/jakarta|indonesia|bali/, "id"],
  [/hanoi|vietnam|saigon|ho chi minh/, "vi"],
  [/bangkok|thailand/, "th"],
  [/amsterdam|netherlands/, "nl"],
  [/istanbul|turkey|ankara/, "tr"],
  [/warsaw|poland|krakow|kraków/, "pl"],
  [/stockholm|sweden|gothenburg/, "sv"],
  [/moscow|russia/, "ru"],
];

const TLD_LANGUAGE: Record<string, string> = {
  es: "es",
  mx: "es",
  ar: "es",
  cl: "es",
  co: "es",
  pe: "es",
  fr: "fr",
  de: "de",
  at: "de",
  it: "it",
  pt: "pt",
  br: "pt",
  jp: "ja",
  kr: "ko",
  cn: "zh",
  tw: "zh",
  ph: "tl",
  in: "hi",
  id: "id",
  vn: "vi",
  th: "th",
  nl: "nl",
  tr: "tr",
  pl: "pl",
  se: "sv",
  ru: "ru",
  sa: "ar",
  ae: "ar",
  eg: "ar",
};

const TEXT_LANGUAGE: Array<[RegExp, string]> = [
  [/\b(el|la|los|las|que|para|con|una|por)\b/i, "es"],
  [/\b(le|la|les|des|une|pour|avec|dans)\b/i, "fr"],
  [/\b(und|der|die|das|nicht|ein)\b/i, "de"],
  [/\b(não|nao|você|voce|para|com|uma)\b/i, "pt"],
  [/\b(ang|mga|nang|sa|ito|iyan)\b/i, "tl"],
];

export function normalizeAvatarLanguage(value: unknown): string {
  if (typeof value !== "string") return "en";
  const code = value.trim().toLowerCase().slice(0, 8);
  return CODES.has(code) ? code : "en";
}

export function avatarLanguageLabel(code: string): string {
  return (
    AVATAR_LANGUAGES.find((item) => item.code === normalizeAvatarLanguage(code))
      ?.label ?? "English"
  );
}

export function suggestLanguageFromPlace(place: string): string | null {
  const text = place.toLowerCase();
  if (!text.trim()) return null;
  for (const [pattern, code] of PLACE_LANGUAGE) {
    if (pattern.test(text)) return code;
  }
  return null;
}

export function suggestLanguageFromSite(input: {
  domain?: string;
  text?: string;
}): string | null {
  const host = (input.domain ?? "").toLowerCase().replace(/^www\./, "");
  const tld = host.split(".").pop() ?? "";
  if (TLD_LANGUAGE[tld]) return TLD_LANGUAGE[tld];
  const text = input.text ?? "";
  if (text.trim().length < 12) return null;
  for (const [pattern, code] of TEXT_LANGUAGE) {
    if (pattern.test(text)) return code;
  }
  return null;
}

/** Multilingual v2 ignores language_code. Turbo v2.5 honors it. */
export function speechModelForLanguage(code: string): {
  modelId: string;
  languageCode?: string;
} {
  const language = normalizeAvatarLanguage(code);
  if (language === "en") return { modelId: "eleven_multilingual_v2" };
  return { modelId: "eleven_turbo_v2_5", languageCode: language };
}
