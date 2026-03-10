import { Bell, Search } from "lucide-react";

export function Topbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#07111f]/80 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4 px-6 py-4 md:px-8">
        <div className="flex w-full max-w-xl items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <Search className="h-4 w-4 text-white/40" />
          <input
            placeholder="Поиск workflows, executions, logs..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-white/35"
          />
        </div>

        <button className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10">
          <Bell className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}