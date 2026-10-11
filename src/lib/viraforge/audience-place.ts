import type { NameGender, NameRegion } from "./avatar-name-generator";
import { regionFromLocation } from "./avatar-name-generator";

export type AudienceKind = "us-south" | "us" | "latam" | "miami";

export type AudiencePlace = {
  label: string;
  kind: AudienceKind;
  language: "en" | "es";
};

const SOUTH_CITIES: Array<[RegExp, string]> = [
  [/chattanooga\b/, "Chattanooga, Tennessee"],
  [/nashville\b/, "Nashville, Tennessee"],
  [/knoxville\b/, "Knoxville, Tennessee"],
  [/memphis\b/, "Memphis, Tennessee"],
  [/murfreesboro\b/, "Murfreesboro, Tennessee"],
  [/atlanta\b/, "Atlanta, Georgia"],
  [/savannah\b/, "Savannah, Georgia"],
  [/augusta\b/, "Augusta, Georgia"],
  [/birmingham\b/, "Birmingham, Alabama"],
  [/huntsville\b/, "Huntsville, Alabama"],
  [/\bmobile\b/, "Mobile, Alabama"],
  [/charleston\b/, "Charleston, South Carolina"],
  [/greenville\b/, "Greenville, South Carolina"],
  [/\bcolumbia\b/, "Columbia, South Carolina"],
  [/charlotte\b/, "Charlotte, North Carolina"],
  [/raleigh\b/, "Raleigh, North Carolina"],
  [/asheville\b/, "Asheville, North Carolina"],
  [/louisville\b/, "Louisville, Kentucky"],
  [/lexington\b/, "Lexington, Kentucky"],
  [/jackson,\s*mississippi|jackson,\s*ms\b/, "Jackson, Mississippi"],
  [/new orleans/, "New Orleans, Louisiana"],
  [/baton rouge/, "Baton Rouge, Louisiana"],
  [/little rock/, "Little Rock, Arkansas"],
  [/dallas\b/, "Dallas, Texas"],
  [/houston\b/, "Houston, Texas"],
  [/\baustin\b/, "Austin, Texas"],
];

const US_CITIES: Array<[RegExp, string]> = [
  [/new york/, "New York, NY"],
  [/los angeles/, "Los Angeles, California"],
  [/chicago/, "Chicago, Illinois"],
  [/denver/, "Denver, Colorado"],
  [/seattle/, "Seattle, Washington"],
  [/boston/, "Boston, Massachusetts"],
  [/phoenix/, "Phoenix, Arizona"],
];

const LATAM_CITIES: Array<[RegExp, string]> = [
  [/bucaramanga/, "Bucaramanga, Colombia"],
  [/bogot/, "Bogotá, Colombia"],
  [/medell[ií]n/, "Medellín, Colombia"],
  [/cartagena/, "Cartagena, Colombia"],
  [/barranquilla/, "Barranquilla, Colombia"],
  [/mexico city|ciudad de m[eé]xico/, "Mexico City, Mexico"],
  [/\blima\b/, "Lima, Peru"],
  [/buenos aires/, "Buenos Aires, Argentina"],
  [/santiago/, "Santiago, Chile"],
  [/\bcolombia\b/, "Colombia"],
  [/\bm[eé]xico\b|\bmexico\b/, "Mexico"],
];

const STATE_NAME: Record<string, { name: string; kind: AudienceKind }> = {
  TN: { name: "Tennessee", kind: "us-south" },
  TENNESSEE: { name: "Tennessee", kind: "us-south" },
  GA: { name: "Georgia", kind: "us-south" },
  GEORGIA: { name: "Georgia", kind: "us-south" },
  AL: { name: "Alabama", kind: "us-south" },
  ALABAMA: { name: "Alabama", kind: "us-south" },
  SC: { name: "South Carolina", kind: "us-south" },
  "SOUTH CAROLINA": { name: "South Carolina", kind: "us-south" },
  NC: { name: "North Carolina", kind: "us-south" },
  "NORTH CAROLINA": { name: "North Carolina", kind: "us-south" },
  KY: { name: "Kentucky", kind: "us-south" },
  KENTUCKY: { name: "Kentucky", kind: "us-south" },
  MS: { name: "Mississippi", kind: "us-south" },
  MISSISSIPPI: { name: "Mississippi", kind: "us-south" },
  LA: { name: "Louisiana", kind: "us-south" },
  LOUISIANA: { name: "Louisiana", kind: "us-south" },
  AR: { name: "Arkansas", kind: "us-south" },
  ARKANSAS: { name: "Arkansas", kind: "us-south" },
  TX: { name: "Texas", kind: "us-south" },
  TEXAS: { name: "Texas", kind: "us-south" },
  FL: { name: "Florida", kind: "miami" },
  FLORIDA: { name: "Florida", kind: "miami" },
  NY: { name: "New York", kind: "us" },
  CA: { name: "California", kind: "us" },
  CALIFORNIA: { name: "California", kind: "us" },
  IL: { name: "Illinois", kind: "us" },
  ILLINOIS: { name: "Illinois", kind: "us" },
  CO: { name: "Colorado", kind: "us" },
  COLORADO: { name: "Colorado", kind: "us" },
  WA: { name: "Washington", kind: "us" },
  WASHINGTON: { name: "Washington", kind: "us" },
  MA: { name: "Massachusetts", kind: "us" },
  OH: { name: "Ohio", kind: "us" },
  OHIO: { name: "Ohio", kind: "us" },
  MI: { name: "Michigan", kind: "us" },
  MICHIGAN: { name: "Michigan", kind: "us" },
  PA: { name: "Pennsylvania", kind: "us" },
  PENNSYLVANIA: { name: "Pennsylvania", kind: "us" },
};

