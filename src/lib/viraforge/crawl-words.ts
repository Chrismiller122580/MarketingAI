export type CrawlConcept = {
  domain: string;
  name: string;
  line: string;
  tagline: string;
  valueProposition: string;
  keywords: string[];
  topics: string[];
  pillars: string[];
  themes: string[];
  audience: string;
  avoid: string[];
  headings: string[];
  excerpt: string;
};

export type CrawlWordPack = {
  concept: string;
  words: string[];
  lines: string[];
};

function clean(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").replace(/^["']|["']$/g, "").trim();
}

function wordsOf(value: string): string[] {
  return clean(value).split(" ").filter(Boolean);
}

function clipWords(value: string, max = 24): string {
  return wordsOf(value).slice(0, max).join(" ");
}

function asSentence(value: string): string {
  const text = clean(value);
  if (!text) return "";
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function unique(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const text = clean(item);
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

function rotate<T>(items: T[], seed: number): T[] {
  if (items.length < 2) return items;
  const start = Math.abs(seed) % items.length;
  return [...items.slice(start), ...items.slice(0, start)];
}

function blocked(text: string, avoid: string[]): boolean {
  const hay = text.toLowerCase();
  return avoid.some((phrase) => {
    const needle = clean(phrase).toLowerCase();
    return needle.length > 2 && hay.includes(needle);
  });
}

function phrase(value: string, maxWords = 6): string {
  return wordsOf(value).slice(0, maxWords).join(" ");
}

export function coreConcept(crawl: CrawlConcept): string {
  const name = clean(crawl.name) || crawl.domain;
  const value = clean(crawl.valueProposition);
  if (value.length > 12) return asSentence(value);
  const tagline = clean(crawl.tagline);
  if (tagline.length > 8 && tagline.toLowerCase() !== name.toLowerCase()) {
    return asSentence(tagline);
  }
  const pillar = phrase(crawl.pillars[0] ?? "", 12);
  if (pillar) return asSentence(`${name} comes down to ${pillar}`);
  const excerpt = phrase(crawl.excerpt || crawl.line, 16);
  if (excerpt) return asSentence(excerpt);
  return asSentence(name);
}

function conceptWords(crawl: CrawlConcept): string[] {
  const name = clean(crawl.name).toLowerCase();
  const domain = clean(crawl.domain).toLowerCase();
  const raw = [
    ...crawl.pillars,
    ...crawl.themes,
    ...crawl.keywords,
    ...crawl.topics,
    ...crawl.headings,
  ];
  return unique(
    raw
      .map((item) => phrase(item, 5))
      .filter((item) => {
        const key = item.toLowerCase();
        if (key.length < 3) return false;
        if (key === name || key === domain) return false;
        if (blocked(item, crawl.avoid)) return false;
        return true;
      }),
  );
}

export function speakCrawlWord(
  crawl: CrawlConcept,
  word: string,
  life?: { city?: string; job?: string },
): string {
  const name = clean(crawl.name) || crawl.domain;
  const bit = phrase(word, 6);
  const city = clean(life?.city);
  const job = clean(life?.job);
  if (city && job) {
    return clipWords(
      `After ${job} in ${city}, the part of ${name} I keep is ${bit}.`,
    );
  }
  return clipWords(
    `${name} comes down to ${bit}. That is the core I would actually say.`,
  );
}

export function generateCrawlWords(
  crawl: CrawlConcept,
  options?: { seed?: number; life?: { city?: string; job?: string } },
): CrawlWordPack {
  const seed = options?.seed ?? 0;
  const name = clean(crawl.name) || crawl.domain;
  const concept = coreConcept(crawl);
  const words = rotate(conceptWords(crawl), seed).slice(0, 8);
  const lead = words[0] || phrase(concept, 6) || name;
  const next = words[1] || words[0] || name;
  const city = clean(options?.life?.city);
  const job = clean(options?.life?.job);
  const audience = phrase(crawl.audience, 10);

  const drafts = [
    `${name}. ${concept}`,
    `The core of ${name} is ${lead}. That is the part worth saying out loud.`,
    next === lead
      ? `What ${name} is for, in one breath: ${lead}.`
      : `If ${next} matters, that is what ${name} is built around.`,
    audience ? `${name} is for ${audience}.` : "",
    city && job
      ? `After ${job} in ${city}, I still come back to ${name} for ${lead}.`
      : "",
  ];

  const lines = unique(
    drafts
      .map((line) => clipWords(line))
      .filter((line) => line && !blocked(line, crawl.avoid)),
  ).slice(0, 4);

  return {
    concept,
    words,
    lines: lines.length > 0 ? lines : [clipWords(concept)],
  };
}
