import type { FieldOption } from "./avatar-option-presets";
import { makeOption, dedupeOptions } from "./avatar-option-presets";

export type NameRegion = "latam" | "us-south" | "miami" | "generic";
export type NameGender = "female" | "male" | "nonbinary";

export type GeneratedName = {
  full: string;
  first: string;
  last: string;
  handle: string;
  region: NameRegion;
};

const FIRST: Record<
  NameRegion,
  Record<"female" | "male" | "any", string[]>
> = {
  latam: {
    female: [
      "Camila",
      "Valentina",
      "Daniela",
      "Mariana",
      "Isabella",
      "Laura",
      "Sofía",
      "Natalia",
      "Carolina",
      "Juliana",
      "Gabriela",
      "Ana",
    ],
    male: [
      "Santiago",
      "Mateo",
      "Andrés",
      "Sebastián",
      "Felipe",
      "Nicolás",
      "Camilo",
      "Daniel",
      "Alejandro",
      "Juan",
      "Tomás",
      "Diego",
    ],
    any: ["Alex", "Andrea", "Nicolás", "Camila"],
  },
  "us-south": {
    female: [
      "Maya",
      "Chloe",
      "Grace",
      "Harper",
      "Ellie",
      "Quinn",
      "Reese",
      "Claire",
      "Lila",
      "Nora",
    ],
    male: [
      "Evan",
      "Miles",
      "Cole",
      "Grant",
      "Theo",
      "Hayes",
      "Brooks",
      "Jonah",
      "Caleb",
      "Wyatt",
    ],
    any: ["Jordan", "Avery", "Reese", "Quinn"],
  },
  miami: {
    female: [
      "Noa",
      "Luna",
      "Valeria",
      "Elena",
      "Paloma",
      "Mila",
      "Inez",
      "Catalina",
      "Aria",
    ],
    male: ["Diego", "Marco", "Leo", "Mateo", "Rafa", "Enzo", "Luca", "Santi"],
    any: ["Noa", "Luca", "Mila"],
  },
  generic: {
    female: ["Maya", "Elena", "Nora", "Ivy", "Sienna", "Ada"],
    male: ["Owen", "Leo", "Kai", "Nico", "Arlo", "Jude"],
    any: ["Rowan", "Sage", "Eden"],
  },
};

const LAST: Record<NameRegion, string[]> = {
  latam: [
    "Restrepo",
    "Gómez",
    "Herrera",
    "Castro",
    "Vargas",
    "Rincón",
    "Mejía",
    "Ortiz",
    "Peña",
    "Delgado",
    "Morales",
    "Rojas",
  ],
  "us-south": [
    "Harper",
    "Brooks",
    "Bennett",
    "Hayes",
    "Sullivan",
    "Reed",
    "Foster",
    "Walsh",
    "Keller",
  ],
  miami: ["Vega", "Santos", "Alvarez", "Cruz", "Mora", "Reyes", "Silva", "Navarro"],
  generic: ["Rivera", "Lane", "Cole", "Park", "West", "Shah"],
};

export function regionFromLocation(location: string): NameRegion {
  const loc = location.toLowerCase();
  if (
    /colombia|bogot|medell|cali|bucaramanga|latam|mexico|peru|chile|argentina|espa|cartagena|barranquilla/.test(
      loc,
    )
  ) {
    return "latam";
  }
  if (/miami|florida|hialeah|tampa|orlando/.test(loc)) return "miami";
  if (
    /texas|austin|nashville|atlanta|dallas|houston|carolina|georgia|tennessee/.test(
      loc,
    )
  ) {
    return "us-south";
  }
  return "generic";
}

export function regionLabel(region: NameRegion): string {
  switch (region) {
    case "latam":
      return "LatAm";
    case "us-south":
      return "US South";
    case "miami":
      return "Miami / FL";
    default:
      return "Global";
  }
}

export function slugName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 18);
}

export function handleFromName(full: string) {
  const parts = full.trim().split(/\s+/);
  const first = parts[0] ?? "creator";
  const last = parts[1] ?? "";
  return `${slugName(first)}${slugName(last).slice(0, 8)}`;
}

function pick<T>(list: T[], seed: number) {
  return list[Math.abs(seed) % list.length] as T;
}

export function generateNames(opts: {
  location: string;
  gender: NameGender;
  count?: number;
  salt?: number;
}): GeneratedName[] {
  const region = regionFromLocation(opts.location);
  const count = opts.count ?? 8;
  const genderKey = opts.gender === "nonbinary" ? "any" : opts.gender;
  const firsts = FIRST[region][genderKey];
  const lasts = LAST[region];
  const out: GeneratedName[] = [];
  const used = new Set<string>();
  let i = 0;
  const salt = opts.salt ?? Date.now();
  while (out.length < count && i < count * 12) {
    const first = pick(firsts, salt + i * 17 + out.length * 3);
    const last = pick(lasts, salt + i * 29 + 11);
    const full = `${first} ${last}`;
    i += 1;
    if (used.has(full)) continue;
    used.add(full);
    out.push({
      full,
      first,
      last,
      handle: handleFromName(full),
      region,
    });
  }
  return out;
}

/** Site-suggest options: location-aware names preferred over generic fillers. */
export function nameOptionsFromLocation(
  location: string,
  brandName?: string,
  gender: NameGender = "female",
): FieldOption[] {
  const generated = generateNames({
    location: location || brandName || "",
    gender,
    count: 8,
    salt: (location + (brandName ?? "")).length * 97 + 11,
  });
  const opts = generated.map((n, i) =>
    makeOption(n.full, n.full, "site", i < 2 ? "high" : "medium"),
  );
  if (brandName) {
    const brandFirst = brandName.split(/\s+/)[0] ?? "Brand";
    opts.unshift(
      makeOption(
        `${brandFirst} Creator`,
        `${brandFirst} Creator`,
        "industry",
        "low",
      ),
    );
  }
  return dedupeOptions(opts, 8);
}
