"use client";
import { useEffect, useRef } from "react";

export default function ChartCard({ chart, className = "" }) {
  const plotRef = useRef(null);

  useEffect(() => {
    if (!chart || !plotRef.current) return;

    import("plotly.js-dist-min").then((Plotly) => {
      const layout = {
        ...chart.layout,
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        font: { family: "Inter, sans-serif", size: 12, color: "#374151" },
        margin: { l: 50, r: 20, t: 50, b: 50 },
        colorway: ["#6366f1","#f59e0b","#10b981","#ef4444","#3b82f6","#8b5cf6"],
        autosize: true,
      };

      Plotly.react(plotRef.current, chart.data, layout, {
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToRemove: ["pan2d", "lasso2d", "select2d"],
        displaylogo: false,
      });
    });

    return () => {
      if (plotRef.current) {
        import("plotly.js-dist-min").then((P) => P.purge(plotRef.current));
      }
    };
  }, [chart]);

  if (!chart) return null;

  return (
    <div className={`rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden ${className}`}>
      <div className="px-4 pt-4">
        <h3 className="text-sm font-semibold text-gray-700">{chart.title}</h3>
        {chart.description && <p className="text-xs mt-0.5 text-gray-400">{chart.description}</p>}
      </div>
      <div ref={plotRef} className="w-full" style={{ minHeight: "280px" }} />
    </div>
  );
}