const SPANISH_STRONG =
  /\b(usted|ustedes|gracias|hola|bienvenid[oa]s?|necesitas|confianza|p[aá]gina|servicios|nosotros|nosotras|tambi[eé]n|est[aá]s|d[oó]nde|cu[aá]nto|ni[nñ]os|se[nñ]ora)\b/gi;

function kindFromRegion(region: NameRegion): AudienceKind | null {
  if (region === "generic") return null;
  return region;
}

/** City and state written on the site, before any default persona. */
export function inferAudiencePlace(corpus: string): AudiencePlace | null {
  const text = corpus.replace(/\s+/g, " ");
  const lower = text.toLowerCase();

  for (const [pattern, label] of SOUTH_CITIES) {
    if (pattern.test(lower)) {
      return { label, kind: "us-south", language: "en" };
    }
  }

  for (const [pattern, label] of LATAM_CITIES) {
    if (pattern.test(lower)) {
      return { label, kind: "latam", language: "es" };
    }
  }

  if (/miami|hialeah/.test(lower)) {
    return { label: "Miami, Florida", kind: "miami", language: "en" };
  }

  const cityState = text.match(
    /\b([A-Z][a-zA-Z.'-]+(?:\s+[A-Z][a-zA-Z.'-]+){0,2}),\s*(Tennessee|TN|Georgia|GA|Alabama|AL|South Carolina|SC|North Carolina|NC|Kentucky|KY|Mississippi|MS|Louisiana|LA|Arkansas|AR|Texas|TX|Florida|FL|New York|NY|California|CA|Illinois|IL|Ohio|OH|Colorado|CO|Washington|WA|Massachusetts|MA|Michigan|MI|Pennsylvania|PA)\b/,
  );
  if (cityState) {
    const state = STATE_NAME[cityState[2].toUpperCase()];
    if (state) {
      const label = `${cityState[1]}, ${state.name}`;
      return {
        label,
        kind: state.kind,
        language: state.kind === "latam" ? "es" : "en",
      };
    }
  }

  for (const [pattern, label] of US_CITIES) {
    if (pattern.test(lower)) {
      return { label, kind: "us", language: "en" };
    }
  }

  if (
    /\b(tennessee|georgia|alabama|south carolina|north carolina|kentucky|mississippi|louisiana|arkansas|texas)\b/.test(
      lower,
    )
  ) {
    const state = lower.match(
      /\b(tennessee|georgia|alabama|south carolina|north carolina|kentucky|mississippi|louisiana|arkansas|texas)\b/,
    );
    const label = state?.[1]
      ? state[1].replace(/\b\w/g, (letter) => letter.toUpperCase())
      : "the South";
    return { label, kind: "us-south", language: "en" };
  }

  return null;
}

export function audienceKindForLocation(location: string): AudienceKind | null {
  const inferred = inferAudiencePlace(location);
  if (inferred) return inferred.kind;
  return kindFromRegion(regionFromLocation(location));
}

export function languageForPlace(location: string): "en" | "es" {
  const inferred = inferAudiencePlace(location);
  if (inferred) return inferred.language;
  const region = regionFromLocation(location);
  if (region === "latam") return "es";
  return "en";
}

/** Real Spanish copy, not an English page that happens to contain "la" or "con". */
export function spanishEvidence(text: string): number {
  return new Set((text.match(SPANISH_STRONG) ?? []).map((word) => word.toLowerCase()))
    .size;
}

export type AudienceLook = {
  hair: Array<{ label: string; value: string }>;
  culturalNotes: string;
  personalityVoice: string;
  wardrobe: string;
  neighborhoods: string;
  portraitCue: string;
};

