import { prisma } from "./db";
import { getAppOrigin } from "./app-url";

export function generateDeletionConfirmationCode(): string {
  const segment = () =>
    Math.random().toString(36).slice(2, 10).toUpperCase();
  return `FB${segment()}${segment()}`;
}

export function buildDeletionStatusUrl(confirmationCode: string): string {
  return `${getAppOrigin()}/data-deletion?code=${encodeURIComponent(confirmationCode)}`;
}

export async function processFacebookDataDeletion(
  facebookUserId: string,
): Promise<{ confirmationCode: string; statusUrl: string }> {
  const confirmationCode = generateDeletionConfirmationCode();
  const statusUrl = buildDeletionStatusUrl(confirmationCode);

  const existing = await prisma.dataDeletionRequest.findFirst({
    where: {
      facebookUserId,
      status: { in: ["pending", "completed"] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing?.status === "completed") {
    return {
      confirmationCode: existing.confirmationCode,
      statusUrl: buildDeletionStatusUrl(existing.confirmationCode),
    };
  }

  const request = await prisma.dataDeletionRequest.create({
    data: {
      facebookUserId,
      confirmationCode,
      status: "pending",
    },
  });

  try {
    await prisma.siteSocialConnection.deleteMany({
      where: {
        platform: "facebook",
        providerUserId: facebookUserId,
      },
    });

    await prisma.account.deleteMany({
      where: {
        provider: "facebook",
        providerAccountId: facebookUserId,
      },
    });

    await prisma.dataDeletionRequest.update({
      where: { id: request.id },
      data: {
        status: "completed",
        completedAt: new Date(),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Deletion processing failed";
    await prisma.dataDeletionRequest.update({
      where: { id: request.id },
      data: {
        status: "failed",
        errorMessage: message,
      },
    });
    throw error;
  }

  return { confirmationCode, statusUrl };
}

export async function getDeletionRequestStatus(confirmationCode: string) {
  return prisma.dataDeletionRequest.findUnique({
    where: { confirmationCode },
  });
}