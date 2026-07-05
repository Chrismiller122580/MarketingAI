import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/auth-email";
import { createVerificationToken } from "@/lib/auth-tokens";
import { checkIpRateLimit, getClientIp } from "@/lib/rate-limit";

const DEFAULT_SETTINGS = {
  brandVoice:
    "Professional yet approachable. Focus on clarity and value. Avoid jargon.",
  targetAudience: "Business professionals and decision-makers",
  defaultPlatforms: ["instagram", "linkedin", "twitter"],
  includeHashtags: true,
  emojiStyle: "light",
  preferAiImages: false,
};

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = checkIpRateLimit(ip, "authRegister");
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many registration attempts. Retry in ~${rl.retryAfterSeconds}s.` },
        { status: 429 },
      );
    }

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        settings: { create: DEFAULT_SETTINGS },
      },
      select: { id: true, name: true, email: true },
    });

    try {
      const token = await createVerificationToken("verify", email);
      await sendVerificationEmail(email, token);
    } catch (emailErr) {
      console.error("[register] verification email failed:", emailErr);
    }

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("[register] failed:", error);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 },
    );
  }
}