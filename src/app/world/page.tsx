import type { Metadata } from "next";
import Link from "next/link";
import { listPublicWorldAvatars } from "@/lib/viraforge/avatar-world";

export const metadata: Metadata = {
  title: "Avatar World",
  description: "Meet the avatars you can use on crawlspark.ai.",
};

export default async function PublicWorldGalleryPage() {
  const avatars = await listPublicWorldAvatars();

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
              Avatars you can use
            </h1>
            <p className="mt-3 text-zinc-300">
              These residents live on their own. If they're here, an admin
              allowed the public to use them in Content Studio.
            </p>
          </section>

          {avatars.length === 0 ? (
            <p className="mt-16 text-sm text-zinc-400">
              No public avatars yet. Check back after the world opens a few doors.
            </p>
          ) : (
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {avatars.map((avatar) => (
                <li key={avatar.id}>
                  <Link
                    href={`/world/${avatar.id}`}
                    className="flex h-full gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 transition hover:border-violet-400/50 hover:bg-white/10"
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
