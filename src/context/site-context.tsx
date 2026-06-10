"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CrawlStatus, SiteData } from "@/lib/types";

const STORAGE_KEY = "marketing-ai-site-v2";

type SiteContextValue = {
  domainInput: string;
  setDomainInput: (value: string) => void;
  site: SiteData | null;
  status: CrawlStatus;
  error: string | null;
  crawlSite: () => Promise<void>;
  clearSite: () => void;
};

const SiteContext = createContext<SiteContextValue | null>(null);

function isValidSiteData(data: unknown): data is SiteData {
  return (
    typeof data === "object" &&
    data !== null &&
    "pages" in data &&
    "brand" in data &&
    Array.isArray((data as SiteData).pages)
  );
}

function loadStoredSite(): SiteData | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isValidSiteData(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [domainInput, setDomainInput] = useState("");
  const [site, setSite] = useState<SiteData | null>(null);
  const [status, setStatus] = useState<CrawlStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadStoredSite();
    if (stored) {
      setSite(stored);
      setDomainInput(stored.domain.replace(/^https?:\/\//, ""));
    }
  }, []);

  const crawlSite = useCallback(async () => {
    if (!domainInput.trim()) {
      setError("Enter a domain to crawl");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      const response = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domainInput }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to crawl domain");
      }

      if (!isValidSiteData(data)) {
        throw new Error("Invalid crawl response");
      }

      setSite(data);
      setStatus("success");
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to crawl domain");
    }
  }, [domainInput]);

  const clearSite = useCallback(() => {
    setSite(null);
    setDomainInput("");
    setStatus("idle");
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({
      domainInput,
      setDomainInput,
      site,
      status,
      error,
      crawlSite,
      clearSite,
    }),
    [domainInput, site, status, error, crawlSite, clearSite],
  );

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite() {
  const context = useContext(SiteContext);
  if (!context) {
    throw new Error("useSite must be used within a SiteProvider");
  }
  return context;
}