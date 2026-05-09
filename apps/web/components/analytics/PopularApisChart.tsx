"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface DataPoint { name: string; calls: number; consumers: number }
interface Props { data: DataPoint[] }

export function PopularApisChart({ data }: Props) {
  return (
    <div className="p-5 bg-slate-800/50 rounded-xl border border-slate-700/50">
      <p className="text-white font-semibold mb-4">Popular APIs — Total Calls</p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} angle={-35} textAnchor="end" />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }} labelStyle={{ color: "#f1f5f9" }} />
          <Bar dataKey="calls" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Total Calls" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
