"use client";
import { useState } from "react";
interface Props { clientId: string; clientSecret: string }
export function MockCredentials({ clientId, clientSecret }: Props) {
  const [show, setShow] = useState(false);
  return (
    <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 space-y-2">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mock Credentials <span className="ml-2 text-amber-400 font-normal normal-case">Demo only — not real gateway credentials</span></p>
      <div className="font-mono text-xs space-y-1">
        <div className="flex items-center gap-2"><span className="text-slate-500 w-24">Client ID:</span><span className="text-slate-200">{clientId}</span></div>
        <div className="flex items-center gap-2"><span className="text-slate-500 w-24">Secret:</span>{show ? <span className="text-slate-200">{clientSecret}</span> : <span className="text-slate-500">••••••••••••</span>}<button type="button" onClick={() => setShow(!show)} className="text-xs text-sky-400 hover:text-sky-300">{show ? "Hide" : "Reveal"}</button></div>
      </div>
    </div>
  );
}
