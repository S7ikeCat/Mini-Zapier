"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Workflow,
  History,
  PlaySquare,
  BarChart3,
  Settings,
  Shield,
  FileText,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";

const items = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Workflows", href: "/workflows", icon: Workflow },
  { label: "History", href: "/history", icon: History },
  { label: "Executions", href: "/executions", icon: PlaySquare },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "API Docs", href: "/api-docs", icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-70 shrink-0 border-r border-white/10 bg-[#08101d] px-4 py-6 lg:block">
      <div className="mb-8 flex items-center gap-3 px-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-cyan-400 to-violet-500 shadow-lg shadow-cyan-500/20">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm text-white/50">Automation Suite</p>
          <h2 className="text-lg font-semibold">AutoFlow</h2>
        </div>
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
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition",
                active
                  ? "bg-white text-slate-900"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm font-medium">System health</p>
        <div className="mt-4 space-y-3 text-sm text-white/60">
          <div className="flex items-center justify-between">
            <span>Workers</span>
            <span className="text-emerald-300">Online</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Queue</span>
            <span className="text-emerald-300">Stable</span>
          </div>
          <div className="flex items-center justify-between">
            <span>API</span>
            <span className="text-emerald-300">Healthy</span>
          </div>
        </div>
      </div>
    </aside>
  );
}