export function lookForAudience(
  kind: AudienceKind | null,
  gender: NameGender,
  placeLabel: string,
): AudienceLook | null {
  const place = placeLabel.trim() || "their city";
  const woman = gender !== "male";

  if (kind === "us-south") {
    return woman
      ? {
          hair: [
            {
              label: "Honey-blonde waves",
              value: "Long honey-blonde waves, soft and a little undone",
            },
            {
              label: "Light brown with sun",
              value: "Light brown hair with sunlit highlights, worn down",
            },
            {
              label: "Dirty blonde layers",
              value: "Shoulder-length dirty blonde layers",
            },
          ],
          culturalNotes: `Country Southern girl from ${place}. Fair complexion, hometown American look. English only, soft Southern cadence.`,
          personalityVoice: `Personality: Warm, direct, a little country, proud of ${place}. Voice: Soft Southern American English. No Spanish and no Colombian accent.`,
          wardrobe:
            "Country casual — denim jacket or sundress, boots, simple jewelry, weekend-in-town look.",
          neighborhoods: `Hometown • ${place} neighborhoods she actually knows`,
          portraitCue: `White Southern American woman from ${place}, country-girl look, fair complexion, natural makeup, honey or light-brown hair. She speaks English with a Southern cadence. Do not depict a Black woman, a Latina, an Afro-Latina, or a Spanish-speaking woman.`,
        }
      : {
          hair: [
            { label: "Short brown", value: "Short textured brown hair" },
            { label: "Light brown crop", value: "Cropped light brown hair" },
            { label: "Sandy blonde", value: "Short sandy blonde hair" },
          ],
          culturalNotes: `Southern man from ${place}. Fair to light complexion. English only, easy Southern cadence.`,
          personalityVoice: `Personality: Steady, neighborly, proud of ${place}. Voice: Southern American English. No Spanish.`,
          wardrobe:
            "Country casual — button-down or henley, jeans, boots, clean hometown look.",
          neighborhoods: `Hometown • ${place}`,
          portraitCue: `White Southern American man from ${place}, country look, fair to light complexion. English speaker. Do not depict a Spanish-speaking or Latino man.`,
        };
  }

  if (kind === "us" || kind === "miami") {
    return woman
      ? {
          hair: [
            { label: "Light brown waves", value: "Long light-brown waves" },
            { label: "Auburn layers", value: "Auburn shoulder-length layers" },
            { label: "Honey highlights", value: "Brown hair with honey highlights" },
          ],
          culturalNotes: `Local American woman from ${place}. English speaker. Looks like the neighborhood, not a default from another country.`,
          personalityVoice: `Personality: Friendly and specific to ${place}. Voice: American English. No Spanish accent unless she is actually from a Spanish-speaking city.`,
          wardrobe:
            "Everyday local — well-fitted jeans, simple top, jacket that fits the weather in town.",
          neighborhoods: `Local • ${place}`,
          portraitCue: `American woman who looks local to ${place}. English speaker. Do not default to a Spanish-speaking Latina or a Colombian woman.`,
        }
      : {
          hair: [
            { label: "Short brown", value: "Short brown hair" },
            { label: "Textured crop", value: "Textured brown crop" },
          ],
          culturalNotes: `Local American man from ${place}. English speaker.`,
          personalityVoice: `Personality: Straightforward and local to ${place}. Voice: American English.`,
          wardrobe: "Everyday local — henley or button-down, jeans, clean shoes.",
          neighborhoods: `Local • ${place}`,
          portraitCue: `American man who looks local to ${place}. English speaker. Do not default to a Spanish-speaking man.`,
        };
  }

  if (kind === "latam") {
    return woman
      ? {
          hair: [
            {
              label: "Dark waves",
              value: "Long dark-brown waves with a little caramel",
            },
            { label: "Black waves", value: "Long wavy black hair" },
          ],
          culturalNotes: `Local woman from ${place}. Speaks the language of that city.`,
          personalityVoice: `Personality: Warm and local to ${place}. Voice: Natural to ${place}, not an American Southern accent.`,
          wardrobe: "Polished local casual that fits the climate and the city.",
          neighborhoods: `Local • ${place}`,
          portraitCue: `Woman who looks local to ${place}. Match that city's look and language. Do not turn a Latin American city into a US Southern blonde.`,
        }
      : {
          hair: [
            { label: "Short dark", value: "Short dark hair" },
            { label: "Textured black", value: "Short textured black hair" },
          ],
          culturalNotes: `Local man from ${place}. Speaks the language of that city.`,
          personalityVoice: `Personality: Warm and local to ${place}. Voice: Natural to ${place}.`,
          wardrobe: "Polished local casual that fits the climate and the city.",
          neighborhoods: `Local • ${place}`,
          portraitCue: `Man who looks local to ${place}. Match that city's look and language.`,
        };
  }

  return null;
}

export function portraitCueForLocation(
  location: string,
  gender: NameGender,
): string {
  const place = inferAudiencePlace(location);
  const kind = place?.kind ?? audienceKindForLocation(location);
  const look = lookForAudience(kind, gender, place?.label || location);
  if (look) return look.portraitCue;
  if (/\b(united states|u\.s\.|usa)\b/i.test(location)) {
    return "American English speaker who looks local to the United States. Do not default to a Spanish-speaking Latina or a Colombian woman.";
  }
  return "";
}
