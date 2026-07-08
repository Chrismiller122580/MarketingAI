/** Browser fetch that always sends session cookies and surfaces auth failures. */
export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; data: T }> {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...init,
  });

  let data = {} as T;
  try {
    data = (await response.json()) as T;
  } catch {
    /* non-JSON body */
  }

  return { ok: response.ok, status: response.status, data };
}

export function isUnauthorizedStatus(status: number): boolean {
  return status === 401;
}