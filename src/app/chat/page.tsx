import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { AvatarChat } from "@/components/avatar-chat";
import { CreatorGate } from "@/components/creator-gate";

export default function ChatPage() {
  return (
    <AppShell>
      <CreatorGate title="Avatar chat">
        <Suspense>
          <AvatarChat />
        </Suspense>
      </CreatorGate>
    </AppShell>
  );
}
