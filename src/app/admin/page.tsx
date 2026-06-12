import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { AdminDashboard } from "@/components/admin-dashboard";

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/dashboard");

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Admin Stats</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Snapshot of users, payments, revenue, and platform data. Use the tabs for detailed management.
          </p>
        </div>
        <AdminDashboard />
      </div>
    </AppShell>
  );
}