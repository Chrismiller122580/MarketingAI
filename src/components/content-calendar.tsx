"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { usePosts } from "@/context/posts-context";
import type { SavedPost } from "@/lib/types";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "bg-pink-100 text-pink-700 border-pink-200",
  twitter: "bg-sky-100 text-sky-700 border-sky-200",
  linkedin: "bg-blue-100 text-blue-700 border-blue-200",
  facebook: "bg-crawl-100 text-crawl-700 border-crawl-100",
  pinterest: "bg-rose-100 text-rose-700 border-rose-200",
};

function DraggablePost({ post }: { post: SavedPost }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: post.id, data: { post } });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const color =
    PLATFORM_COLORS[post.platform] ?? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`cursor-grab rounded border px-2 py-1.5 text-[11px] font-medium active:cursor-grabbing ${color} ${isDragging ? "opacity-40" : ""}`}
    >
      <span className="capitalize">{post.platform}</span>
      <p className="mt-0.5 line-clamp-1 font-normal opacity-80">
        {post.text.slice(0, 40)}…
      </p>
      {post.publishStatus === "published" && (
        <span className="text-[9px] text-emerald-600">✓ published</span>
      )}
    </div>
  );
}

function DroppableDay({
  dayKey,
  label,
  dateNum,
  posts,
  isToday,
}: {
  dayKey: string;
  label: string;
  dateNum: number;
  posts: SavedPost[];
  isToday: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dayKey });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[140px] bg-white dark:bg-slate-900 p-2 transition ${
        isOver ? "bg-amber-50 ring-2 ring-inset ring-amber-300" : ""
      }`}
    >
      <div className="mb-2 text-center">
        <p className="text-xs font-medium text-slate-400 dark:text-slate-500">{label}</p>
        <p
          className={`text-sm font-semibold ${isToday ? "text-amber-600" : "text-slate-900 dark:text-slate-100"}`}
        >
          {dateNum}
        </p>
      </div>
      <div className="space-y-1.5">
        {posts.map((post) => (
          <DraggablePost key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}

export function ContentCalendar() {
  const { posts, schedulePost } = usePosts();
  const [activePost, setActivePost] = useState<SavedPost | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    // Touch support for Android / iOS drag and drop on the calendar
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    }),
  );

  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + weekOffset * 7);

  const todayKey = today.toISOString().split("T")[0];

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    const key = date.toISOString().split("T")[0];
    return {
      label: DAY_LABELS[i],
      dateNum: date.getDate(),
      key,
      isToday: key === todayKey,
      posts: posts.filter((p) => p.scheduledFor === key),
    };
  });

  const unscheduled = posts.filter((p) => !p.scheduledFor);

  function handleDragStart(event: DragStartEvent) {
    const post = posts.find((p) => p.id === event.active.id);
    if (post) setActivePost(post);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActivePost(null);
    const { active, over } = event;
    if (!over) return;

    const dayKey = over.id as string;
    if (dayKey.startsWith("20")) {
      schedulePost(active.id as string, dayKey);
    } else if (dayKey === "unscheduled") {
      schedulePost(active.id as string, undefined);
    }
  }

  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white dark:bg-slate-900 p-8 text-center">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No posts yet</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Generate content, then drag posts onto the calendar to schedule.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Content calendar
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Drag posts to schedule · {posts.filter((p) => p.scheduledFor).length}{" "}
            scheduled
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setWeekOffset((w) => w - 1)}
            className="rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-1 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => setWeekOffset(0)}
            className="rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-1 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setWeekOffset((w) => w + 1)}
            className="rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-1 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            →
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {unscheduled.length > 0 && (
          <UnscheduledPool posts={unscheduled} />
        )}

        <div className="grid grid-cols-7 gap-px bg-slate-200 p-px">
          {weekDays.map((day) => (
            <DroppableDay
              key={day.key}
              dayKey={day.key}
              label={day.label}
              dateNum={day.dateNum}
              posts={day.posts}
              isToday={day.isToday}
            />
          ))}
        </div>

        <DragOverlay>
          {activePost ? (
            <div className="rounded border border-amber-300 bg-amber-50 px-2 py-1.5 text-[11px] font-medium text-amber-700 shadow-lg">
              {activePost.platform}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function UnscheduledPool({ posts }: { posts: SavedPost[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: "unscheduled" });

  return (
    <div
      ref={setNodeRef}
      className={`border-b border-slate-200 dark:border-slate-800 px-6 py-3 ${isOver ? "bg-amber-50" : "bg-slate-50 dark:bg-slate-950"}`}
    >
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
        Unscheduled ({posts.length}) — drag to a day
      </p>
      <div className="flex flex-wrap gap-2">
        {posts.map((post) => (
          <div key={post.id} className="w-36">
            <DraggablePost post={post} />
          </div>
        ))}
      </div>
    </div>
  );
}