import { AppShell } from "@/components/app-shell";
import { ContentCalendar } from "@/components/content-calendar";
import { PostsLibrary } from "@/components/posts-library";

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