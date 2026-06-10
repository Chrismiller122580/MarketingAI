"use client";

import { usePosts } from "@/context/posts-context";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ContentCalendar() {
  const { posts } = usePosts();

  const scheduled = posts.filter((p) => p.scheduledFor);
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    const key = date.toISOString().split("T")[0];
    return {
      label: DAY_LABELS[i],
      date: date.getDate(),
      key,
      posts: scheduled.filter((p) => p.scheduledFor === key),
    };
  });

  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-sm font-medium text-slate-700">No scheduled content</p>
        <p className="mt-1 text-sm text-slate-500">
          Generate a campaign pack to auto-schedule posts across the week.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-base font-semibold text-slate-900">
          Content calendar
        </h2>
        <p className="text-sm text-slate-500">
          {scheduled.length} scheduled · {posts.length} total posts in library
        </p>
      </div>

      <div className="grid grid-cols-7 gap-px bg-slate-200 p-px">
        {weekDays.map((day) => (
          <div key={day.key} className="min-h-[120px] bg-white p-2">
            <div className="mb-2 text-center">
              <p className="text-xs font-medium text-slate-400">{day.label}</p>
              <p className="text-sm font-semibold text-slate-900">{day.date}</p>
            </div>
            <div className="space-y-1">
              {day.posts.map((post) => (
                <div
                  key={post.id}
                  className="rounded bg-indigo-50 px-1.5 py-1 text-[10px] font-medium text-indigo-700"
                >
                  {post.platform}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}