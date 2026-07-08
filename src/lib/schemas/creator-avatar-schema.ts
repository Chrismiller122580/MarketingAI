import { z } from "zod";

export const creatorAvatarSchema = z.object({
  displayName: z.string().min(2).max(80),
  handle: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-zA-Z0-9_]+$/, "Handle must be alphanumeric or underscore"),
  gender: z.enum(["female", "male", "nonbinary"]),
  age: z.number().min(18).max(80),
  bodyType: z.number().min(0).max(100),
  height: z.string().min(1).max(40),
  faceShape: z.string().min(1).max(40),
  hair: z.string().min(1).max(120),
  location: z.string().min(2).max(120),
  neighborhoods: z.string().max(200).optional(),
  ageRangeShown: z.string().min(1).max(80),
  religion: z.string().min(1).max(80),
  socialClass: z.string().min(1).max(80),
  wardrobe: z.string().min(5).max(500),
  culturalNotes: z.string().min(1).max(500),
  personalityVoice: z.string().min(20).max(2000),
  sampleQuote: z.string().min(10).max(300),
});

export type CreatorAvatarForm = z.infer<typeof creatorAvatarSchema>;

/** Merges defaults so older saved personas missing new fields still validate. */
export function parseCreatorAvatar(persona: unknown) {
  const merged =
    typeof persona === "object" && persona !== null
      ? { ...defaultCreatorAvatarValues, ...persona }
      : defaultCreatorAvatarValues;
  return creatorAvatarSchema.safeParse(merged);
}

export const defaultCreatorAvatarValues: CreatorAvatarForm = {
  displayName: "Maria López",
  handle: "MariaFitnessBogota",
  gender: "female",
  age: 28,
  bodyType: 65,
  height: "5'6\"",
  faceShape: "Heart",
  hair: "Long wavy black with caramel highlights",
  location: "Bogotá, Colombia + Cape Coral, Florida",
  neighborhoods: "Upper-middle class • Zona T & El Retiro",
  ageRangeShown: "25-32 • Fitness mom vibe",
  religion: "Catholic (practicing) • Devout but modern",
  socialClass: "Upper Middle • College educated",
  wardrobe:
    "Modern athleisure — fitted performance tee, high-waist leggings, clean white trainers; polished fitness-lifestyle look.",
  culturalNotes: "Colombian + American dual influence • Loves arepas & CrossFit",
  personalityVoice:
    "Personality: Warm, confident, slightly sassy, loves family + health. Voice: Soft Colombian accent, energetic, trustworthy.",
  sampleQuote:
    "This protein has exactly 24g and zero fillers — my clients love it!",
};