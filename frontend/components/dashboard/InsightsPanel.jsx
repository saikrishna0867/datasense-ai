"use client";
import { useState } from "react";
export default function InsightsPanel({ insights=[], summary="", sql="", darkMode }) {
  const [showSql, setShowSql] = useState(false);
  if (!insights.length && !summary) return null;
  const panelBg = darkMode ? "bg-slate-700/50 border-slate-600" : "bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-100";
  const textMain = darkMode ? "text-slate-200" : "text-gray-700";
  const textSub = darkMode ? "text-slate-400" : "text-gray-600";
  const titleColor = darkMode ? "text-indigo-300" : "text-indigo-800";
  return (
    <div className={`rounded-xl border p-4 ${panelBg}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🤖</span>
        <h3 className={`text-sm font-bold ${titleColor}`}>AI Insights</h3>
      </div>
      {summary && <p className={`text-sm mb-3 leading-relaxed ${textMain}`}>{summary}</p>}
      {insights.length > 0 && (
        <ul className="space-y-1.5">
          {insights.map((insight, i) => (
            <li key={i} className={`flex items-start gap-2 text-xs ${textSub}`}>
              <span className="text-indigo-400 mt-0.5 shrink-0">▸</span>
              <span>{insight}</span>
            </li>
          ))}
        </ul>
      )}
      {sql && (
        <div className="mt-3 pt-3 border-t border-indigo-100/50">
          <button onClick={() => setShowSql(s => !s)}
            className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1">
            <span>{showSql?"▾":"▸"}</span> {showSql?"Hide":"Show"} Generated SQL
          </button>
          {showSql && (
            <pre className="mt-2 text-xs bg-gray-900 text-green-400 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
              {sql}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
