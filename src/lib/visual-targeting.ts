export type VisualScene =
  | "auto"
  | "people"
  | "team"
  | "portrait"
  | "business"
  | "product"
  | "landscape"
  | "ocean"
  | "nature"
  | "city"
  | "technology"
  | "food"
  | "abstract";

export type VisualDemographic =
  | "auto"
  | "young-adults"
  | "professionals"
  | "families"
  | "seniors"
  | "diverse"
  | "women"
  | "men";

export type VisualMood =
  | "auto"
  | "professional"
  | "energetic"
  | "calm"
  | "luxury"
  | "playful"
  | "inspiring"
  | "minimal";

export type VisualSetting =
  | "auto"
  | "indoor"
  | "outdoor"
  | "studio"
  | "office"
  | "home";

export type VisualTargeting = {
  scene: VisualScene;
  demographic: VisualDemographic;
  mood: VisualMood;
  setting: VisualSetting;
};

export const DEFAULT_VISUAL_TARGETING: VisualTargeting = {
  scene: "auto",
  demographic: "auto",
  mood: "auto",
  setting: "auto",
};

type Option<T extends string> = { value: T; label: string; hint?: string };

export const VISUAL_SCENE_OPTIONS: Option<VisualScene>[] = [
  { value: "auto", label: "Auto", hint: "AI picks best fit" },
  { value: "people", label: "People", hint: "Individuals in focus" },
  { value: "team", label: "Team", hint: "Groups collaborating" },
  { value: "portrait", label: "Portrait", hint: "Close-up person" },
  { value: "business", label: "Business", hint: "Corporate / B2B" },
  { value: "product", label: "Product", hint: "Hero product shot" },
  { value: "landscape", label: "Landscape", hint: "Wide scenic views" },
  { value: "ocean", label: "Ocean", hint: "Coastal / water" },
  { value: "nature", label: "Nature", hint: "Forests, mountains" },
  { value: "city", label: "City", hint: "Urban skyline / streets" },
  { value: "technology", label: "Tech", hint: "Devices, innovation" },
  { value: "food", label: "Food", hint: "Culinary / dining" },
  { value: "abstract", label: "Abstract", hint: "Shapes, gradients" },
];

export const VISUAL_DEMOGRAPHIC_OPTIONS: Option<VisualDemographic>[] = [
  { value: "auto", label: "Auto" },
  { value: "young-adults", label: "Young adults", hint: "18–34" },
  { value: "professionals", label: "Professionals", hint: "35–54" },
  { value: "families", label: "Families", hint: "Parents & kids" },
  { value: "seniors", label: "Seniors", hint: "55+" },
  { value: "diverse", label: "Diverse", hint: "Inclusive mix" },
  { value: "women", label: "Women-led", hint: "Women in focus" },
  { value: "men", label: "Men-led", hint: "Men in focus" },
];

export const VISUAL_MOOD_OPTIONS: Option<VisualMood>[] = [
  { value: "auto", label: "Auto" },
  { value: "professional", label: "Professional" },
  { value: "energetic", label: "Energetic" },
  { value: "calm", label: "Calm" },
  { value: "luxury", label: "Luxury" },
  { value: "playful", label: "Playful" },
  { value: "inspiring", label: "Inspiring" },
  { value: "minimal", label: "Minimal" },
];

export const VISUAL_SETTING_OPTIONS: Option<VisualSetting>[] = [
  { value: "auto", label: "Auto" },
  { value: "indoor", label: "Indoor" },
  { value: "outdoor", label: "Outdoor" },
  { value: "studio", label: "Studio" },
  { value: "office", label: "Office" },
  { value: "home", label: "Home" },
];

