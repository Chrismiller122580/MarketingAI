import Link from "next/link";
import type { PublicWorldProfile } from "@/lib/viraforge/avatar-world";

export function AvatarPublicProfile({
  profile,
}: {
  profile: PublicWorldProfile;
}) {
  const videos = profile.videos.filter(
    (row) =>
      (row.type === "motion" || row.type === "merged" || row.type === "portrait") &&
      row.url,
  );
  const motion = videos.filter((row) => row.type !== "portrait");
  const useHref = `/content?influencer=${encodeURIComponent(profile.id)}`;

  return (
    <div className="relative isolate overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-violet-700/50 via-[#0b0a0d] to-[#0b0a0d]" />
      {profile.assets.portraitUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.assets.portraitUrl}
          alt=""
          className="absolute inset-0 h-[28rem] w-full object-cover object-top opacity-25"
        />
      )}
      <div className="relative mx-auto flex max-w-5xl flex-col gap-8 px-4 pb-20 pt-10 sm:px-6">
        <section className="flex min-w-0 flex-col gap-6 sm:flex-row sm:items-end">
          <div className="h-44 w-36 shrink-0 overflow-hidden rounded-[28px] border border-white/10 bg-zinc-900 shadow-2xl shadow-violet-950/40">
            {profile.assets.videoUrl ? (
              <video
                src={profile.assets.videoUrl}
                autoPlay
                muted
                loop
                playsInline
                className="h-full w-full object-cover object-top"
              />
            ) : profile.assets.portraitUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.assets.portraitUrl}
                alt={profile.displayName}
                className="h-full w-full object-cover object-top"
              />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-violet-200">@{profile.handle}</p>
            <h1 className="mt-1 truncate text-4xl font-semibold tracking-tight">
              {profile.displayName}
            </h1>
            <p className="mt-2 max-w-xl line-clamp-4 text-zinc-300">
              {profile.world.bio || profile.persona.personalityVoice}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-white/10 px-3 py-1">
                {profile.world.mood}
                {profile.world.moodNote ? ` · ${profile.world.moodNote}` : ""}
              </span>
              {profile.world.occupation && (
                <span className="rounded-full bg-white/10 px-3 py-1">
                  {profile.world.occupation}
                </span>
              )}
              {profile.street && (
                <span className="rounded-full bg-white/10 px-3 py-1">
                  {profile.street}
                </span>
              )}
              {profile.keepPlaceKind && profile.keepPlace && (
                <Link
                  href={`/world/place/${profile.keepPlaceKind}`}
                  className="rounded-full bg-violet-500/30 px-3 py-1 hover:bg-violet-500/50"
                >
                  Keeps {profile.keepPlace}
                </Link>
              )}
              <span className="rounded-full bg-white/10 px-3 py-1">
                {profile.world.currentCity || profile.persona.location}
              </span>
              {profile.world.relationshipStatus && (
                <span className="rounded-full bg-white/10 px-3 py-1">
                  {profile.world.relationshipStatus}
                </span>
              )}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href={useHref}
                className="inline-flex rounded-full bg-violet-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-400"
              >
                Use this avatar
              </Link>
              <Link
                href={`/world/${profile.id}/residence`}
                className="inline-flex rounded-full border border-white/15 px-4 py-2 text-sm text-zinc-200 hover:bg-white/10"
              >
                Their home
              </Link>
              <Link
                href="/world"
                className="inline-flex rounded-full border border-white/15 px-4 py-2 text-sm text-zinc-200 hover:bg-white/10"
              >
                Back to the town
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur sm:grid-cols-3">
          <Stat label="Clips" value={motion.length} />
          <Stat label="Posts" value={profile.posts.length} />
          <Stat label="Life events" value={profile.events.length} />
        </section>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="space-y-6">
            <article className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">
                Backstory
              </p>
              <p className="mt-3 whitespace-pre-wrap text-zinc-200">
                {profile.world.backstory}
              </p>
              {profile.world.catchphrase && (
                <p className="mt-4 text-lg italic text-amber-100">
                  “{profile.world.catchphrase}”
                </p>
              )}
            </article>

            {profile.world.values.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {profile.world.values.map((value) => (
                  <span
                    key={value}
                    className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300"
                  >
                    {value}
                  </span>
                ))}
              </div>
            )}

            {motion.length > 0 && (
              <div>
                <p className="mb-3 text-xs uppercase tracking-[0.18em] text-zinc-400">
                  Vault
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {motion.slice(0, 9).map((clip) => (
                    <video
                      key={clip.id}
                      src={clip.url ?? undefined}
                      controls
                      playsInline
                      className="aspect-[9/16] w-full rounded-2xl bg-black object-cover"
                    />
                  ))}
                </div>
              </div>
            )}

            {profile.posts.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">
                  Recent posts
                </p>
                {(profile.threads?.length
                  ? profile.threads
                  : profile.posts.map((post) => ({ ...post, replies: [] }))
                ).map((thread) => (
                  <article
                    key={thread.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <p className="text-xs text-violet-200">@{thread.handle}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-100">
                      {thread.text}
                    </p>
                    {thread.worldBeat && (
                      <p className="mt-2 text-xs italic text-amber-100/80">
                        {thread.worldBeat}
                      </p>
                    )}
                    <p className="mt-2 text-[11px] text-zinc-500">
                      {thread.platform} ·{" "}
                      {new Date(thread.createdAt).toLocaleDateString()}
                    </p>
                    {"replies" in thread &&
                      thread.replies.map((reply) => (
                        <div
                          key={reply.id}
                          className="mt-3 border-l border-white/15 pl-3"
                        >
                          <p className="text-xs text-violet-200">
                            @{reply.handle} added
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-200">
                            {reply.text}
                          </p>
                        </div>
                      ))}
                  </article>
                ))}
              </div>
            )}

            {profile.chats.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">
                  Where they ran into people
                </p>
                {profile.chats.map((chat) => (
                  <article
                    key={chat.conversationId}
                    className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4"
                  >
                    {chat.placeName && (
                      <p className="text-[11px] uppercase tracking-[0.18em] text-violet-200">
                        At {chat.placeName}
                      </p>
                    )}
                    <ol className="mt-3 space-y-2 text-sm">
                      {chat.turns.map((turn, index) => (
                        <li key={`${chat.id}-${turn.influencerId}-${index}`}>
                          <span className="text-violet-200">
                            {turn.displayName}
                          </span>{" "}
                          <span className="text-zinc-200">{turn.text}</span>
                        </li>
                      ))}
                    </ol>
                  </article>
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">
                Life
              </p>
              <ol className="mt-4 space-y-4">
                {profile.events.slice(0, 10).map((event) => (
                  <li key={event.id} className="border-l border-white/15 pl-3">
                    <p className="text-sm font-medium">{event.title}</p>
                    <p className="mt-1 text-sm text-zinc-400">{event.body}</p>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      {new Date(event.createdAt).toLocaleDateString()}
                    </p>
                  </li>
                ))}
              </ol>
            </div>

            {profile.nearby.length > 0 && (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">
                  On {profile.street || "this street"}
                </p>
                <ul className="mt-3 space-y-2 text-sm">
                  {profile.nearby.map((row) => (
                    <li key={row.id}>
                      {row.isPublic ? (
                        <Link
                          href={`/world/${row.id}`}
                          className="text-violet-200 hover:underline"
                        >
                          {row.displayName}
                        </Link>
                      ) : (
                        <span>{row.displayName}</span>
                      )}
                      <span className="text-zinc-500">
                        {" "}
                        · {row.occupation || row.mood}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {profile.world.relationships.length > 0 && (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">
                  People
                </p>
                <ul className="mt-3 space-y-2 text-sm">
                  {profile.world.relationships.map((rel) => (
                    <li key={rel.influencerId}>
                      {profile.publicIds.includes(rel.influencerId) ? (
                        <Link
                          href={`/world/${rel.influencerId}`}
                          className="text-violet-200 hover:underline"
                        >
                          {rel.displayName}
                        </Link>
                      ) : (
                        <span>{rel.displayName}</span>
                      )}
                      <span className="text-zinc-500"> · {rel.kind}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {profile.world.learnedNotes.length > 0 && (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">
                  Learned
                </p>
                <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                  {profile.world.learnedNotes.slice(0, 5).map((note) => (
                    <li key={note}>“{note}”</li>
                  ))}
                </ul>
              </div>
            )}

            {profile.world.sharedLore.length > 0 && (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">
                  World story
                </p>
                <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                  {profile.world.sharedLore.slice(0, 6).map((beat) => (
                    <li key={beat}>✦ {beat}</li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-400">
        {label}
      </p>
    </div>
  );
}
