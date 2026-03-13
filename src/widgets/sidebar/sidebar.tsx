"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Workflow,
  History,
  PlaySquare,
  BarChart3,
  Shield,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";

const items = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Workflows", href: "/workflows", icon: Workflow },
  { label: "History", href: "/history", icon: History },
  { label: "Executions", href: "/executions", icon: PlaySquare },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "API Docs", href: "/api-docs", icon: FileText },
];

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
  className={cn(
    "sticky top-0 hidden h-screen shrink-0 border-r border-white/10 bg-[#08101d] px-4 py-6 transition-all duration-300 lg:block",
    collapsed ? "w-24" : "w-70"
  )}
>
  <div className="mb-8">
    {collapsed ? (
      <div className="flex flex-col items-center gap-7">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-cyan-400 to-violet-500 shadow-lg shadow-cyan-500/20">
          <Shield className="h-5 w-5 text-white" />
        </div>

        <button
          type="button"
          onClick={onToggle}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
          aria-label="Expand sidebar"
          title="Expand sidebar"
        >
          <PanelLeftOpen className="h-5 w-5" />
        </button>
      </div>
    ) : (
      <div className="flex items-center justify-between gap-3 px-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-cyan-400 to-violet-500 shadow-lg shadow-cyan-500/20">
            <Shield className="h-5 w-5 text-white" />
          </div>

          <div>
            <p className="text-sm text-white/50">Automation Suite</p>
            <h2 className="text-lg font-semibold">AutoFlow</h2>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggle}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
        >
          <PanelLeftClose className="h-5 w-5" />
        </button>
      </div>
    )}
  </div>

  <nav className="space-y-2">
    {items.map((item) => {
      const Icon = item.icon;
      const active = pathname === item.href;

      return (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex rounded-2xl text-sm transition",
            collapsed
              ? "justify-center px-3 py-3"
              : "items-center gap-3 px-4 py-3",
            active
              ? "bg-white text-slate-900"
              : "text-white/70 hover:bg-white/5 hover:text-white"
          )}
          title={collapsed ? item.label : undefined}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {!collapsed ? item.label : null}
        </Link>
      );
    })}
  </nav>
</aside>
  );
}