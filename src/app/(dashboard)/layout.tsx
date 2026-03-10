import { Sidebar } from "@/widgets/sidebar/sidebar";
import { Topbar } from "@/widgets/topbar/topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#07111f] text-white">
      <div className="flex">
        <Sidebar />
        <div className="min-h-screen flex-1">
          <Topbar />
          <main className="p-6 md:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}