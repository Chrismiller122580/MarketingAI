import { getAngleInstruction, getAngleLabel, resolveContentAngle } from "./content-angles";
import type {
  ContentAngle,
  Platform,
  PostHistorySnapshot,
  SiteData,
  UniquenessReport,
} from "./types";

export type HistoryAnalysis = {
  usedPages: Set<string>;
  pageCounts: Map<string, number>;
  usedOpeners: string[];
  recentTexts: string[];
  platformCounts: Map<Platform, number>;
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);
}

export function extractOpener(text: string): string {
  const firstLine = text.split("\n").find((l) => l.trim().length > 0) ?? text;
  return firstLine.trim().slice(0, 80).toLowerCase();
}

export function analyzePostHistory(
  posts: PostHistorySnapshot[],
): HistoryAnalysis {
  const usedPages = new Set<string>();
  const pageCounts = new Map<string, number>();
  const usedOpeners: string[] = [];
  const recentTexts: string[] = [];
  const platformCounts = new Map<Platform, number>();

  for (const post of posts.slice(0, 40)) {
    if (post.sourcePage) {
      usedPages.add(post.sourcePage);
      pageCounts.set(
        post.sourcePage,
        (pageCounts.get(post.sourcePage) ?? 0) + 1,
      );
    }
    usedOpeners.push(extractOpener(post.text));
    recentTexts.push(post.text);
    platformCounts.set(
      post.platform,
      (platformCounts.get(post.platform) ?? 0) + 1,
    );
  }

  return { usedPages, pageCounts, usedOpeners, recentTexts, platformCounts };
}

function tokenOverlap(a: string, b: string): number {
  const tokensA = new Set(tokenize(a));
  const tokensB = tokenize(b);
  if (tokensA.size === 0 || tokensB.length === 0) return 0;
  let shared = 0;
  for (const t of tokensB) {
    if (tokensA.has(t)) shared++;
  }
  return shared / Math.max(tokensA.size, tokensB.length);
}

export function pickFreshAngle(
  posts: PostHistorySnapshot[],
  index = 0,
  preferred?: ContentAngle,
): ContentAngle {
  const history = analyzePostHistory(posts);
  const openerPatterns = history.usedOpeners;

  const angleUsage = new Map<ContentAngle, number>();
  for (const opener of openerPatterns) {
    if (opener.includes("?")) angleUsage.set("question-hook", (angleUsage.get("question-hook") ?? 0) + 1);
    if (/myth|wrong|think\b/.test(opener)) angleUsage.set("myth-buster", (angleUsage.get("myth-buster") ?? 0) + 1);
    if (/before|after|used to/.test(opener)) angleUsage.set("before-after", (angleUsage.get("before-after") ?? 0) + 1);
    if (/\d+%|\d+x|\d+\s/.test(opener)) angleUsage.set("stat-led", (angleUsage.get("stat-led") ?? 0) + 1);
    if (/how to|tip:|step/.test(opener)) angleUsage.set("how-to", (angleUsage.get("how-to") ?? 0) + 1);
  }

  const sortedByUsage = [...angleUsage.entries()].sort((a, b) => b[1] - a[1]);
  const overused = sortedByUsage
    .filter(([, count]) => count >= 2)
    .map(([angle]) => angle);

  return resolveContentAngle(preferred, index, overused);
}

export function buildUniquenessInstructions(
  posts: PostHistorySnapshot[],
  angle: ContentAngle,
  site?: SiteData,
): string {
  const history = analyzePostHistory(posts);
  const parts: string[] = [
    "Uniqueness rules: avoid generic marketing filler, clichés, and repeating prior posts.",
    "Do not reuse the same opening line or hook structure as recent content.",
  ];

  if (angle !== "auto") {
    const instruction = getAngleInstruction(angle);
    if (instruction) {
      parts.push(`Creative angle (${getAngleLabel(angle)}): ${instruction}`);
    }
  }

  if (history.usedOpeners.length > 0) {
    const samples = history.usedOpeners.slice(0, 4).map((o) => `"${o}"`);
    parts.push(`Do NOT echo these recent openers: ${samples.join(", ")}.`);
  }

  if (history.usedPages.size > 0 && site) {
    const overused = [...history.pageCounts.entries()]
      .filter(([, count]) => count >= 2)
      .map(([path]) => path)
      .slice(0, 4);
    if (overused.length > 0) {
      parts.push(
        `Pages already posted heavily — find a fresh angle if using: ${overused.join(", ")}.`,
      );
    }
  }

  const differentiators = site?.brand.businessModel?.differentiators ?? [];
  if (differentiators.length > 0) {
    parts.push(
      `Weave in a differentiator when natural: ${differentiators.slice(0, 2).join(", ")}.`,
    );
  }

  const themes =
    site?.brand.synthesis?.contentThemes ?? site?.brand.topics ?? [];
  if (themes.length > 0) {
    parts.push(
      `Prefer underused brand themes: ${themes.slice(0, 3).join(", ")}.`,
    );
  }

  return parts.join(" ");
}

