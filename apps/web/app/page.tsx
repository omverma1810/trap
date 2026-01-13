export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <main className="flex flex-col items-center gap-8 p-8">
        {/* Logo / Brand */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-2xl shadow-emerald-500/25">
            <span className="text-4xl font-bold text-white">T</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            TRAP Inventory System
          </h1>
          <p className="text-slate-400 text-lg">
            Enterprise-grade inventory management for luxury apparel
          </p>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-slate-800/50 border border-slate-700">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="text-emerald-400 font-medium">Frontend Running</span>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700 backdrop-blur">
            <h3 className="text-white font-semibold mb-2">Next.js 14</h3>
            <p className="text-slate-400 text-sm">App Router with TypeScript</p>
          </div>
          <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700 backdrop-blur">
            <h3 className="text-white font-semibold mb-2">TailwindCSS</h3>
            <p className="text-slate-400 text-sm">Modern utility-first styling</p>
          </div>
          <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700 backdrop-blur">
            <h3 className="text-white font-semibold mb-2">PNPM Monorepo</h3>
            <p className="text-slate-400 text-sm">Workspace-based architecture</p>
          </div>
        </div>

        {/* Version Info */}
        <p className="text-slate-500 text-sm mt-8">
          Phase 1 — Foundation Setup Complete
        </p>
      </main>
    </div>
  );
}
