"use client";

import { useState } from "react";
import { Sidebar } from "@/widgets/sidebar/sidebar";
import { Topbar } from "@/widgets/topbar/topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#07111f] text-white">
  <div className="flex h-screen overflow-hidden">
    <Sidebar
      collapsed={sidebarCollapsed}
      onToggle={() => setSidebarCollapsed((prev) => !prev)}
    />
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <Topbar />
      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
    </div>
  </div>
</div>
  );
}