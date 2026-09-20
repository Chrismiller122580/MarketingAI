import { PublicNav } from "@/components/public-nav";

export default function WorldLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0b0a0d] text-zinc-100">
      <PublicNav />
      {children}
    </div>
  );
}
