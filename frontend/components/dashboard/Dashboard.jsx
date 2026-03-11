"use client";
import { useRef } from "react";
import KpiCards from "./KpiCards";
import ChartCard from "./ChartCard";
import ComboChart from "./ComboChart";
import DataTable from "./DataTable";
import InsightsPanel from "./InsightsPanel";
import ActionBar from "./ActionBar";

/**
 * Build a combo chart config from query result data.
 * Looks for one categorical/date column + two numeric columns.
 */
function buildComboChart(table) {
  if (!table || !table.data || table.data.length === 0) return null;

  const cols = table.columns || [];
  const data = table.data || [];

  // Find column types
  const numericCols = cols.filter(c => typeof data[0]?.[c] === "number");
  const catCols = cols.filter(c => typeof data[0]?.[c] === "string");
  const dateCols = cols.filter(c =>
    typeof data[0]?.[c] === "string" &&
    ["date","month","year","time"].some(x => c.toLowerCase().includes(x))
  );

  const xCol = dateCols[0] || catCols[0];

  // Need at least 2 numeric columns for a combo chart
  if (!xCol || numericCols.length < 2) return null;

  const barCol = numericCols[0];
  const lineCol = numericCols[1];

  return {
    title: `${barCol.replace(/_/g," ")} vs ${lineCol.replace(/_/g," ")} by ${xCol.replace(/_/g," ")}`,
    xData: data.map(r => String(r[xCol])),
    barData: data.map(r => r[barCol]),
    lineData: data.map(r => r[lineCol]),
    barLabel: barCol.replace(/_/g," ").replace(/\b\w/g, c => c.toUpperCase()),
    lineLabel: lineCol.replace(/_/g," ").replace(/\b\w/g, c => c.toUpperCase()),
    xLabel: xCol.replace(/_/g," ").replace(/\b\w/g, c => c.toUpperCase()),
  };
}

