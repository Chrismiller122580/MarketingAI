import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";

export type TokenPurpose = "reset" | "verify";

const TOKEN_TTL_MS: Record<TokenPurpose, number> = {
  reset: 60 * 60 * 1000,
  verify: 24 * 60 * 60 * 1000,
};

function identifierFor(purpose: TokenPurpose, email: string): string {
  return `${purpose}:${email.toLowerCase().trim()}`;
}

export async function createVerificationToken(
  purpose: TokenPurpose,
  email: string,
): Promise<string> {
  const normalized = email.toLowerCase().trim();
  const identifier = identifierFor(purpose, normalized);
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + TOKEN_TTL_MS[purpose]);

  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({
    data: { identifier, token, expires },
  });

  return token;
}

export async function consumeVerificationToken(
  purpose: TokenPurpose,
  token: string,
): Promise<string | null> {
  const record = await prisma.verificationToken.findFirst({
    where: { token, identifier: { startsWith: `${purpose}:` } },
  });

  if (!record || record.expires < new Date()) {
    if (record) {
      await prisma.verificationToken.deleteMany({
        where: { identifier: record.identifier, token: record.token },
      });
    }
    return null;
  }

  const email = record.identifier.slice(purpose.length + 1);
  await prisma.verificationToken.deleteMany({
    where: { identifier: record.identifier, token: record.token },
  });
  return email;
}