export function scoreUniqueness(
  text: string,
  posts: PostHistorySnapshot[],
  sourcePage?: string,
  angle?: ContentAngle,
): UniquenessReport {
  const history = analyzePostHistory(posts);
  const tips: string[] = [];
  let score = 82;

  const opener = extractOpener(text);
  for (const used of history.usedOpeners) {
    if (used === opener) {
      score -= 28;
      tips.push("Opening line matches a recent post — try regenerating with a different angle.");
      break;
    }
    if (tokenOverlap(opener, used) > 0.55) {
      score -= 18;
      tips.push("Hook is very similar to something you've posted before.");
      break;
    }
  }

  for (const recent of history.recentTexts.slice(0, 8)) {
    const overlap = tokenOverlap(text, recent);
    if (overlap > 0.45) {
      score -= 22;
      tips.push("Caption overlaps heavily with your library — add a fresher angle or detail.");
      break;
    }
    if (overlap > 0.3) {
      score -= 10;
      tips.push("Some phrasing echoes prior posts — consider a bolder hook.");
      break;
    }
  }

  if (sourcePage && (history.pageCounts.get(sourcePage) ?? 0) >= 2) {
    score -= 12;
    tips.push(`"${sourcePage}" has been used often — rotate to a different page next time.`);
  }

  if (text.length < 80) {
    score -= 8;
    tips.push("Very short caption — add one specific detail to stand out.");
  }

  if (!/[?!]/.test(text.slice(0, 120)) && !/\d/.test(text.slice(0, 120))) {
    score -= 5;
    tips.push("Try a question, number, or bold statement in the first line.");
  }

  if (angle && angle !== "auto") {
    tips.push(`Creative angle: ${getAngleLabel(angle)}.`);
  }

  if (tips.length === 0) {
    tips.push("Strong originality — hook and phrasing look distinct from your library.");
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    tips,
    angle,
  };
}

export function suggestFreshAngles(
  site: SiteData,
  posts: PostHistorySnapshot[],
): { angle: ContentAngle; reason: string }[] {
  const history = analyzePostHistory(posts);
  const suggestions: { angle: ContentAngle; reason: string }[] = [];

  const underusedPage = site.pages.find(
    (p) => !history.usedPages.has(p.path),
  );
  if (underusedPage) {
    suggestions.push({
      angle: "how-to",
      reason: `Share a tip from "${underusedPage.title}" — never posted yet.`,
    });
  }

  const bm = site.brand.businessModel;
  if (bm?.painPoints.length) {
    suggestions.push({
      angle: "question-hook",
      reason: `Ask about "${bm.painPoints[0]}" — speaks to your audience's pain.`,
    });
  }
  if (bm?.differentiators.length) {
    suggestions.push({
      angle: "bold-claim",
      reason: `Lead with "${bm.differentiators[0]}" — your top differentiator.`,
    });
  }

  const themes =
    site.brand.synthesis?.contentThemes ?? site.brand.topics ?? [];
  if (themes.length > 0) {
    suggestions.push({
      angle: "story",
      reason: `Tell a micro-story around "${themes[0]}".`,
    });
  }

  suggestions.push({
    angle: "myth-buster",
    reason: "Challenge a common assumption in your industry.",
  });
  suggestions.push({
    angle: "contrarian",
    reason: "Take an unexpected stance to spark conversation.",
  });

  const seen = new Set<ContentAngle>();
  return suggestions.filter((s) => {
    if (seen.has(s.angle)) return false;
    seen.add(s.angle);
    return true;
  }).slice(0, 5);
}