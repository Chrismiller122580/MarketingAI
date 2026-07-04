// Crypto billing configuration for crawlspark.ai
// XRP on XRPL Ledger (default). Legacy USDC on Base/Ethereum still supported via env.

export const SUPPORTED_NETWORKS = ["xrp", "base", "ethereum"] as const;
export type CryptoNetwork = (typeof SUPPORTED_NETWORKS)[number];

const DEFAULT_NETWORK = (process.env.NEXT_PUBLIC_CRYPTO_NETWORK ?? "xrp") as CryptoNetwork;
const DEFAULT_CURRENCY =
  process.env.NEXT_PUBLIC_CRYPTO_CURRENCY ??
  (DEFAULT_NETWORK === "xrp" ? "XRP" : "USDC");

const DEFAULT_XRP_RECEIVER = "rNBYkS1ZHSekLLoFHGAvbTtgAaXXi9Fm71";

export const STRIPE_PRICING = {
  pro: {
    amount: Number(process.env.STRIPE_PRICE_PRO_AMOUNT ?? 29),
    currency: "USD",
    label: "Pro",
    description: "Unlimited generations, priority support, advanced features",
    monthly: true,
  },
  enterprise: {
    amount: Number(process.env.STRIPE_PRICE_ENTERPRISE_AMOUNT ?? 99),
    currency: "USD",
    label: "Enterprise",
    description: "Everything in Pro + custom brand training, API access, dedicated support",
    monthly: true,
  },
  enterprise_plus: {
    amount: Number(process.env.STRIPE_PRICE_ENTERPRISE_PLUS_AMOUNT ?? 149),
    currency: "USD",
    label: "Enterprise Plus",
    description:
      "Everything in Enterprise + influencer site content from crawled domains with fact-locked citations",
    monthly: true,
  },
} as const;

export const PRICING = {
  pro: {
    amount: Number(process.env.CRYPTO_PRICE_PRO ?? 29),
    currency: DEFAULT_CURRENCY,
    network: DEFAULT_NETWORK,
    label: "Pro",
    description: "Unlimited generations, priority support, advanced features",
    monthly: true,
  },
  enterprise: {
    amount: Number(process.env.CRYPTO_PRICE_ENTERPRISE ?? 99),
    currency: DEFAULT_CURRENCY,
    network: DEFAULT_NETWORK,
    label: "Enterprise",
    description: "Everything in Pro + custom brand training, API access, dedicated support",
    monthly: true,
  },
  enterprise_plus: {
    amount: Number(process.env.CRYPTO_PRICE_ENTERPRISE_PLUS ?? 149),
    currency: DEFAULT_CURRENCY,
    network: DEFAULT_NETWORK,
    label: "Enterprise Plus",
    description:
      "Everything in Enterprise + influencer avatars that draft site content with pinpointed product facts",
    monthly: true,
  },
} as const;

export type PlanKey = keyof typeof PRICING;

export function isXrpNetwork(network?: string): boolean {
  return network === "xrp" || network === "xrpl";
}

export function getReceiverAddress(): string {
  const fromEnv = process.env.NEXT_PUBLIC_CRYPTO_RECEIVER_ADDRESS?.trim();
  if (fromEnv) return fromEnv;

  if (DEFAULT_NETWORK === "xrp") return DEFAULT_XRP_RECEIVER;

  const placeholder = "0x0000000000000000000000000000000000000000";
  if (typeof console !== "undefined") {
    console.warn(
      "CRITICAL: NEXT_PUBLIC_CRYPTO_RECEIVER_ADDRESS is not set (using placeholder).",
    );
  }
  return placeholder;
}

export function getNetworkLabel(network: CryptoNetwork | string): string {
  if (network === "xrp" || network === "xrpl") return "XRP Ledger";
  if (network === "base") return "Base";
  if (network === "ethereum") return "Ethereum";
  return network;
}

export function getExplorerTxUrl(network: CryptoNetwork | string, txHash: string): string {
  if (isXrpNetwork(network)) {
    const hash = txHash.toUpperCase();
    return `https://livenet.xrpl.org/transactions/${hash}`;
  }

  const hash = txHash.startsWith("0x") ? txHash : `0x${txHash}`;
  if (network === "base") {
    return `https://basescan.org/tx/${hash}`;
  }
  return `https://etherscan.io/tx/${hash}`;
}

export function isValidXrpAddress(address: string): boolean {
  return /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(address);
}

export function isValidXrpTxHash(hash: string): boolean {
  return /^[A-Fa-f0-9]{64}$/.test(hash.trim());
}

export function generateReference(userId: string, plan: string): string {
  const shortId = userId.slice(0, 8);
  const ts = Date.now().toString(36).slice(-6);
  return `CS-${shortId}-${plan.toUpperCase()}-${ts}`;
}

export const PLAN_DISPLAY: Record<string, { label: string; color: string }> = {
  free: { label: "Free", color: "bg-slate-100 text-slate-600 dark:bg-slate-800" },
  pro: { label: "Pro", color: "bg-amber-100 text-amber-700 dark:bg-amber-950/60" },
  enterprise: { label: "Enterprise", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60" },
  enterprise_plus: {
    label: "Enterprise Plus",
    color: "bg-violet-100 text-violet-700 dark:bg-violet-950/60",
  },
};