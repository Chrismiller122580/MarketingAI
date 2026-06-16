import { Client, dropsToXrp } from "xrpl";
import {
  getExplorerTxUrl,
  getReceiverAddress,
  isValidXrpTxHash,
  isXrpNetwork,
} from "@/lib/billing";
import { prisma } from "@/lib/db";

export type PaymentVerification = {
  valid: boolean;
  error?: string;
  autoConfirmed?: boolean;
};

async function verifyXrpPayment(
  txHash: string,
  expectedReceiver: string,
  expectedAmount: number,
  reference?: string,
): Promise<PaymentVerification> {
  const client = new Client(process.env.XRPL_SERVER ?? "wss://xrplcluster.com");
  try {
    await client.connect();
    const res = await client.request({
      command: "tx",
      transaction: txHash.toUpperCase(),
    });

    const tx = res.result as {
      meta?: { TransactionResult?: string };
      TransactionType?: string;
      Destination?: string;
      Amount?: string | Record<string, unknown>;
      Memos?: Array<{ Memo?: { MemoData?: string } }>;
    };

    if (tx.meta?.TransactionResult !== "tesSUCCESS") {
      return { valid: false, error: "Transaction did not succeed on XRPL" };
    }

    if (tx.TransactionType !== "Payment") {
      return { valid: false, error: "Transaction is not a Payment" };
    }

    if (tx.Destination !== expectedReceiver) {
      return { valid: false, error: "Payment destination does not match receiver address" };
    }

    if (typeof tx.Amount !== "string") {
      return { valid: false, error: "Payment is not in XRP" };
    }

    const received = Number(dropsToXrp(tx.Amount));
    const tolerance = Math.max(0.000001, expectedAmount * 0.001);
    if (Math.abs(received - expectedAmount) > tolerance) {
      return {
        valid: false,
        error: `Amount mismatch: received ${received} XRP, expected ${expectedAmount} XRP`,
      };
    }

    if (reference && tx.Memos?.length) {
      const { convertHexToString } = await import("xrpl");
      const memoText = tx.Memos.map((m) => {
        const hex = m.Memo?.MemoData;
        if (!hex) return "";
        try {
          return convertHexToString(hex);
        } catch {
          return "";
        }
      }).join(" ");
      if (memoText && !memoText.includes(reference)) {
        // Soft warning only — amount + destination are the hard checks
      }
    }

    return { valid: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "XRPL lookup failed";
    return { valid: false, error: message };
  } finally {
    await client.disconnect().catch(() => {});
  }
}

async function verifyEvmUsdcPayment(
  txHash: string,
  network: string,
  expectedReceiver: string,
  expectedAmount: number,
): Promise<PaymentVerification> {
  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey) {
    return { valid: false, error: "EVM auto-verify requires ETHERSCAN_API_KEY" };
  }

  const hash = txHash.startsWith("0x") ? txHash : `0x${txHash}`;
  const baseUrl =
    network === "base"
      ? "https://api.basescan.org/api"
      : "https://api.etherscan.io/api";
  const url = `${baseUrl}?module=proxy&action=eth_getTransactionReceipt&txhash=${hash}&apikey=${apiKey}`;

  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    const data = await res.json();
    const receipt = data.result;
    if (!receipt || receipt.status !== "0x1") {
      return { valid: false, error: "Transaction receipt not found or failed" };
    }

    const usdcContract =
      network === "base"
        ? "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"
        : "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";

    const transferTopic =
      "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
    const receiverTopic = `0x${expectedReceiver.toLowerCase().replace("0x", "").padStart(64, "0")}`;

    const logs = (receipt.logs ?? []) as Array<{
      address?: string;
      topics?: string[];
      data?: string;
    }>;

    for (const log of logs) {
      if (log.address?.toLowerCase() !== usdcContract.toLowerCase()) continue;
      if (log.topics?.[0] !== transferTopic) continue;
      if (log.topics?.[2]?.toLowerCase() !== receiverTopic.toLowerCase()) continue;

      const amountRaw = BigInt(log.data ?? "0x0");
      const received = Number(amountRaw) / 1_000_000;
      const tolerance = Math.max(0.01, expectedAmount * 0.01);
      if (Math.abs(received - expectedAmount) <= tolerance) {
        return { valid: true };
      }
      return {
        valid: false,
        error: `USDC amount mismatch: received ${received}, expected ${expectedAmount}`,
      };
    }

    return { valid: false, error: "No matching USDC transfer to receiver in transaction" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "EVM verification failed";
    return { valid: false, error: message };
  }
}

export async function verifyCryptoPayment(payment: {
  id: string;
  txHash: string | null;
  network: string;
  amount: { toString(): string };
  reference: string;
  userId: string;
}): Promise<PaymentVerification> {
  if (!payment.txHash?.trim()) {
    return { valid: false, error: "Transaction hash required" };
  }

  const cleanTx = payment.txHash.trim();

  const duplicate = await prisma.payment.findFirst({
    where: {
      txHash: cleanTx,
      status: "confirmed",
      NOT: { id: payment.id },
    },
  });
  if (duplicate) {
    return { valid: false, error: "Transaction hash already used for a confirmed payment" };
  }

  const receiver = getReceiverAddress();
  const expectedAmount = Number(payment.amount.toString());

  if (isXrpNetwork(payment.network)) {
    if (!isValidXrpTxHash(cleanTx)) {
      return { valid: false, error: "Invalid XRPL transaction hash" };
    }
    return verifyXrpPayment(cleanTx, receiver, expectedAmount, payment.reference);
  }

  if (payment.network === "base" || payment.network === "ethereum") {
    return verifyEvmUsdcPayment(cleanTx, payment.network, receiver, expectedAmount);
  }

  return { valid: false, error: `Unsupported network: ${payment.network}` };
}

export function verificationExplorerUrl(network: string, txHash: string): string {
  return getExplorerTxUrl(network, txHash);
}