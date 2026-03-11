"use client";
import { useEffect, useRef } from "react";

export default function ComboChart({ chart, className = "" }) {
  const plotRef = useRef(null);

  useEffect(() => {
    if (!chart || !plotRef.current) return;
    import("plotly.js-dist-min").then((Plotly) => {
      const layout = {
        title: { text: chart.title, font: { size: 14, color: "#374151", family: "Inter, sans-serif" } },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        font: { family: "Inter, sans-serif", size: 12, color: "#374151" },
        margin: { l: 60, r: 60, t: 60, b: 60 },
        autosize: true,
        legend: { orientation: "h", y: -0.2 },
        xaxis: { title: chart.xLabel || "", gridcolor: "#f1f5f9" },
        yaxis: { title: chart.barLabel || "Revenue", gridcolor: "#f1f5f9" },
        yaxis2: { title: chart.lineLabel || "Quantity", overlaying: "y", side: "right", gridcolor: "transparent" },
        bargap: 0.3,
      };
      const traces = [
        {
          x: chart.xData, y: chart.barData, type: "bar",
          name: chart.barLabel || "Revenue",
          marker: { color: "#6366f1", opacity: 0.85 },
          hovertemplate: `<b>%{x}</b><br>${chart.barLabel || "Revenue"}: %{y:,.0f}<extra></extra>`,
        },
        {
          x: chart.xData, y: chart.lineData, type: "scatter", mode: "lines+markers",
          name: chart.lineLabel || "Quantity", yaxis: "y2",
          line: { color: "#f59e0b", width: 3, shape: "spline" },
          marker: { color: "#f59e0b", size: 8 },
          hovertemplate: `<b>%{x}</b><br>${chart.lineLabel || "Quantity"}: %{y:,.0f}<extra></extra>`,
        },
      ];
      Plotly.react(plotRef.current, traces, layout, { responsive: true, displayModeBar: true, modeBarButtonsToRemove: ["pan2d","lasso2d","select2d"], displaylogo: false });
    });
    return () => { if (plotRef.current) import("plotly.js-dist-min").then(P => P.purge(plotRef.current)); };
  }, [chart]);

  if (!chart) return null;
  return (
    <div className={`rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden animate-fadeIn ${className}`}>
      <div className="px-4 pt-4 flex items-center gap-2">
        <span className="text-base">📊</span>
        <h3 className="text-sm font-semibold text-gray-700">{chart.title}</h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">Combo</span>
      </div>
      <p className="px-4 text-xs text-gray-400 mt-1">
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-indigo-500 inline-block" />{chart.barLabel || "Revenue"} (bars)</span>
        <span className="mx-2">+</span>
        <span className="inline-flex items-center gap-1"><span className="w-4 h-0.5 bg-amber-400 inline-block" />{chart.lineLabel || "Quantity"} (line)</span>
      </p>
      <div ref={plotRef} className="w-full" style={{ minHeight: "320px" }} />
    </div>
  );
}
