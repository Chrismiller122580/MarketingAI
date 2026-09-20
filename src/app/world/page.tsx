import type { Metadata } from "next";
import { PublicWorldTown } from "@/components/public-world-town";
import { listPublicWorldTown } from "@/lib/viraforge/avatar-world";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Avatar World",
  description:
    "A town that lives without you — residents, places, and avatars you can use on crawlspark.ai.",
};

export default async function PublicWorldGalleryPage() {
  const town = await listPublicWorldTown();
  return <PublicWorldTown town={town} />;
}
