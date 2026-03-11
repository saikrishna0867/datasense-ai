/**
 * KpiCards.jsx — Animated KPI summary cards with dark mode support.
 */
"use client";
import { useEffect, useState } from "react";

const ICONS = ["📊", "💰", "📦", "📈"];
const COLORS = [
  "from-indigo-50 to-indigo-100 border-indigo-200",
  "from-amber-50 to-amber-100 border-amber-200",
  "from-emerald-50 to-emerald-100 border-emerald-200",
  "from-purple-50 to-purple-100 border-purple-200",
];
const DARK_COLORS = [
  "dark:from-indigo-900/30 dark:to-indigo-800/20 dark:border-indigo-700",
  "dark:from-amber-900/30 dark:to-amber-800/20 dark:border-amber-700",
  "dark:from-emerald-900/30 dark:to-emerald-800/20 dark:border-emerald-700",
  "dark:from-purple-900/30 dark:to-purple-800/20 dark:border-purple-700",
];

export default function KpiCards({ kpis = [] }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 50); }, []);
  if (!kpis || kpis.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2 stagger-children">
      {kpis.map((kpi, i) => (
        <div key={i}
          className={`kpi-enter bg-gradient-to-br ${COLORS[i % 4]} ${DARK_COLORS[i % 4]}
            rounded-xl border p-4 flex flex-col gap-1 hover:shadow-md transition-all
            hover:-translate-y-0.5 cursor-default`}
          style={{ animationDelay: `${i * 0.1}s` }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide truncate">
              {kpi.label}
            </span>
            <span className="text-lg">{ICONS[i % 4]}</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
          {kpi.description && (
            <div className="text-xs text-gray-400 truncate">{kpi.description}</div>
          )}
        </div>
      ))}
    </div>
  );
}
