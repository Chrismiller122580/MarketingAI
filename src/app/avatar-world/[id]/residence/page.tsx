import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import {
  AvatarResidence,
  type ResidencePerson,
  type ResidenceView,
} from "@/components/avatar-residence";
import { loadWorldDetail } from "@/lib/viraforge/avatar-world";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Residence",
  description: "Where this avatar lives, who shares the place, and where they came home from.",
};

type PageProps = { params: Promise<{ id: string }> };

export default async function AvatarResidencePage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/dashboard");

  const { id } = await params;
  const detail = await loadWorldDetail(session.user.id, id);
  if (!detail) notFound();

  const householdRels = detail.world.relationships.filter(
    (rel) =>
      rel.kind === "partner" || rel.kind === "family" || rel.household === true,
  );
  const householdIds = new Set(householdRels.map((rel) => rel.influencerId));
  const byOther = new Map(detail.others.map((row) => [row.id, row]));

  const household: ResidencePerson[] = householdRels.map((rel) => {
    const other = byOther.get(rel.influencerId);
    return {
      id: rel.influencerId,
      name: rel.displayName,
      role: rel.kind,
      detail: rel.note || other?.occupation,
      portraitUrl: other?.portraitUrl,
      href: `/avatar-world/${rel.influencerId}/residence`,
    };
  });

  const neighbors: ResidencePerson[] = detail.others
    .filter((row) => row.street === detail.street && !householdIds.has(row.id))
    .map((row) => ({
      id: row.id,
      name: row.displayName,
      role: row.occupation || "neighbor",
      detail: row.relationshipStatus || row.mood,
      portraitUrl: row.portraitUrl,
      href: `/avatar-world/${row.id}/residence`,
    }));

  const nights = detail.events
    .filter(
      (event) =>
        event.eventType === "world_hangout" || event.eventType === "world_chat",
    )
    .slice(0, 4)
    .map((event) => ({
      id: event.id,
      place: event.title,
      line: event.body,
    }));

  const home: ResidenceView = {
    name: detail.displayName,
    handle: detail.handle,
    portraitUrl: detail.assets.portraitUrl,
    occupation: detail.world.occupation,
    mood: detail.world.mood,
    city: detail.world.currentCity || detail.persona.location,
    street: detail.street,
    household,
    neighbors,
    nights,
    profileHref: `/avatar-world/${detail.id}`,
    townHref: "/avatar-world",
    tone: "admin",
  };

  return (
    <AppShell>
      <div className="min-w-0 overflow-x-hidden">
        <AvatarResidence home={home} />
      </div>
    </AppShell>
  );
}
