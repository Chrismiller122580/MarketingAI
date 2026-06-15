"use client";

import { convertStringToHex, xrpToDrops } from "xrpl";
import { isValidXrpAddress } from "./billing";

export type XrpWalletProvider = "crossmark" | "gem";

export type XrpWalletSession = {
  provider: XrpWalletProvider;
  address: string;
};

export type XrpPaymentParams = {
  destination: string;
  amountXrp: number;
  reference?: string;
  description?: string;
};

export type DetectedWallets = {
  crossmark: boolean;
  gem: boolean;
};

function buildXrplMemos(reference?: string) {
  if (!reference) return undefined;
  const memoText = reference.slice(0, 120);
  return [
    {
      Memo: {
        MemoType: convertStringToHex("text/plain"),
        MemoData: convertStringToHex(memoText),
      },
    },
  ];
}

function buildGemMemos(reference?: string) {
  if (!reference) return undefined;
  const memoText = reference.slice(0, 120);
  return [
    {
      memo: {
        memoType: convertStringToHex("text/plain"),
        memoData: convertStringToHex(memoText),
      },
    },
  ];
}

export async function detectXrpWallets(): Promise<DetectedWallets> {
  let crossmark = false;
  let gem = false;

  try {
    const sdk = (await import("@crossmarkio/sdk")).default;
    crossmark = Boolean(sdk.sync.isInstalled());
  } catch {
    crossmark = false;
  }

  try {
    const { isInstalled } = await import("@gemwallet/api");
    const installed = await isInstalled();
    gem = Boolean(installed.result?.isInstalled);
  } catch {
    gem = false;
  }

  return { crossmark, gem };
}

export async function connectXrpWallet(
  preferred?: XrpWalletProvider,
): Promise<XrpWalletSession> {
  const detected = await detectXrpWallets();

  if (!detected.crossmark && !detected.gem) {
    throw new Error(
      "No XRP wallet found. Install Crossmark or Gem Wallet for Chrome, then refresh.",
    );
  }

  const tryCrossmark = async (): Promise<XrpWalletSession> => {
    const sdk = (await import("@crossmarkio/sdk")).default;
    if (!sdk.sync.isInstalled()) {
      throw new Error("Crossmark is not installed.");
    }

    const connected = await sdk.async.connect();
    if (!connected) {
      throw new Error("Crossmark connection was declined.");
    }

    const address = sdk.sync.getAddress();
    if (!address || !isValidXrpAddress(address)) {
      throw new Error("Crossmark did not return a valid XRP address.");
    }

    return { provider: "crossmark", address };
  };

  const tryGem = async (): Promise<XrpWalletSession> => {
    const { getAddress, isInstalled } = await import("@gemwallet/api");
    const installed = await isInstalled();
    if (!installed.result?.isInstalled) {
      throw new Error("Gem Wallet is not installed.");
    }

    const response = await getAddress();
    if (response.type !== "response" || !response.result?.address) {
      throw new Error("Gem Wallet connection was declined.");
    }

    const address = response.result.address;
    if (!isValidXrpAddress(address)) {
      throw new Error("Gem Wallet did not return a valid XRP address.");
    }

    return { provider: "gem", address };
  };

  const order: XrpWalletProvider[] =
    preferred === "gem"
      ? ["gem", "crossmark"]
      : preferred === "crossmark"
        ? ["crossmark", "gem"]
        : detected.crossmark
          ? ["crossmark", "gem"]
          : ["gem", "crossmark"];

  let lastError: Error | null = null;
  for (const provider of order) {
    if (provider === "crossmark" && !detected.crossmark) continue;
    if (provider === "gem" && !detected.gem) continue;

    try {
      return provider === "crossmark" ? await tryCrossmark() : await tryGem();
    } catch (e) {
      lastError = e instanceof Error ? e : new Error("Wallet connection failed");
    }
  }

  throw lastError ?? new Error("Failed to connect XRP wallet.");
}

export async function sendXrpPayment(
  session: XrpWalletSession,
  params: XrpPaymentParams,
): Promise<{ hash: string }> {
  const { destination, amountXrp, reference, description } = params;

  if (!isValidXrpAddress(destination)) {
    throw new Error("Invalid receiver XRP address.");
  }
  if (!Number.isFinite(amountXrp) || amountXrp <= 0) {
    throw new Error("Invalid payment amount.");
  }

  const drops = xrpToDrops(amountXrp.toString());

  if (session.provider === "crossmark") {
    const sdk = (await import("@crossmarkio/sdk")).default;
    const result = await sdk.async.signAndSubmitAndWait(
      {
        TransactionType: "Payment",
        Account: session.address,
        Destination: destination,
        Amount: drops,
        Memos: buildXrplMemos(reference),
      },
      { description: description ?? "CrawlSpark subscription payment" },
    );

    const resp = result.response?.data?.resp as
      | { result?: { hash?: string }; hash?: string }
      | undefined;
    const hash = resp?.result?.hash ?? resp?.hash;
    if (!hash) {
      throw new Error("Crossmark payment submitted but no transaction hash was returned.");
    }
    return { hash };
  }

  const { sendPayment } = await import("@gemwallet/api");
  const response = await sendPayment({
    destination,
    amount: drops,
    memos: buildGemMemos(reference),
  });

  if (response.type !== "response" || !response.result?.hash) {
    throw new Error("Gem Wallet payment was declined or failed.");
  }

  return { hash: response.result.hash };
}