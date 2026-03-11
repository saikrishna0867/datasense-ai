/**
 * components/ui/LoadingState.jsx
 * --------------------------------
 * Animated loading state shown while the AI pipeline runs.
 */

const PIPELINE_STEPS = [
  { icon: "🧠", label: "Understanding your question..." },
  { icon: "🔍", label: "Retrieving schema context..." },
  { icon: "⚙️", label: "Generating SQL query..." },
  { icon: "🗄️", label: "Executing database query..." },
  { icon: "📊", label: "Analyzing results..." },
  { icon: "🎨", label: "Building visualizations..." },
  { icon: "✨", label: "Assembling dashboard..." },
];

export default function LoadingState({ currentStep = 0 }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
      <div className="flex flex-col items-center gap-6">
        {/* Spinner */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-indigo-100 rounded-full" />
          <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-2xl">
            {PIPELINE_STEPS[Math.min(currentStep, PIPELINE_STEPS.length - 1)].icon}
          </div>
        </div>

        {/* Status text */}
        <div className="text-center">
          <p className="text-sm font-medium text-gray-800">
            {PIPELINE_STEPS[Math.min(currentStep, PIPELINE_STEPS.length - 1)].label}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Running multi-agent AI pipeline...
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex gap-2">
          {PIPELINE_STEPS.map((step, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i < currentStep
                  ? "bg-indigo-500"
                  : i === currentStep
                  ? "bg-indigo-400 scale-125"
                  : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* Pipeline steps */}
        <div className="w-full max-w-xs space-y-1">
          {PIPELINE_STEPS.map((step, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 text-xs transition-opacity duration-300 ${
                i <= currentStep ? "opacity-100" : "opacity-30"
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
                  i < currentStep
                    ? "bg-green-100 text-green-600"
                    : i === currentStep
                    ? "bg-indigo-100 text-indigo-600 animate-pulse"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {i < currentStep ? "✓" : step.icon}
              </span>
              <span
                className={
                  i === currentStep
                    ? "text-indigo-700 font-medium"
                    : i < currentStep
                    ? "text-green-600"
                    : "text-gray-400"
                }
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
