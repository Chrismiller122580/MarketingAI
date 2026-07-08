"use client";

import { useCallback, useEffect, useRef } from "react";

export type GenerationPollOptions<T> = {
  /** Build the status URL for each attempt. */
  url: string;
  /** Return true when the job finished successfully. */
  isReady: (data: T) => boolean;
  /** Return true when the job failed. */
  isFailed: (data: T) => boolean;
  onReady: (data: T) => void;
  onFailed: (data: T) => void;
  onTimeout?: () => void;
  intervalMs?: number;
  maxAttempts?: number;
  /** When false, waits intervalMs before the first request (default: true). */
  immediate?: boolean;
  enabled?: boolean;
};

export function useGenerationPoll<T>({
  url,
  isReady,
  isFailed,
  onReady,
  onFailed,
  onTimeout,
  intervalMs = 4000,
  maxAttempts = 90,
  immediate = true,
  enabled = true,
}: GenerationPollOptions<T>) {
  const callbacksRef = useRef({
    isReady,
    isFailed,
    onReady,
    onFailed,
    onTimeout,
  });

  useEffect(() => {
    callbacksRef.current = {
      isReady,
      isFailed,
      onReady,
      onFailed,
      onTimeout,
    };
  }, [isReady, isFailed, onReady, onFailed, onTimeout]);

  const poll = useCallback(async () => {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (!immediate || attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }

      try {
        const res = await fetch(url);
        const data = (await res.json()) as T;
        if (callbacksRef.current.isReady(data)) {
          callbacksRef.current.onReady(data);
          return;
        }
        if (callbacksRef.current.isFailed(data)) {
          callbacksRef.current.onFailed(data);
          return;
        }
      } catch {
        /* retry */
      }
    }

    callbacksRef.current.onTimeout?.();
  }, [url, intervalMs, maxAttempts, immediate]);

  useEffect(() => {
    if (!enabled || !url) return;
    void poll();
  }, [enabled, url, poll]);
}

/** One-shot polling helper for imperative call sites. */
export async function pollUntilComplete<T>(options: {
  url: string;
  isReady: (data: T) => boolean;
  isFailed: (data: T) => boolean;
  intervalMs?: number;
  maxAttempts?: number;
  immediate?: boolean;
}): Promise<T | null> {
  const {
    url,
    isReady,
    isFailed,
    intervalMs = 4000,
    maxAttempts = 90,
    immediate = true,
  } = options;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (!immediate || attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    try {
      const res = await fetch(url);
      const data = (await res.json()) as T;
      if (isReady(data) || isFailed(data)) return data;
    } catch {
      /* retry */
    }
  }

  return null;
}