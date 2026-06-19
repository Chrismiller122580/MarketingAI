import type { AiProvider } from "./types";

type ChatMessage = { role: "system" | "user"; content: string };

type ChatOptions = {
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
};

function resolveProvider(preferred?: AiProvider): {
  provider: AiProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
} | null {
  const openaiKey = process.env.OPENAI_API_KEY;
  const xaiKey = process.env.XAI_API_KEY;

  if (preferred === "xai" && xaiKey) {
    return {
      provider: "xai",
      apiKey: xaiKey,
      baseUrl: "https://api.x.ai/v1/chat/completions",
      model: "grok-3-mini",
    };
  }
  if (preferred === "openai" && openaiKey) {
    return {
      provider: "openai",
      apiKey: openaiKey,
      baseUrl: "https://api.openai.com/v1/chat/completions",
      model: "gpt-4o-mini",
    };
  }
  if (xaiKey) {
    return {
      provider: "xai",
      apiKey: xaiKey,
      baseUrl: "https://api.x.ai/v1/chat/completions",
      model: "grok-3-mini",
    };
  }
  if (openaiKey) {
    return {
      provider: "openai",
      apiKey: openaiKey,
      baseUrl: "https://api.openai.com/v1/chat/completions",
      model: "gpt-4o-mini",
    };
  }
  return null;
}

export async function chatCompletion(
  systemPrompt: string,
  userMessage: string,
  options: ChatOptions = {},
): Promise<string | null> {
  const resolved = resolveProvider();
  if (!resolved) return null;

  try {
    const response = await fetch(resolved.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resolved.apiKey}`,
      },
      body: JSON.stringify({
        model: resolved.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ] satisfies ChatMessage[],
        max_tokens: options.maxTokens ?? 600,
        temperature: options.temperature ?? 0.7,
        ...(options.jsonMode && resolved.provider === "openai"
          ? { response_format: { type: "json_object" } }
          : {}),
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

export async function callProvider(
  provider: AiProvider,
  systemPrompt: string,
  userMessage: string,
  maxTokens = 600,
): Promise<string | null> {
  const resolved = resolveProvider(provider);
  if (!resolved || resolved.provider !== provider) return null;

  try {
    const response = await fetch(resolved.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resolved.apiKey}`,
      },
      body: JSON.stringify({
        model: resolved.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

export function hasAnyAiKey(): boolean {
  return !!(process.env.OPENAI_API_KEY || process.env.XAI_API_KEY);
}