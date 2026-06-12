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
  saveSite: () => Promise<void>;
  loadSavedSite: (domain: string) => Promise<void>;
  savedSites: Array<{
    domain: string;
    crawledAt: string;
    brandName: string;
    pages: number;
    images: number;
  }>;
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
  const [savedSites, setSavedSites] = useState<SiteContextValue["savedSites"]>([]);

  const loadSavedSitesList = useCallback(async () => {
    try {
      const res = await fetch("/api/db/site?list=true");
      const data = await res.json();
      if (data.sites) setSavedSites(data.sites);
    } catch {}
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/db/site")
        .then((r) => r.json())
        .then((data) => {
          if (data.site && isValidSiteData(data.site)) {
            setSite(data.site);
            setDomainInput(data.site.domain.replace(/^https?:\/\//, ""));
          }
        }),
      loadSavedSitesList(),
    ])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [loadSavedSitesList]);

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
      // Do not auto-persist here — user clicks Save domain button after seeing results
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to crawl domain");
    }
  }, [domainInput]);

  const clearSite = useCallback(async () => {
    setSite(null);
    setDomainInput("");
    setStatus("idle");
    setError(null);
    await fetch("/api/db/site", { method: "DELETE" });
  }, []);

  const saveSite = useCallback(async () => {
    if (!site) return;
    await persistSite(site);
    await loadSavedSitesList();
  }, [site, persistSite, loadSavedSitesList]);

  const loadSavedSite = useCallback(async (domain: string) => {
    setStatus("loading");
    setError(null);

    try {
      const res = await fetch(`/api/db/site?domain=${encodeURIComponent(domain)}`);
      const data = await res.json();
      if (!res.ok || !data.site) throw new Error(data.error || "Site not found");
      if (!isValidSiteData(data.site)) throw new Error("Invalid site data");

      setSite(data.site);
      setDomainInput(data.site.domain.replace(/^https?:\/\//, ""));
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to load saved site");
    }
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
      saveSite,
      loadSavedSite,
      savedSites,
      loading,
    }),
    [domainInput, site, status, error, crawlSite, clearSite, saveSite, loadSavedSite, savedSites, loading],
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