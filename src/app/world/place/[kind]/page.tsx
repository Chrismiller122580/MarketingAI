import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  PUBLIC_PLACE_KINDS,
  PublicWorldTown,
  type PublicPlaceKind,
} from "@/components/public-world-town";
import { listPublicWorldTown } from "@/lib/viraforge/avatar-world";

export const dynamic = "force-dynamic";

const TITLES: Record<PublicPlaceKind, string> = {
  bank: "City Bank",
  market: "The Market",
  rooms: "Rooms",
  shop: "Corner Shop",
};

function asKind(value: string): PublicPlaceKind | undefined {
  return PUBLIC_PLACE_KINDS.includes(value as PublicPlaceKind)
    ? (value as PublicPlaceKind)
    : undefined;
}

type PageProps = { params: Promise<{ kind: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { kind } = await params;
  const place = asKind(kind);
  if (!place) return { title: "Place not found" };
  return {
    title: `${TITLES[place]} — Avatar World`,
    description: `Look in on ${TITLES[place]} in the living town on crawlspark.ai.`,
  };
}

export default async function PublicWorldPlacePage({ params }: PageProps) {
  const { kind } = await params;
  const place = asKind(kind);
  if (!place) notFound();
  const town = await listPublicWorldTown();
  return <PublicWorldTown town={town} activePlace={place} />;
}
