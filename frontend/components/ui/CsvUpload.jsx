/**
 * components/ui/CsvUpload.jsx
 * ----------------------------
 * Drag-and-drop CSV upload interface.
 */

"use client";

import { useState, useRef } from "react";
import { uploadCSV, loadSampleData } from "@/services/api";

export default function CsvUpload({ onUploadSuccess }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file || !file.name.endsWith(".csv")) {
      setError("Please upload a valid CSV file.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadResult(null);

    try {
      const result = await uploadCSV(file);
      setUploadResult(result);
      onUploadSuccess?.(result);
    } catch (err) {
      setError(err.message || "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const handleLoadSample = async () => {
    setIsUploading(true);
    setError(null);
    try {
      const result = await loadSampleData();
      setUploadResult({ ...result, table_name: "sales", columns: result.columns || [] });
      onUploadSuccess?.(result);
    } catch (err) {
      setError(err.message || "Failed to load sample data.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          isDragging
            ? "border-indigo-400 bg-indigo-50"
            : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Uploading and processing...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-xl">
              📂
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">
                Drop a CSV file here or click to browse
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Supports any CSV with headers</p>
            </div>
          </div>
        )}
      </div>

      {/* Sample data button */}
      <button
        onClick={handleLoadSample}
        disabled={isUploading}
        className="w-full text-xs text-indigo-600 border border-indigo-200 rounded-lg py-2 hover:bg-indigo-50 transition-colors disabled:opacity-50"
      >
        📊 Load Sample Sales Dataset
      </button>

      {/* Success state */}
      {uploadResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-xs font-medium text-green-700">
            ✅ Dataset loaded: {uploadResult.row_count?.toLocaleString()} rows
          </p>
          {uploadResult.columns && (
            <p className="text-xs text-green-600 mt-1">
              Columns: {uploadResult.columns.join(", ")}
            </p>
          )}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-xs text-red-600">⚠️ {error}</p>
        </div>
      )}
    </div>
  );
}
