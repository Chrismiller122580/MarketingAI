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
    process.env.ADMIN_EMAIL ?? "admin@marketingai.app"
  ).toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "MarketingAI2026!";
  const name = process.env.ADMIN_NAME ?? "Admin";

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    create: {
      name,
      email,
      role: "admin",
      passwordHash,
      settings: { create: DEFAULT_SETTINGS },
    },
    update: {
      name,
      role: "admin",
      passwordHash,
    },
  });

  console.log("Admin user ready:");
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log(`  Role:     ${admin.role}`);
  console.log(`  ID:       ${admin.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());