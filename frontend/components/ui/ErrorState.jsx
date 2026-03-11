/**
 * components/ui/ErrorState.jsx
 * -----------------------------
 * Displays user-friendly error messages from the pipeline.
 */

const STAGE_LABELS = {
  pre_check: "Dataset Check",
  query_understanding: "Query Understanding",
  schema_retrieval: "Schema Retrieval",
  sql_generation: "SQL Generation",
  sql_safety: "Safety Check",
  query_execution: "Query Execution",
  visualization: "Visualization",
  dashboard_assembly: "Dashboard Assembly",
  unknown: "Processing",
};

export default function ErrorState({ error, stage, onRetry }) {
  const stageLabel = STAGE_LABELS[stage] || "Processing";

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6">
      <div className="flex items-start gap-3">
        <div className="text-2xl shrink-0">⚠️</div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-semibold text-red-800">
              Unable to process your request
            </h3>
            {stage && (
              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                {stageLabel}
              </span>
            )}
          </div>
          <p className="text-sm text-red-700 leading-relaxed">{error}</p>

          {stage === "pre_check" && (
            <p className="text-xs text-red-500 mt-2">
              💡 Tip: Upload a CSV file or load the sample dataset first.
            </p>
          )}

          {(stage === "sql_generation" || stage === "query_execution") && (
            <p className="text-xs text-red-500 mt-2">
              💡 Tip: Try rephrasing your question or use one of the example queries.
            </p>
          )}
        </div>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 text-xs px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
