type ReplicatePrediction = {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string | string[] | Record<string, unknown> | null;
  error?: string | null;
};

export function getReplicateToken(): string | undefined {
  return process.env.REPLICATE_API_TOKEN;
}

export function hasReplicate(): boolean {
  return !!getReplicateToken();
}

export async function createModelPrediction(
  model: string,
  input: Record<string, unknown>,
): Promise<{ predictionId: string } | { error: string }> {
  const token = getReplicateToken();
  if (!token) {
    return { error: "REPLICATE_API_TOKEN is not configured" };
  }

  try {
    const response = await fetch(
      `https://api.replicate.com/v1/models/${model}/predictions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input }),
      },
    );

    const data = (await response.json()) as ReplicatePrediction & {
      detail?: string;
    };

    if (!response.ok) {
      return {
        error: data.detail ?? data.error ?? `Replicate error (${response.status})`,
      };
    }

    if (!data.id) return { error: "Replicate did not return a prediction id" };
    return { predictionId: data.id };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Replicate request failed",
    };
  }
}

export async function getPredictionStatus(predictionId: string): Promise<{
  status: "processing" | "ready" | "failed";
  outputUrl?: string;
  error?: string;
} | null> {
  const token = getReplicateToken();
  if (!token) return null;

  try {
    const response = await fetch(
      `https://api.replicate.com/v1/predictions/${predictionId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!response.ok) return null;
    const data = (await response.json()) as ReplicatePrediction;

    if (data.status === "succeeded") {
      const url = extractOutputUrl(data.output);
      if (url) return { status: "ready", outputUrl: url };
      return { status: "failed", error: "No output URL returned" };
    }

    if (data.status === "failed" || data.status === "canceled") {
      return {
        status: "failed",
        error: data.error ?? "Prediction failed",
      };
    }

    return { status: "processing" };
  } catch {
    return null;
  }
}

function extractOutputUrl(
  output: ReplicatePrediction["output"],
): string | undefined {
  if (!output) return undefined;
  if (typeof output === "string") return output;
  if (Array.isArray(output)) {
    const first = output.find((item) => typeof item === "string");
    return typeof first === "string" ? first : undefined;
  }
  if (typeof output === "object") {
    const record = output as Record<string, unknown>;
    for (const key of ["video", "output", "result", "url"]) {
      const value = record[key];
      if (typeof value === "string") return value;
    }
  }
  return undefined;
}

export async function uploadBytesToReplicate(
  bytes: Buffer,
  contentType: string,
  filename: string,
): Promise<string> {
  const token = getReplicateToken();
  if (!token) throw new Error("REPLICATE_API_TOKEN is not configured");

  const form = new FormData();
  form.append(
    "content",
    new Blob([new Uint8Array(bytes)], { type: contentType }),
    filename,
  );

  const response = await fetch("https://api.replicate.com/v1/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Replicate file upload failed: ${detail.slice(0, 200)}`);
  }

  const data = (await response.json()) as { urls?: { get?: string } };
  const url = data.urls?.get;
  if (!url) throw new Error("Replicate file upload returned no URL");
  return url;
}