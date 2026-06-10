import { AppShell } from "@/components/app-shell";
import { PostsLibrary } from "@/components/posts-library";
import { ContentCalendar } from "@/components/content-calendar";

export default function PostsPage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <ContentCalendar />
        <PostsLibrary />
      </div>
    </AppShell>
  );
}