export default function Dashboard({ result }) {
  const dashboardRef = useRef(null);
  if (!result || !result.success) return null;
  const { dashboard, sql, question } = result;
  if (!dashboard) return null;
  const { kpis, summary, insights, charts, all_charts, table } = dashboard;

  // Try to build combo chart
  const comboChart = buildComboChart(table);

  // PDF Export
  const handleExportPDF = () => {
    const title = `DataSense AI — ${question}`;
    const originalBody = document.body.innerHTML;
    document.body.innerHTML = `
      <html><head><title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #1e293b; }
        h1 { color: #4f46e5; font-size: 22px; margin-bottom: 4px; }
        .subtitle { font-size: 12px; color: #64748b; margin-bottom: 24px; }
        .kpi-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 24px; }
        .kpi-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; }
        .kpi-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
        .kpi-value { font-size: 24px; font-weight: 800; color: #1e293b; margin: 4px 0; }
        .kpi-desc { font-size: 10px; color: #94a3b8; }
        .section { margin-bottom: 20px; }
        .section-title { font-size: 14px; font-weight: 700; color: #334155; margin-bottom: 10px; border-left: 3px solid #6366f1; padding-left: 8px; }
        .insight { font-size: 12px; color: #475569; margin-bottom: 5px; padding-left: 12px; }
        .summary { font-size: 12px; color: #475569; line-height: 1.7; background: #f8fafc; padding: 12px; border-radius: 8px; }
        .sql { background: #1e293b; color: #a3e635; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 11px; white-space: pre-wrap; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 8px; }
        th { background: #6366f1; color: white; padding: 8px 10px; text-align: left; }
        td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; }
        tr:nth-child(even) td { background: #f8fafc; }
        .footer { margin-top: 32px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px; }
        .badge { display: inline-block; background: #eef2ff; color: #6366f1; padding: 2px 8px; border-radius: 99px; font-size: 10px; font-weight: 600; }
      </style></head><body>
      <h1>📊 DataSense AI — Dashboard Report</h1>
      <div class="subtitle">
        <strong>Question:</strong> ${question} &nbsp;|&nbsp;
        <strong>Generated:</strong> ${new Date().toLocaleString()} &nbsp;
        <span class="badge">AI-Powered</span>
      </div>

      <div class="section">
        <div class="section-title">📌 Key Metrics</div>
        <div class="kpi-grid">
          ${(kpis||[]).map(k=>`
            <div class="kpi-card">
              <div class="kpi-label">${k.label}</div>
              <div class="kpi-value">${k.value}</div>
              <div class="kpi-desc">${k.description||""}</div>
            </div>`).join("")}
        </div>
      </div>

      ${summary ? `<div class="section"><div class="section-title">📝 Summary</div><div class="summary">${summary}</div></div>` : ""}

      ${(insights||[]).length > 0 ? `
        <div class="section">
          <div class="section-title">🤖 AI Insights</div>
          ${insights.map(i=>`<div class="insight">▸ ${i}</div>`).join("")}
        </div>` : ""}

      ${sql ? `<div class="section"><div class="section-title">⚙️ Generated SQL</div><div class="sql">${sql}</div></div>` : ""}

      ${table && table.data.length > 0 ? `
        <div class="section">
          <div class="section-title">📋 Data Table (${table.total_rows} rows)</div>
          <table>
            <thead><tr>${(table.columns||[]).map(c=>`<th>${c.replace(/_/g," ").toUpperCase()}</th>`).join("")}</tr></thead>
            <tbody>
              ${(table.data||[]).slice(0,25).map(row=>
                `<tr>${(table.columns||[]).map(c=>`<td>${row[c]??""}</td>`).join("")}</tr>`
              ).join("")}
            </tbody>
          </table>
        </div>` : ""}

      <div class="footer">Generated by DataSense AI &nbsp;•&nbsp; ${new Date().toLocaleDateString()} &nbsp;•&nbsp; Confidential</div>
      </body></html>`;
    window.print();
    document.body.innerHTML = originalBody;
    window.location.reload();
  };

  const cardBg = "bg-white border-gray-100";
  const textMain = "text-gray-900";
  const textSub = "text-gray-500";

  return (
    <div className="space-y-6 animate-fadeIn" ref={dashboardRef}>

      {/* Question header + PDF export */}
      <div className={`flex items-start justify-between gap-3 p-4 rounded-xl border ${cardBg}`}>
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow">
            💬
          </div>
          <div>
            <p className={`text-xs mb-0.5 ${textSub}`}>You asked</p>
            <p className={`text-sm font-semibold ${textMain}`}>{question}</p>
          </div>
        </div>
        {/* PDF Export */}
        <button onClick={handleExportPDF}
          className="shrink-0 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white text-xs font-bold rounded-xl hover:from-red-600 hover:to-rose-700 transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95">
          📄 Export PDF
        </button>
      </div>

      {/* KPI Cards */}
      {kpis?.length > 0 && <KpiCards kpis={kpis} />}

      {/* Action Bar */}
      <ActionBar dashboard={dashboard} question={question} />

      {/* ✨ COMBO CHART — shown first if available */}
      {comboChart && (
        <ComboChart chart={comboChart} className="w-full" />
      )}

      {/* Main chart */}
      {charts?.main && (
        <ChartCard chart={charts.main} className="w-full" />
      )}

      {/* Secondary charts side by side */}
      {(charts?.secondary || charts?.tertiary) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {charts.secondary && <ChartCard chart={charts.secondary} />}
          {charts.tertiary && <ChartCard chart={charts.tertiary} />}
        </div>
      )}

      {/* Extra charts */}
      {all_charts && all_charts.length > 3 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {all_charts.slice(3).map((chart, i) => (
            <ChartCard key={i} chart={chart} />
          ))}
        </div>
      )}

      {/* Insights Panel */}
      <InsightsPanel insights={insights} summary={summary} sql={sql} />

      {/* Data Table */}
      {table && (
        <DataTable
          columns={table.columns}
          data={table.data}
          totalRows={table.total_rows}
          truncated={table.truncated}
         
        />
      )}
    </div>
  );
}