const SCENE_PROMPTS: Record<VisualScene, string | null> = {
  auto: null,
  people: "Feature real people as the primary subject, natural poses, authentic expressions.",
  team: "Show a diverse team collaborating, workplace or casual group dynamic.",
  portrait: "Tight portrait framing on a single person, shallow depth of field.",
  business: "Corporate business context, polished and trustworthy B2B aesthetic.",
  product: "Hero product photography, clean composition, product is the star.",
  landscape: "Expansive landscape scenery, wide cinematic framing.",
  ocean: "Ocean, beach, or coastal water scenes with natural light.",
  nature: "Natural environment — forests, mountains, greenery, organic textures.",
  city: "Urban cityscape or street scene, modern metropolitan energy.",
  technology: "Technology-forward visuals — devices, screens, innovation motifs.",
  food: "Appetizing food photography, warm lighting, culinary presentation.",
  abstract: "Abstract graphic composition, bold shapes and brand colors.",
};

const DEMOGRAPHIC_PROMPTS: Record<VisualDemographic, string | null> = {
  auto: null,
  "young-adults": "Cast young adults aged 18–34, contemporary style.",
  professionals: "Cast working professionals aged 35–54, confident and capable.",
  families: "Feature families with parents and children, warm relatable moments.",
  seniors: "Feature active seniors aged 55+, dignified and approachable.",
  diverse: "Inclusive diverse representation across ethnicity, age, and ability.",
  women: "Women as primary subjects, empowering and authentic.",
  men: "Men as primary subjects, authentic and relatable.",
};

const MOOD_PROMPTS: Record<VisualMood, string | null> = {
  auto: null,
  professional: "Professional, clean, trustworthy mood.",
  energetic: "High energy, dynamic movement, vibrant pacing.",
  calm: "Calm, serene, soothing atmosphere.",
  luxury: "Premium luxury feel, refined lighting and composition.",
  playful: "Playful, fun, lighthearted tone.",
  inspiring: "Uplifting, aspirational, motivational feel.",
  minimal: "Minimalist aesthetic, lots of negative space, simple palette.",
};

const SETTING_PROMPTS: Record<VisualSetting, string | null> = {
  auto: null,
  indoor: "Indoor environment with controlled lighting.",
  outdoor: "Outdoor natural daylight setting.",
  studio: "Studio setup with professional lighting and clean backdrop.",
  office: "Modern office or workspace environment.",
  home: "Comfortable home or lifestyle interior setting.",
};

export function hasActiveVisualTargeting(targeting?: VisualTargeting | null): boolean {
  if (!targeting) return false;
  return (
    targeting.scene !== "auto" ||
    targeting.demographic !== "auto" ||
    targeting.mood !== "auto" ||
    targeting.setting !== "auto"
  );
}

export function describeVisualTargeting(targeting?: VisualTargeting | null): string[] {
  if (!targeting || !hasActiveVisualTargeting(targeting)) return [];

  const labels: string[] = [];
  const scene = VISUAL_SCENE_OPTIONS.find((o) => o.value === targeting.scene);
  const demo = VISUAL_DEMOGRAPHIC_OPTIONS.find((o) => o.value === targeting.demographic);
  const mood = VISUAL_MOOD_OPTIONS.find((o) => o.value === targeting.mood);
  const setting = VISUAL_SETTING_OPTIONS.find((o) => o.value === targeting.setting);

  if (targeting.scene !== "auto" && scene) labels.push(scene.label);
  if (targeting.demographic !== "auto" && demo) labels.push(demo.label);
  if (targeting.mood !== "auto" && mood) labels.push(mood.label);
  if (targeting.setting !== "auto" && setting) labels.push(setting.label);

  return labels;
}

export function enrichVisualPrompt(
  basePrompt: string,
  targeting?: VisualTargeting | null,
  medium: "image" | "video" = "image",
): string {
  if (!targeting || !hasActiveVisualTargeting(targeting)) return basePrompt;

  const fragments = [
    SCENE_PROMPTS[targeting.scene],
    DEMOGRAPHIC_PROMPTS[targeting.demographic],
    MOOD_PROMPTS[targeting.mood],
    SETTING_PROMPTS[targeting.setting],
  ].filter(Boolean);

  if (fragments.length === 0) return basePrompt;

  const mediumNote =
    medium === "video"
      ? "Ensure subjects and scenery work for short-form video with smooth motion."
      : "Compose as a single high-impact still frame.";

  return `${basePrompt} Visual direction: ${fragments.join(" ")} ${mediumNote}`;
}