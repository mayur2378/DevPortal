export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-2xl font-bold text-sky-400">⬡ DevPortal</span>
          <p className="text-slate-400 text-sm mt-1">Enterprise API Developer Portal</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl">
          {children}
        </div>
      </div>
    </div>
  );
}
