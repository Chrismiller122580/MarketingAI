import { z } from "zod";

export const productFactsSchema = z.object({
  name: z.string().max(120).default(""),
  price: z.string().max(40).default(""),
  features: z.array(z.string().min(1).max(120)).max(12).default([]),
  location: z.string().max(120).optional(),
  hours: z.string().max(120).optional(),
  ingredients: z.array(z.string().min(1).max(80)).max(20).optional(),
});

export type ProductFactsForm = z.infer<typeof productFactsSchema>;

export const defaultProductFactsValues: ProductFactsForm = {
  name: "",
  price: "",
  features: [],
  location: undefined,
  hours: undefined,
  ingredients: [],
};

type FactsRecord = {
  name?: string | null;
  price?: string | null;
  features?: string[] | null;
  location?: string | null;
  hours?: string | null;
  ingredients?: string[] | null;
};

/** Coerce a DB row, partial form, or missing object into valid optional facts. */
export function factsFromRecord(row?: FactsRecord | null): ProductFactsForm {
  return {
    name: (row?.name ?? "").trim(),
    price: (row?.price ?? "").trim(),
    features: (row?.features ?? []).map((item) => item.trim()).filter(Boolean),
    location: row?.location?.trim() || undefined,
    hours: row?.hours?.trim() || undefined,
    ingredients: (row?.ingredients ?? [])
      .map((item) => item.trim())
      .filter(Boolean),
  };
}

/** True when the creator opted in to at least one citable fact. */
export function hasLockedProductFacts(
  facts?: ProductFactsForm | null,
): boolean {
  if (!facts) return false;
  if (facts.name.trim()) return true;
  if (facts.features.some((item) => item.trim())) return true;
  if (facts.location?.trim()) return true;
  if (facts.hours?.trim()) return true;
  if ((facts.ingredients ?? []).some((item) => item.trim())) return true;
  return false;
}

export function countLockedProductFacts(
  facts?: ProductFactsForm | null,
): number {
  if (!facts) return 0;
  return [
    facts.name,
    facts.price,
    facts.location,
    facts.hours,
    ...facts.features,
    ...(facts.ingredients ?? []),
  ].filter((item) => item?.trim()).length;
}
