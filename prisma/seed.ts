import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_SETTINGS = {
  brandVoice:
    "Professional yet approachable. Focus on clarity and value. Avoid jargon.",
  targetAudience: "Business professionals and decision-makers",
  defaultPlatforms: ["instagram", "linkedin", "twitter"],
  includeHashtags: true,
  emojiStyle: "light",
  preferAiImages: false,
};

async function main() {
  const email = (
    process.env.ADMIN_EMAIL ?? "chrismiller122580@gmail.com"
  ).toLowerCase();
  const password = process.env.ADMIN_PASSWORD?.trim();
  const name = process.env.ADMIN_NAME ?? "Chris";

  if (!password || password === "your-secure-password-here") {
    if (process.env.VERCEL) {
      console.warn(
        "ADMIN_PASSWORD not set on Vercel — skipping admin seed. Add ADMIN_PASSWORD and redeploy to create/update the admin account.",
      );
      return;
    }
    console.error(
      "ADMIN_PASSWORD is required. Set it in .env.local (local) or Vercel env vars, then run: npm run db:seed",
    );
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  const admin = existing
    ? await prisma.user.update({
        where: { email },
        data: {
          name,
          role: "admin",
          plan: "enterprise",
          subscriptionStatus: "active",
          ...(process.env.ADMIN_RESET_PASSWORD === "1" ? { passwordHash } : {}),
        },
      })
    : await prisma.user.create({
        data: {
          name,
          email,
          role: "admin",
          plan: "enterprise",
          subscriptionStatus: "active",
          passwordHash,
          settings: { create: DEFAULT_SETTINGS },
        },
      });

  console.log("Admin user ready:");
  console.log(`  Email:    ${email}`);
  console.log(`  Role:     ${admin.role}`);
  console.log(`  ID:       ${admin.id}`);
  console.log("  (Password is only set on first create, or when ADMIN_RESET_PASSWORD=1.)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());