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

type SiteContextValue = {
  domainInput: string;
  setDomainInput: (value: string) => void;
  site: SiteData | null;
  status: CrawlStatus;
  error: string | null;
  crawlSite: () => Promise<void>;
  clearSite: () => Promise<void>;
  loading: boolean;
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

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [domainInput, setDomainInput] = useState("");
  const [site, setSite] = useState<SiteData | null>(null);
  const [status, setStatus] = useState<CrawlStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/db/site")
      .then((r) => r.json())
      .then((data) => {
        if (data.site && isValidSiteData(data.site)) {
          setSite(data.site);
          setDomainInput(data.site.domain.replace(/^https?:\/\//, ""));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const persistSite = useCallback(async (siteData: SiteData) => {
    await fetch("/api/db/site", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ site: siteData }),
    });
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
      if (!response.ok) throw new Error(data.error ?? "Failed to crawl domain");
      if (!isValidSiteData(data)) throw new Error("Invalid crawl response");

      setSite(data);
      setStatus("success");
      await persistSite(data);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to crawl domain");
    }
  }, [domainInput, persistSite]);

  const clearSite = useCallback(async () => {
    setSite(null);
    setDomainInput("");
    setStatus("idle");
    setError(null);
    await fetch("/api/db/site", { method: "DELETE" });
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
      loading,
    }),
    [domainInput, site, status, error, crawlSite, clearSite, loading],
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