"use client";
import { useState } from "react";

export default function QueryInput({ onSubmit, isLoading, disabled }) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim() && !isLoading && !disabled) {
      onSubmit(query.trim());
    }
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            🔍
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a question about your data..."
            disabled={disabled || isLoading}
            className="w-full pl-9 pr-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
          />
        </div>
        <button
          type="submit"
          disabled={!query.trim() || isLoading || disabled}
          className="px-5 py-3 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <span>✨</span>
              Analyze
            </>
          )}
        </button>
      </form>
    </div>
  );
}
