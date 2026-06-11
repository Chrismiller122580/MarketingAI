// Crypto billing configuration for crawlspark.ai
// Prices are in the smallest unit of the currency (USDC has 6 decimals, but we store as Decimal(10,2) for simplicity and display dollars).

export const SUPPORTED_NETWORKS = ["base", "ethereum"] as const;
export type CryptoNetwork = (typeof SUPPORTED_NETWORKS)[number];

export const PRICING = {
  pro: {
    amount: Number(process.env.CRYPTO_PRICE_PRO ?? 29),
    currency: "USDC",
    network: (process.env.NEXT_PUBLIC_CRYPTO_NETWORK ?? "base") as CryptoNetwork,
    label: "Pro",
    description: "Unlimited generations, priority support, advanced features",
    monthly: true,
  },
  enterprise: {
    amount: Number(process.env.CRYPTO_PRICE_ENTERPRISE ?? 99),
    currency: "USDC",
    network: (process.env.NEXT_PUBLIC_CRYPTO_NETWORK ?? "base") as CryptoNetwork,
    label: "Enterprise",
    description: "Everything in Pro + custom brand training, API access, dedicated support",
    monthly: true,
  },
} as const;

export type PlanKey = keyof typeof PRICING;

export function getReceiverAddress(): string {
  // Prefer public env so it can be shown on client
  return (
    process.env.NEXT_PUBLIC_CRYPTO_RECEIVER_ADDRESS ||
    "0x0000000000000000000000000000000000000000" // placeholder - replace in .env
  );
}

export function getNetworkLabel(network: CryptoNetwork): string {
  if (network === "base") return "Base";
  if (network === "ethereum") return "Ethereum";
  return network;
}

export function getExplorerTxUrl(network: CryptoNetwork, txHash: string): string {
  const hash = txHash.startsWith("0x") ? txHash : `0x${txHash}`;
  if (network === "base") {
    return `https://basescan.org/tx/${hash}`;
  }
  return `https://etherscan.io/tx/${hash}`;
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
};
