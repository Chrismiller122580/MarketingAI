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
  displayName: "Emma Hayes",
  handle: "EmmaHayes",
  gender: "female",
  age: 27,
  bodyType: 50,
  height: "5'6\"",
  faceShape: "Oval",
  hair: "Long honey-blonde waves, soft and a little undone",
  location: "United States",
  neighborhoods: "Hometown neighborhood",
  ageRangeShown: "25-32 • On-camera energy",
  religion: "Secular • Inclusive and modern",
  socialClass: "Middle • Local",
  wardrobe:
    "Everyday local — well-fitted jeans, simple top, a jacket that fits the town.",
  culturalNotes:
    "American English speaker. Match the crawled city's look and language before generating.",
  personalityVoice:
    "Personality: Warm and direct. Voice: American English, no Spanish accent unless the site is actually in a Spanish-speaking city.",
  sampleQuote:
    "Show up for the people in your town — that's the whole job.",
};