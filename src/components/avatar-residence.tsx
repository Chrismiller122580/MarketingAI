import Link from "next/link";

export type ResidencePerson = {
  id: string;
  name: string;
  role: string;
  detail?: string;
  portraitUrl?: string;
  href?: string;
};

export type ResidenceNight = {
  id: string;
  place?: string;
  line: string;
};

export type ResidenceView = {
  name: string;
  handle: string;
  portraitUrl?: string;
  occupation?: string;
  mood?: string;
  city?: string;
  street: string;
  keepPlace?: string;
  keepPlaceKind?: string;
  household: ResidencePerson[];
  neighbors: ResidencePerson[];
  nights: ResidenceNight[];
  profileHref: string;
  townHref: string;
  tone: "public" | "admin";
};

function Face({
  name,
  portraitUrl,
  dark,
}: {
  name: string;
  portraitUrl?: string;
  dark: boolean;
}) {
  return (
    <div
      className={`h-12 w-10 shrink-0 overflow-hidden rounded-xl ${
        dark ? "bg-zinc-900" : "bg-muted"
      }`}
    >
      {portraitUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={portraitUrl}
          alt={name}
          className="h-full w-full object-cover object-top"
        />
      ) : (
        <div
          className={`flex h-full w-full items-center justify-center text-sm font-semibold ${
            dark ? "text-violet-300" : "text-violet-600"
          }`}
        >
          {name.slice(0, 1)}
        </div>
      )}
    </div>
  );
}

function PersonRow({
  person,
  dark,
}: {
  person: ResidencePerson;
  dark: boolean;
}) {
  const name = person.href ? (
    <Link href={person.href} className="font-medium hover:underline">
      {person.name}
    </Link>
  ) : (
    <span className="font-medium">{person.name}</span>
  );
  return (
    <li className="flex min-w-0 items-center gap-3">
      <Face name={person.name} portraitUrl={person.portraitUrl} dark={dark} />
      <div className="min-w-0">
        <p className="truncate text-sm">
          {name}{" "}
          <span className={dark ? "text-zinc-500" : "text-muted-foreground"}>
            · {person.role}
          </span>
        </p>
        {person.detail && (
          <p
            className={`truncate text-xs ${
              dark ? "text-zinc-400" : "text-muted-foreground"
            }`}
          >
            {person.detail}
          </p>
        )}
      </div>
    </li>
  );
}

export function AvatarResidence({ home }: { home: ResidenceView }) {
  const dark = home.tone === "public";
  const card = dark
    ? "rounded-3xl border border-white/10 bg-white/5 p-5"
    : "rounded-2xl border border-border bg-card p-5";
  const muted = dark ? "text-zinc-400" : "text-muted-foreground";
  const address = [home.street || "the neighborhood", home.city]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={dark ? "relative isolate overflow-hidden" : "min-w-0 space-y-6"}>
      {dark && (
        <div className="absolute inset-0 bg-gradient-to-b from-amber-700/30 via-[#0b0a0d] to-[#0b0a0d]" />
      )}
      <div
        className={
          dark
            ? "relative mx-auto flex max-w-5xl flex-col gap-8 px-4 pb-20 pt-10 sm:px-6"
            : "space-y-6"
        }
      >
        <section className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-end">
          <div
            className={`h-40 w-32 shrink-0 overflow-hidden rounded-[24px] ${
              dark
                ? "border border-white/10 bg-zinc-900"
                : "border border-border bg-muted"
            }`}
          >
            {home.portraitUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={home.portraitUrl}
                alt={home.name}
                className="h-full w-full object-cover object-top"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-2xl font-semibold text-violet-400">
                {home.name.slice(0, 1)}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={`text-xs uppercase tracking-[0.22em] ${
                dark ? "text-amber-200" : "text-amber-700 dark:text-amber-300"
              }`}
            >
              Residence
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              {home.name}'s place
            </h1>
            <p className={`mt-2 text-sm ${muted}`}>
              @{home.handle}
              {home.occupation ? ` · ${home.occupation}` : ""}
            </p>
            <p className="mt-3 text-lg">{address}</p>
            {home.mood && (
              <p className={`mt-1 text-sm ${muted}`}>Tonight they feel {home.mood}.</p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href={home.profileHref}
                className={
                  dark
                    ? "inline-flex rounded-full bg-violet-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-400"
                    : "inline-flex rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                }
              >
                Profile
              </Link>
              <Link
                href={home.townHref}
                className={
                  dark
                    ? "inline-flex rounded-full border border-white/15 px-4 py-2 text-sm text-zinc-200 hover:bg-white/10"
                    : "inline-flex rounded-full border border-border px-4 py-2 text-sm hover:bg-muted"
                }
              >
                Back to the town
              </Link>
              {home.keepPlaceKind && home.keepPlace && (
                <Link
                  href={`/world/place/${home.keepPlaceKind}`}
                  className={
                    dark
                      ? "inline-flex rounded-full border border-white/15 px-4 py-2 text-sm text-zinc-200 hover:bg-white/10"
                      : "inline-flex rounded-full border border-border px-4 py-2 text-sm hover:bg-muted"
                  }
                >
                  Keeps {home.keepPlace}
                </Link>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className={card}>
            <p className={`text-xs uppercase tracking-[0.18em] ${muted}`}>
              Who lives here
            </p>
            {home.household.length === 0 ? (
              <p className={`mt-3 text-sm ${muted}`}>
                They keep this place to themselves. The street still knows them.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {home.household.map((person) => (
                  <PersonRow key={person.id} person={person} dark={dark} />
                ))}
              </ul>
            )}
          </div>
          <div className={card}>
            <p className={`text-xs uppercase tracking-[0.18em] ${muted}`}>
              On {home.street || "this street"}
            </p>
            {home.neighbors.length === 0 ? (
              <p className={`mt-3 text-sm ${muted}`}>
                No one else has settled on this street yet.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {home.neighbors.map((person) => (
                  <PersonRow key={person.id} person={person} dark={dark} />
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className={card}>
          <p className={`text-xs uppercase tracking-[0.18em] ${muted}`}>
            Came home from
          </p>
          {home.nights.length === 0 ? (
            <p className={`mt-3 text-sm ${muted}`}>
              They haven't been out yet. After they live a day, the lake, the
              park, the bar, or the rec hall shows up here.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {home.nights.map((night) => (
                <li key={night.id} className="text-sm">
                  {night.place && (
                    <p
                      className={`text-[11px] uppercase tracking-[0.18em] ${
                        dark ? "text-amber-200" : "text-amber-700 dark:text-amber-300"
                      }`}
                    >
                      {night.place}
                    </p>
                  )}
                  <p className="mt-1">{night.line}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
