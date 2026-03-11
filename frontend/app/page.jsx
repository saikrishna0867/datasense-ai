"use client";
import { useState, useEffect, useRef } from "react";
import QueryInput from "@/components/ui/QueryInput";
import CsvUpload from "@/components/ui/CsvUpload";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import Dashboard from "@/components/dashboard/Dashboard";
import { submitQuery, getHealth, getSchema } from "@/services/api";

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [errorStage, setErrorStage] = useState(null);
  const [datasetLoaded, setDatasetLoaded] = useState(false);
  const [apiStatus, setApiStatus] = useState("checking");
  const [showUpload, setShowUpload] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [processingTime, setProcessingTime] = useState(null);
  const [smartQuestions, setSmartQuestions] = useState([]);
  const stepTimerRef = useRef(null);
  const resultRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    getHealth()
      .then((health) => {
        setApiStatus("online");
        if (health.active_table_rows > 0) {
          setDatasetLoaded(true);
          loadSmartQuestions();
        }
      })
      .catch(() => setApiStatus("offline"));
    const saved = sessionStorage.getItem("query_history");
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const loadSmartQuestions = async () => {
    try {
      const schema = await getSchema();
      const cols = schema.columns || [];
      setSmartQuestions(generateSmartQuestions(cols));
    } catch (e) {}
  };

  const generateSmartQuestions = (cols) => {
    const numericCols = cols.filter(c => !["date","time","id"].some(x => c.toLowerCase().includes(x)));
    const dateCols = cols.filter(c => ["date","time","month","year"].some(x => c.toLowerCase().includes(x)));
    const catCols = cols.filter(c => !numericCols.includes(c) && !dateCols.includes(c));
    const questions = [];
    if (numericCols[0] && catCols[0]) questions.push(`Show total ${numericCols[0]} by ${catCols[0]}`);
    if (dateCols[0] && numericCols[0]) questions.push(`Show ${numericCols[0]} trend over time`);
    if (numericCols[0] && catCols[0]) questions.push(`Show top 5 ${catCols[0]} by ${numericCols[0]}`);
    if (numericCols[0] && catCols[0]) questions.push(`Compare ${numericCols[0]} across ${catCols[0]}`);
    if (numericCols[0]) questions.push(`Show ${numericCols[0]} distribution`);
    return questions.slice(0, 5);
  };

  const startStepAnimation = () => {
    let step = 0;
    const DURATIONS = [800, 600, 1200, 1000, 1200, 800, 600];
    const advance = () => {
      step += 1;
      if (step < 7) { setLoadingStep(step); stepTimerRef.current = setTimeout(advance, DURATIONS[step]); }
    };
    setLoadingStep(0);
    stepTimerRef.current = setTimeout(advance, DURATIONS[0]);
  };

  const stopStepAnimation = () => {
    if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    setLoadingStep(6);
  };

  const handleQuery = async (question) => {
    setIsLoading(true);
    setResult(null);
    setError(null);
    setErrorStage(null);
    setProcessingTime(null);
    startTimeRef.current = Date.now();
    startStepAnimation();
    try {
      const data = await submitQuery(question);
      stopStepAnimation();
      const elapsed = ((Date.now() - startTimeRef.current) / 1000).toFixed(1);
      setProcessingTime(elapsed);
      if (data.success) {
        setResult({ ...data, question });
        const newEntry = {
          id: Date.now(),
          question,
          time: new Date().toLocaleString("en-IN", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" }),
          processingTime: elapsed,
        };
        const newHistory = [newEntry, ...history].slice(0, 20);
        setHistory(newHistory);
        sessionStorage.setItem("query_history", JSON.stringify(newHistory));
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior:"smooth", block:"start" }), 100);
      } else {
        setError(data.error || "Something went wrong.");
        setErrorStage(data.error_stage);
      }
    } catch (err) {
      stopStepAnimation();
      setError(err.message || "Failed to connect to the API.");
      setErrorStage("network");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadSuccess = async () => {
    setDatasetLoaded(true);
    setShowUpload(false);
    setResult(null);
    setError(null);
    await loadSmartQuestions();
  };

  const goHome = () => {
    setResult(null); setError(null); setErrorStage(null);
    setShowUpload(false); setShowHistory(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">

      {/* HEADER */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={goHome} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md">
              DS
            </div>
            <div className="text-left">
              <h1 className="text-sm font-extrabold tracking-tight text-gray-900">DataSense AI</h1>
              <p className="text-xs text-gray-400">Conversational Business Intelligence</p>
            </div>
          </button>

          <div className="flex items-center gap-2">
            {/* Status */}
            <div className="flex items-center gap-1.5 px-2">
              <div className={`w-2 h-2 rounded-full ${apiStatus==="online"?"bg-green-400":apiStatus==="offline"?"bg-red-400":"bg-yellow-400 animate-pulse"}`} />
              <span className="text-xs text-gray-500 capitalize">{apiStatus}</span>
            </div>

            {/* History */}
            {history.length > 0 && (
              <button onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                🕐 History
                <span className="bg-indigo-100 text-indigo-600 text-xs px-1.5 py-0.5 rounded-full font-medium">{history.length}</span>
              </button>
            )}

            {/* Home button */}
            {result && (
              <button onClick={goHome}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                ← Home
              </button>
            )}

            {/* Upload */}
            <button onClick={() => setShowUpload(v => !v)}
              className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5">
              📂 {datasetLoaded ? "Change Dataset" : "Upload Data"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">

        {/* History Panel */}
        {showHistory && (
          <div className="mb-6 bg-white rounded-xl border border-gray-100 shadow-sm p-5 animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-700">🕐 Query History</h2>
              <div className="flex gap-3">
                <button onClick={() => { setHistory([]); sessionStorage.removeItem("query_history"); }}
                  className="text-xs text-red-400 hover:text-red-600">Clear All</button>
                <button onClick={() => setShowHistory(false)} className="text-xs text-gray-400 hover:text-gray-600">✕ Close</button>
              </div>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {history.map(entry => (
                <div key={entry.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-indigo-50 transition-colors group">
                  <div className="flex items-start gap-3">
                    <span className="text-sm mt-0.5">💬</span>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{entry.question}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        🕐 {entry.time}
                        {entry.processingTime && <span className="ml-2 text-green-500">⚡ {entry.processingTime}s</span>}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => { setShowHistory(false); handleQuery(entry.question); }}
                    className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-indigo-700 shrink-0 ml-3">
                    ▶ Run
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Panel */}
        {showUpload && (
          <div className="mb-6 bg-white rounded-xl border border-gray-100 shadow-sm p-6 animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700">📂 Dataset Manager</h2>
              <button onClick={() => setShowUpload(false)} className="text-xs text-gray-400 hover:text-gray-600">✕ Close</button>
            </div>
            <CsvUpload onUploadSuccess={handleUploadSuccess} />
          </div>
        )}

        {/* Hero */}
        {!result && !isLoading && !error && (
          <div className="text-center mb-10 pt-6 animate-fadeIn">

            <h2 className="text-4xl font-extrabold mb-3 tracking-tight text-gray-900">
              Ask Questions About<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                Your Business Data
              </span>
            </h2>
            <p className="text-sm max-w-xl mx-auto text-gray-500">
              Upload any CSV file and ask questions in plain English.
              Get instant charts, KPIs, and AI-powered insights automatically.
            </p>
            {!datasetLoaded && !showUpload && (
              <div className="mt-6 inline-block">
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-sm text-amber-700">
                  👆 Start by uploading a CSV or loading the sample dataset
                </div>
              </div>
            )}
          </div>
        )}

        {/* Query Input */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
          <QueryInput onSubmit={handleQuery} isLoading={isLoading} disabled={apiStatus==="offline"} />
        </div>

        {/* Smart Questions */}
        {smartQuestions.length > 0 && !result && !isLoading && (
          <div className="rounded-xl border p-4 mb-6 animate-fadeIn bg-indigo-50/50 border-indigo-100">
            <p className="text-xs font-semibold mb-2 text-indigo-700">
              💡 Smart suggestions based on your dataset:
            </p>
            <div className="flex flex-wrap gap-2">
              {smartQuestions.map((q, i) => (
                <button key={i} onClick={() => handleQuery(q)}
                  className="text-xs px-3 py-1.5 rounded-full border bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-all hover:scale-105">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Processing time */}
        {processingTime && result && (
          <div className="flex justify-end mb-2">
            <span className="text-xs px-3 py-1 rounded-full font-medium bg-green-50 text-green-600 border border-green-200">
              ⚡ Analyzed in {processingTime} seconds
            </span>
          </div>
        )}

        {/* Results */}
        <div ref={resultRef}>
          {isLoading && <LoadingState currentStep={loadingStep} />}
          {!isLoading && error && (
            <ErrorState error={error} stage={errorStage} onRetry={() => setError(null)} />
          )}
          {!isLoading && result && result.success && (
            <Dashboard result={result} />
          )}
        </div>

        {/* Feature cards */}
        {!isLoading && !result && !error && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon:"🤖", title:"7 AI Agents", desc:"Multi-agent pipeline handles understanding, SQL generation, analysis, and visualization automatically." },
              { icon:"📊", title:"Auto Dashboards", desc:"Automatically selects the best chart types and builds a full interactive dashboard from your question." },
              { icon:"📧", title:"Email Reports", desc:"Send your complete dashboard analysis directly to any email with one click." },
            ].map(card => (
              <div key={card.title} className="bg-white rounded-xl border border-gray-100 p-5 flex gap-3 hover:shadow-md transition-all">
                <div className="text-2xl shrink-0">{card.icon}</div>
                <div>
                  <h3 className="text-sm font-semibold mb-1 text-gray-800">{card.title}</h3>
                  <p className="text-xs leading-relaxed text-gray-500">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
