import type { ContentAngle } from "./types";

export type ContentAngleOption = {
  value: ContentAngle;
  label: string;
  hint: string;
  promptInstruction: string;
};

export const CONTENT_ANGLE_OPTIONS: ContentAngleOption[] = [
  {
    value: "auto",
    label: "Auto",
    hint: "AI picks the freshest angle for your library",
    promptInstruction: "",
  },
  {
    value: "question-hook",
    label: "Question hook",
    hint: "Open with a provocative question that stops the scroll",
    promptInstruction:
      "Open with a specific, curiosity-driving question. Make the reader feel the question is about them.",
  },
  {
    value: "bold-claim",
    label: "Bold claim",
    hint: "Lead with a confident, memorable statement",
    promptInstruction:
      "Lead with one bold, specific claim — not generic hype. Back it up in the next line.",
  },
  {
    value: "story",
    label: "Mini story",
    hint: "A short narrative moment or customer vignette",
    promptInstruction:
      "Use a 2–3 sentence micro-story or scene. Show a moment of change, not a feature list.",
  },
  {
    value: "myth-buster",
    label: "Myth buster",
    hint: "Challenge a common misconception in your space",
    promptInstruction:
      'Name a common myth in this industry, then flip it with a concrete truth from the brand.',
  },
  {
    value: "before-after",
    label: "Before / after",
    hint: "Contrast the old way vs. the better way",
    promptInstruction:
      "Contrast life before vs. after using this solution. Be vivid and specific, not abstract.",
  },
  {
    value: "stat-led",
    label: "Stat-led",
    hint: "Anchor the post with a number or concrete result",
    promptInstruction:
      "Lead with a number, timeframe, or measurable outcome. If no stat exists, use a credible estimate framed honestly.",
  },
  {
    value: "contrarian",
    label: "Contrarian",
    hint: "Take an unexpected stance that sparks debate",
    promptInstruction:
      "Take a thoughtful contrarian angle — challenge conventional wisdom without being cynical.",
  },
  {
    value: "how-to",
    label: "How-to tip",
    hint: "One actionable tip the audience can use today",
    promptInstruction:
      "Share one actionable tip in plain steps. Make it immediately useful without needing the product first.",
  },
  {
    value: "social-proof",
    label: "Social proof",
    hint: "Highlight trust, results, or who it's for",
    promptInstruction:
      "Lead with who this is for or what outcome peers achieve. Use specificity over vague praise.",
  },
];

const ANGLE_ROTATION: ContentAngle[] = [
  "question-hook",
  "bold-claim",
  "story",
  "myth-buster",
  "before-after",
  "stat-led",
  "contrarian",
  "how-to",
  "social-proof",
];

export function getAngleOption(angle: ContentAngle): ContentAngleOption {
  return (
    CONTENT_ANGLE_OPTIONS.find((o) => o.value === angle) ??
    CONTENT_ANGLE_OPTIONS[0]
  );
}

export function getAngleInstruction(angle: ContentAngle): string {
  return getAngleOption(angle).promptInstruction;
}

export function getAngleLabel(angle: ContentAngle): string {
  return getAngleOption(angle).label;
}

export function resolveContentAngle(
  preferred: ContentAngle | undefined,
  index = 0,
  usedAngles: ContentAngle[] = [],
): ContentAngle {
  if (preferred && preferred !== "auto") return preferred;

  const used = new Set(
    usedAngles.filter((a): a is (typeof ANGLE_ROTATION)[number] => a !== "auto"),
  );
  for (let i = 0; i < ANGLE_ROTATION.length; i++) {
    const candidate = ANGLE_ROTATION[(index + i) % ANGLE_ROTATION.length];
    if (!used.has(candidate)) return candidate;
  }
  return ANGLE_ROTATION[index % ANGLE_ROTATION.length];
}