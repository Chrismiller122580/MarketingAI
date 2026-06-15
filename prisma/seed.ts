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
    process.env.ADMIN_EMAIL ?? "admin@crawlspark.ai"
  ).toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "CrawlSpark2026!";
  const name = process.env.ADMIN_NAME ?? "Admin";

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    create: {
      name,
      email,
      role: "admin",
      plan: "enterprise",
      subscriptionStatus: "active",
      passwordHash,
      settings: { create: DEFAULT_SETTINGS },
    },
    update: {
      name,
      role: "admin",
      plan: "enterprise",
      subscriptionStatus: "active",
      passwordHash,
    },
  });

  console.log("Admin user ready:");
  console.log(`  Email:    ${email}`);
  console.log(`  Role:     ${admin.role}`);
  console.log(`  ID:       ${admin.id}`);
  console.log("  (Password was set/updated from ADMIN_PASSWORD or default; never logged here for security.)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());