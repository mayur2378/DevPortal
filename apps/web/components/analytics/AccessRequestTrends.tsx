"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface DataPoint { month: string; approved: number; rejected: number; pending: number }
interface Props { data: DataPoint[] }

export function AccessRequestTrends({ data }: Props) {
  return (
    <div className="p-5 bg-slate-800/50 rounded-xl border border-slate-700/50">
      <p className="text-white font-semibold mb-4">Access Request Trends</p>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }} />
          <Legend />
          <Line type="monotone" dataKey="approved" stroke="#4ade80" strokeWidth={2} name="Approved" />
          <Line type="monotone" dataKey="rejected" stroke="#f87171" strokeWidth={2} name="Rejected" />
          <Line type="monotone" dataKey="pending" stroke="#facc15" strokeWidth={2} name="Pending" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
