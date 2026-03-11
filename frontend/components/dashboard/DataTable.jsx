"use client";
import { useState } from "react";
const PAGE_SIZE = 20;
export default function DataTable({ columns=[], data=[], totalRows=0, truncated=false }) {
  const [page, setPage] = useState(0);
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  if (!columns.length || !data.length) return null;
  const sorted = [...data].sort((a,b) => {
    if (!sortCol) return 0;
    const aV=a[sortCol], bV=b[sortCol];
    if (aV==null) return 1; if (bV==null) return -1;
    const cmp = typeof aV==="number" ? aV-bV : String(aV).localeCompare(String(bV));
    return sortDir==="asc" ? cmp : -cmp;
  });
  const totalPages = Math.ceil(sorted.length/PAGE_SIZE);
  const pageData = sorted.slice(page*PAGE_SIZE, (page+1)*PAGE_SIZE);
  const fmt = v => { if(v==null) return "—"; if(typeof v==="number") return Number.isInteger(v)?v.toLocaleString():v.toFixed(2); return String(v); };
  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">Data Table</h3>
          <p className="text-xs mt-0.5 text-gray-400">Showing {data.length.toLocaleString()} of {totalRows.toLocaleString()} rows{truncated?" (truncated)":""}</p>
        </div>
        <span className="text-xs text-indigo-500 bg-indigo-50 px-2 py-1 rounded-full">{columns.length} columns</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100">
              {columns.map(col => (
                <th key={col} onClick={() => { if(sortCol===col) setSortDir(d=>d==="asc"?"desc":"asc"); else {setSortCol(col);setSortDir("asc");} setPage(0); }}
                  className="px-4 py-2 text-left font-semibold cursor-pointer whitespace-nowrap select-none bg-gray-50 text-gray-600 hover:opacity-80">
                  <span className="flex items-center gap-1">
                    {col.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}
                    {sortCol===col && <span className="text-indigo-500">{sortDir==="asc"?"↑":"↓"}</span>}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row,i) => (
              <tr key={i} className={`border-b border-gray-50 hover:bg-indigo-50/30 transition-colors ${i%2===0?"bg-white":"bg-gray-50/40"}`}>
                {columns.map(col => (
                  <td key={col} className="px-4 py-2 whitespace-nowrap text-gray-700">{fmt(row[col])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
          <button onClick={() => setPage(p=>Math.max(0,p-1))} disabled={page===0}
            className="text-xs px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">← Prev</button>
          <span className="text-xs text-gray-400">Page {page+1} of {totalPages}</span>
          <button onClick={() => setPage(p=>Math.min(totalPages-1,p+1))} disabled={page===totalPages-1}
            className="text-xs px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">Next →</button>
        </div>
      )}
    </div>
  );
}
