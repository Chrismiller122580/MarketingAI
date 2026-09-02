"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { signIn, useSession } from "next-auth/react";
import { fetchJson, isUnauthorizedStatus } from "@/lib/client-fetch";
import { isFreeSocialPlatform, sessionIsPaid } from "@/lib/plans";
import type { CrawlStatus, SiteData, UserSettings } from "@/lib/types";

type SavedSiteSummary = {
  domain: string;
  crawledAt: string;
  brandName: string;
  pages: number;
  images: number;
};

type SiteContextValue = {
  domainInput: string;
  setDomainInput: (value: string) => void;
  site: SiteData | null;
  status: CrawlStatus;
  error: string | null;
  quotaExceeded: boolean;
  crawlSite: () => Promise<void>;
  clearSite: () => Promise<void>;
  saveSite: () => Promise<void>;
  loadSavedSite: (domain: string) => Promise<void>;
  deleteSavedSite: (domain: string) => Promise<void>;
  savedSites: SavedSiteSummary[];
  siteSocialConnections: Record<string, Record<string, unknown>>;
  connectSocial: (platform: string) => void;
  loadSiteSocialConnections: () => Promise<void>;
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

function stripDomain(domain: string): string {
  return domain.replace(/^https?:\/\//, "");
}

function writeSocialLinkCookie(domain: string) {
  if (typeof document === "undefined") return;
  const cookieDomain = window.location.hostname.endsWith("crawlspark.ai")
    ? "; Domain=.crawlspark.ai"
    : "";
  document.cookie = `crawlspark_link_site=${encodeURIComponent(domain)}; Path=/; Max-Age=600; SameSite=Lax; Secure${cookieDomain}`;
}

async function patchActiveSite(domain: string | null): Promise<void> {
  await fetch("/api/db/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      settings: {
        activeSiteDomain: domain,
        activeSiteChosen: true,
      },
    }),
  });
}

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status: sessionStatus } = useSession();
  const [domainInput, setDomainInput] = useState("");
  const [site, setSite] = useState<SiteData | null>(null);
  const [status, setStatus] = useState<CrawlStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savedSites, setSavedSites] = useState<SavedSiteSummary[]>([]);
  const [siteSocialConnections, setSiteSocialConnections] = useState<
    Record<string, Record<string, unknown>>
  >({});
  const bootstrappedForUser = useRef(false);

  const loadSavedSitesList = useCallback(async (): Promise<SavedSiteSummary[]> => {
    try {
      const { data, status: httpStatus } = await fetchJson<{
        sites?: SavedSiteSummary[];
      }>("/api/db/site?list=true");
      if (isUnauthorizedStatus(httpStatus)) return [];
      const sites = (data.sites ?? []) as SavedSiteSummary[];
      setSavedSites(sites);
      return sites;
    } catch {
      setSavedSites([]);
      return [];
    }
  }, []);

  const loadSiteSocialConnections = useCallback(async () => {
    if (!site) {
      setSiteSocialConnections({});
      return;
    }
    try {
      const res = await fetch(
        `/api/db/site/social?domain=${encodeURIComponent(site.domain)}`,
      );
      const data = await res.json();
      if (data.connections) {
        const map: Record<string, Record<string, unknown>> = {};
        data.connections.forEach((c: { platform: string; [k: string]: unknown }) => {
          map[c.platform] = c;
        });
        setSiteSocialConnections(map);
      }
    } catch {
      setSiteSocialConnections({});
    }
  }, [site]);

  const connectSocial = useCallback(
    (platform: string) => {
      const isMeta = platform === "facebook" || platform === "instagram";
      if (!isMeta && !site) return;

      if (!isFreeSocialPlatform(platform) && !sessionIsPaid(session?.user as { plan?: string; role?: string; subscriptionEndsAt?: string | null } | undefined)) {
        setError(
          "Free publishes to Facebook and Instagram for your one website. Upgrade to Pro to connect more accounts and market multiple client sites.",
        );
        setQuotaExceeded(true);
        return;
      }
      setQuotaExceeded(false);

      if (isMeta) {
        try {
          localStorage.setItem("pendingMetaUserConnect", "1");
        } catch {
          /* ignore */
        }
      }

      if (site) {
        localStorage.setItem("pendingSocialConnectSite", site.domain);
        writeSocialLinkCookie(site.domain);
      }

      const returnPath =
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : "/settings";

      void fetch("/api/social/prepare", { method: "POST" })
        .catch(() => undefined)
        .finally(() => {
          signIn(platform.toLowerCase(), { callbackUrl: returnPath });
        });
    },
    [site, session?.user],
  );

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (sessionStatus !== "authenticated") {
      bootstrappedForUser.current = false;
      setLoading(false);
      return;
    }
    if (bootstrappedForUser.current) return;
    bootstrappedForUser.current = true;

    async function bootstrap() {
      try {
        const [settingsRes, sites] = await Promise.all([
          fetchJson<{ settings?: UserSettings }>("/api/db/settings"),
          loadSavedSitesList(),
        ]);

        if (isUnauthorizedStatus(settingsRes.status)) {
          bootstrappedForUser.current = false;
          return;
        }

        const settings = settingsRes.data.settings;
        let activeDomain = settings?.activeSiteDomain ?? null;

        if (!activeDomain && sites.length > 0) {
          activeDomain = sites[0].domain;
          await patchActiveSite(activeDomain);
        }

        if (activeDomain) {
          const siteRes = await fetchJson<{ site?: SiteData }>(
            `/api/db/site?domain=${encodeURIComponent(activeDomain)}`,
          );
          if (isUnauthorizedStatus(siteRes.status)) {
            bootstrappedForUser.current = false;
            return;
          }
          if (siteRes.data.site && isValidSiteData(siteRes.data.site)) {
            setSite(siteRes.data.site);
            setDomainInput(stripDomain(siteRes.data.site.domain));
            setStatus("success");
          }
        }
      } catch {
        /* keep empty state */
      } finally {
        setLoading(false);
      }
    }

    void bootstrap();
  }, [loadSavedSitesList, sessionStatus]);

  useEffect(() => {
    const t = setTimeout(() => {
      void loadSiteSocialConnections();
    }, 0);
    return () => clearTimeout(t);
  }, [site, loadSiteSocialConnections]);

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
    setQuotaExceeded(false);

    try {
      const response = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domainInput }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (data?.code === "QUOTA_EXCEEDED") setQuotaExceeded(true);
        throw new Error(data.error ?? "Failed to crawl domain");
      }
      if (!isValidSiteData(data)) throw new Error("Invalid crawl response");

      setSite(data);
      setStatus("success");

      await persistSite(data);
      await patchActiveSite(data.domain);
      await loadSavedSitesList();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to crawl domain");
    }
  }, [domainInput, persistSite, loadSavedSitesList]);

  const clearSite = useCallback(async () => {
    setSite(null);
    setDomainInput("");
    setStatus("idle");
    setError(null);
    setSiteSocialConnections({});
    await patchActiveSite(null);
  }, []);

  const saveSite = useCallback(async () => {
    if (!site) return;
    await persistSite(site);
    await loadSavedSitesList();
    await loadSiteSocialConnections();
  }, [site, persistSite, loadSavedSitesList, loadSiteSocialConnections]);

  const loadSavedSite = useCallback(
    async (domain: string) => {
      setStatus("loading");
      setError(null);

      try {
        const res = await fetch(
          `/api/db/site?domain=${encodeURIComponent(domain)}`,
        );
        const data = await res.json();
        if (!res.ok || !data.site) throw new Error(data.error || "Site not found");
        if (!isValidSiteData(data.site)) throw new Error("Invalid site data");

        setSite(data.site);
        setDomainInput(stripDomain(data.site.domain));
        setStatus("success");
        await patchActiveSite(data.site.domain);
        await loadSiteSocialConnections();
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Failed to load saved site");
      }
    },
    [loadSiteSocialConnections],
  );

  const deleteSavedSite = useCallback(
    async (domain: string) => {
      setError(null);

      try {
        const res = await fetch(
          `/api/db/site?domain=${encodeURIComponent(domain)}`,
          { method: "DELETE" },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to delete site");

        if (site?.domain === domain) {
          setSite(null);
          setDomainInput("");
          setStatus("idle");
          setSiteSocialConnections({});
        }

        await loadSavedSitesList();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete site");
        setStatus("error");
      }
    },
    [site, loadSavedSitesList],
  );

  const value = useMemo(
    () => ({
      domainInput,
      setDomainInput,
      site,
      status,
      error,
      quotaExceeded,
      crawlSite,
      clearSite,
      saveSite,
      loadSavedSite,
      deleteSavedSite,
      savedSites,
      siteSocialConnections,
      connectSocial,
      loadSiteSocialConnections,
      loading,
    }),
    [
      domainInput,
      site,
      status,
      error,
      quotaExceeded,
      crawlSite,
      clearSite,
      saveSite,
      loadSavedSite,
      deleteSavedSite,
      savedSites,
      siteSocialConnections,
      connectSocial,
      loadSiteSocialConnections,
      loading,
    ],
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