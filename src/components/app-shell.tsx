"use client";

import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { AppLoader } from "./app-loader";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AppLoader>
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="flex-1 overflow-y-auto p-8">{children}</main>
        </div>
      </div>
    </AppLoader>
  );
}