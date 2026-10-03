import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AvatarPublicProfile } from "@/components/avatar-public-profile";
import { getAuthUserId } from "@/lib/auth-helpers";
import { requirePageSession } from "@/lib/require-page-session";
import { loadPublicWorldProfile } from "@/lib/viraforge/avatar-world";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const userId = await getAuthUserId();
  if (!userId) {
    return { title: "Avatar World", robots: { index: false, follow: false } };
  }
  const { id } = await params;
  const profile = await loadPublicWorldProfile(id);
  if (!profile) {
    return { title: "Avatar not found", robots: { index: false, follow: false } };
  }
  return {
    title: `${profile.displayName} (@${profile.handle})`,
    description: profile.world.bio || profile.world.backstory.slice(0, 160),
    robots: { index: false, follow: false },
    openGraph: {
      title: `${profile.displayName} (@${profile.handle})`,
      description: profile.world.bio || "Living influencer on crawlspark.ai",
      images: profile.assets.portraitUrl
        ? [{ url: profile.assets.portraitUrl }]
        : undefined,
    },
  };
}

export default async function PublicWorldPage({ params }: PageProps) {
  const { id } = await params;
  await requirePageSession(`/world/${id}`);
  const profile = await loadPublicWorldProfile(id);
  if (!profile) notFound();
  return <AvatarPublicProfile profile={profile} />;
}
