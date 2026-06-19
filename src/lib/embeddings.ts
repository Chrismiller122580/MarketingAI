import type { SitePage } from "./types";

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export function pageEmbeddingText(page: SitePage): string {
  return [page.title, page.description, ...page.headings.slice(0, 4), page.excerpt]
    .filter(Boolean)
    .join(" ")
    .slice(0, 2000);
}

export async function embedText(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !text.trim()) return null;

  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text.slice(0, 8000),
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.data?.[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

export async function embedPages(pages: SitePage[]): Promise<SitePage[]> {
  const results = await Promise.all(
    pages.map(async (page) => {
      const embedding = await embedText(pageEmbeddingText(page));
      return embedding ? { ...page, embedding } : page;
    }),
  );
  return results;
}

export async function rankPagesBySimilarity(
  pages: SitePage[],
  query: string,
): Promise<{ page: SitePage; score: number }[]> {
  const queryEmbedding = await embedText(query);
  if (!queryEmbedding) return [];

  return pages
    .filter((p) => p.embedding && p.embedding.length > 0)
    .map((page) => ({
      page,
      score: cosineSimilarity(queryEmbedding, page.embedding!),
    }))
    .sort((a, b) => b.score - a.score);
}