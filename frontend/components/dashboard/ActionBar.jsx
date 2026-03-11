"use client";
import { useState } from "react";
import EmailModal from "@/components/ui/EmailModal";
export default function ActionBar({ dashboard, question }) {
  const [showEmail, setShowEmail] = useState(false);
  if (!dashboard) return null;
  return (
    <>
      <div className="flex flex-wrap items-center gap-3 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
        <span className="text-sm font-bold text-indigo-700">🚀 Quick Actions:</span>
        <button onClick={() => setShowEmail(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-indigo-200 text-indigo-700 text-sm font-medium rounded-lg hover:bg-indigo-50 transition-all shadow-sm">
          <span>📧</span> Email This Report
        </button>
      </div>
      {showEmail && <EmailModal onClose={() => setShowEmail(false)} dashboard={dashboard} question={question} />}
    </>
  );
}
