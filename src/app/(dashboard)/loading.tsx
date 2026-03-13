export default function DashboardLoading() {
    return (
      <div className="fixed inset-0 z-100 bg-[#020817]/35 backdrop-blur-[2px]">
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
          <div className="relative h-14 w-14">
            <div className="absolute inset-0 rounded-full border border-cyan-400/20" />
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-cyan-300 border-r-cyan-400" />
            <div className="absolute inset-2 rounded-full border border-white/10" />
          </div>
  
          <p className="mt-3 text-sm leading-none text-white/65">Loading...</p>
        </div>
      </div>
    );
  }