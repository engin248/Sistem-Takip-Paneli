export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white/5 backdrop-blur-md">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-2 border-slate-700 rounded-full" />
          <div className="absolute inset-0 border-2 border-t-white rounded-full animate-spin" />
        </div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">
          Sistem Takip Paneli YÜKLENİYOR
        </p>
      </div>
    </div>
  );
}

