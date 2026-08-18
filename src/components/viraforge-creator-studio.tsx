"use client";

export function ViraForgeCreatorStudio() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm font-semibold text-violet-600 dark:text-violet-400">ViraForge</span>
        <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600 dark:text-emerald-400">LEARNING BETA</span>
      </div>
      <h2 className="text-2xl font-bold text-foreground">Create New Influencer Avatar</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        The full Creator Studio is being restored. The Avatar Name Generator files are already on main.
        Please wait a moment and refresh, or open a Codespace and drop the fixed file from the artifacts.
      </p>
      <p className="mt-4 text-xs text-muted-foreground">
        Fixed file ready at artifacts/viraforge-creator-studio-FIXED.tsx (includes AvatarNameGenerator on the Physical tab).
      </p>
    </div>
  );
}
