import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  AvatarResidence,
  type ResidencePerson,
  type ResidenceView,
} from "@/components/avatar-residence";
import { loadPublicWorldProfile } from "@/lib/viraforge/avatar-world";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const profile = await loadPublicWorldProfile(id);
  if (!profile) return { title: "Residence not found" };
  return {
    title: `${profile.displayName}'s place`,
    description: `${profile.displayName} lives on ${profile.street || "a street in the town"}.`,
  };
}

export default async function PublicResidencePage({ params }: PageProps) {
  const { id } = await params;
  const profile = await loadPublicWorldProfile(id);
  if (!profile) notFound();

  const householdRels = profile.world.relationships.filter(
    (rel) =>
      rel.kind === "partner" || rel.kind === "family" || rel.household === true,
  );
  const householdIds = new Set(householdRels.map((rel) => rel.influencerId));
  const byNearby = new Map(profile.nearby.map((row) => [row.id, row]));

  const household: ResidencePerson[] = householdRels.map((rel) => {
    const near = byNearby.get(rel.influencerId);
    const isPublic = profile.publicIds.includes(rel.influencerId);
    return {
      id: rel.influencerId,
      name: rel.displayName,
      role: rel.kind,
      detail: rel.note || near?.occupation,
      portraitUrl: near?.portraitUrl,
      href: isPublic ? `/world/${rel.influencerId}` : undefined,
    };
  });

  const neighbors: ResidencePerson[] = profile.nearby
    .filter((row) => !householdIds.has(row.id))
    .map((row) => ({
      id: row.id,
      name: row.displayName,
      role: row.occupation || "neighbor",
      detail: row.relationshipStatus || row.mood,
      portraitUrl: row.portraitUrl,
      href: row.isPublic ? `/world/${row.id}` : undefined,
    }));

  const home: ResidenceView = {
    name: profile.displayName,
    handle: profile.handle,
    portraitUrl: profile.assets.portraitUrl,
    occupation: profile.world.occupation,
    mood: profile.world.mood,
    city: profile.world.currentCity || profile.persona.location,
    street: profile.street,
    keepPlace: profile.keepPlace,
    keepPlaceKind: profile.keepPlaceKind,
    household,
    neighbors,
    nights: profile.chats.slice(0, 4).map((chat) => ({
      id: chat.conversationId,
      place: chat.placeName,
      line: chat.beat || chat.turns[0]?.text || "They ran into someone.",
    })),
    profileHref: `/world/${profile.id}`,
    townHref: "/world",
    tone: "public",
  };

  return <AvatarResidence home={home} />;
}
