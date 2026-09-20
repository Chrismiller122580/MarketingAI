import type { Metadata } from "next";
import Link from "next/link";
import { listPublicWorldTown } from "@/lib/viraforge/avatar-world";

export const metadata: Metadata = {
  title: "Avatar World",
  description: "Meet the avatars you can use on crawlspark.ai.",
};

export default async function PublicWorldGalleryPage() {
  const { avatars, economy } = await listPublicWorldTown();
  const places = economy?.places ?? [];
  const listings = economy?.listings ?? [];

  return (
    <div className="min-h-screen bg-[#0b0a0d] text-zinc-100">
      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-700/40 via-[#0b0a0d] to-[#0b0a0d]" />
        <div className="relative mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <header className="flex items-center justify-between text-xs uppercase tracking-[0.22em] text-zinc-400">
            <Link href="/" className="hover:text-white">
              crawlspark.ai
            </Link>
            <span>Avatar World</span>
          </header>

          <section className="mt-10 max-w-2xl">
            <h1 className="text-4xl font-semibold tracking-tight">
              A town that lives without you
            </h1>
            <p className="mt-3 text-zinc-300">
              Residents work jobs, get paid in Sparks, pay rent, and buy
              groceries. If they're here, an admin allowed the public to use
              them in Content Studio.
            </p>
          </section>

          {places.length > 0 && (
            <section className="mt-10 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {places.map((place) => (
                <div
                  key={place.id}
                  className="min-w-0 rounded-3xl border border-white/10 bg-white/5 p-4"
                >
                  <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">
                    {place.name}
                  </p>
                  <p className="mt-2 truncate text-sm font-medium">
                    {place.keeperName ?? "Unattended"}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{place.note}</p>
                </div>
              ))}
            </section>
          )}

          {economy && (
            <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">
                    City Bank
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">
                    {economy.treasury.toLocaleString()} {economy.currencyLabel}
                  </p>
                </div>
                <p className="text-xs text-zinc-400">
                  Wages, rent, and groceries clear here every day.
                </p>
              </div>
              {listings.length > 0 && (
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {listings.map((row) => (
                    <li key={row.id} className="text-sm">
                      <p className="font-medium">
                        {row.title}{" "}
                        <span className="text-zinc-400">· {row.price} Sparks</span>
                      </p>
                      <p className="text-xs text-zinc-400">
                        {row.sellerName} · {row.kind}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {avatars.length === 0 ? (
            <p className="mt-16 text-sm text-zinc-400">
              No public avatars yet. Check back after the world opens a few doors.
            </p>
          ) : (
            <ul className="mt-10 grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {avatars.map((avatar) => (
                <li key={avatar.id} className="min-w-0">
                  <Link
                    href={`/world/${avatar.id}`}
                    className="flex h-full min-w-0 items-start gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 transition hover:border-violet-400/50 hover:bg-white/10"
                  >
                    <div className="h-20 w-16 shrink-0 overflow-hidden rounded-2xl bg-zinc-900">
                      {avatar.videoUrl ? (
                        <video
                          src={avatar.videoUrl}
                          muted
                          playsInline
                          autoPlay
                          loop
                          className="h-full w-full object-cover object-top"
                        />
                      ) : avatar.portraitUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatar.portraitUrl}
                          alt={avatar.displayName}
                          className="h-full w-full object-cover object-top"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-violet-300">
                          {avatar.displayName.slice(0, 1)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{avatar.displayName}</p>
                      <p className="truncate text-xs text-zinc-400">
                        @{avatar.handle}
                        {avatar.occupation ? ` · ${avatar.occupation}` : ""}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm text-zinc-300">
                        {avatar.bio || "A resident of Avatar World."}
                      </p>
                      <p className="mt-2 text-[11px] uppercase tracking-wide text-violet-300">
                        {avatar.mood}
                        {avatar.location ? ` · ${avatar.location}` : ""}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
