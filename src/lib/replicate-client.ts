type ReplicatePrediction = {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string | string[] | Record<string, unknown> | null;
  error?: string | null;
};

type ReplicateModel = {
  latest_version?: { id?: string };
  detail?: string;
};

/** Pinned fallbacks when model metadata lookup fails. */
const PINNED_VERSIONS: Record<string, string> = {
  "cjwbw/sadtalker":
    "3aa3dac9353cc4d6bd62a8f95957bd844003b401ca4e4a9b33baa574c549d376",
};

export function getReplicateToken(): string | undefined {
  return process.env.REPLICATE_API_TOKEN;
}

export function hasReplicate(): boolean {
  return !!getReplicateToken();
}

function modelEnvVersion(model: string): string | undefined {
  const slug = model.replace("/", "_").replace(/-/g, "_").toUpperCase();
  return process.env[`REPLICATE_${slug}_VERSION`]?.trim();
}

async function resolveModelVersion(model: string): Promise<string | null> {
  const pinned = modelEnvVersion(model) ?? PINNED_VERSIONS[model];
  if (pinned) return pinned;

  const token = getReplicateToken();
  if (!token) return null;

  try {
    const response = await fetch(`https://api.replicate.com/v1/models/${model}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await response.json()) as ReplicateModel;
    if (!response.ok) return null;
    return data.latest_version?.id ?? null;
  } catch {
    return null;
  }
}

async function createVersionedPrediction(
  version: string,
  input: Record<string, unknown>,
): Promise<{ predictionId: string } | { error: string }> {
  const token = getReplicateToken();
  if (!token) {
    return { error: "REPLICATE_API_TOKEN is not configured" };
  }

  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ version, input }),
  });

  const data = (await response.json()) as ReplicatePrediction & {
    detail?: string;
    title?: string;
  };

  if (!response.ok) {
    return {
      error:
        data.detail ??
        data.title ??
        data.error ??
        `Replicate error (${response.status})`,
    };
  }

  if (!data.id) return { error: "Replicate did not return a prediction id" };
  return { predictionId: data.id };
}

async function createModelEndpointPrediction(
  model: string,
  input: Record<string, unknown>,
): Promise<{ predictionId: string } | { error: string }> {
  const token = getReplicateToken();
  if (!token) {
    return { error: "REPLICATE_API_TOKEN is not configured" };
  }

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
    title?: string;
  };

  if (!response.ok) {
    return {
      error:
        data.detail ??
        data.title ??
        data.error ??
        `Replicate error (${response.status})`,
    };
  }

  if (!data.id) return { error: "Replicate did not return a prediction id" };
  return { predictionId: data.id };
}

export async function createModelPrediction(
  model: string,
  input: Record<string, unknown>,
): Promise<{ predictionId: string } | { error: string }> {
  try {
    const version = await resolveModelVersion(model);
    if (version) {
      const result = await createVersionedPrediction(version, input);
      if (!("error" in result)) return result;
      if (!result.error.toLowerCase().includes("not found")) return result;
    }

    return await createModelEndpointPrediction(model, input);
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