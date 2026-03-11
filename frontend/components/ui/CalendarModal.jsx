/**
 * components/ui/CalendarModal.jsx
 * --------------------------------
 * Modal for creating Google Calendar events via n8n webhook.
 */
"use client";
import { useState } from "react";
import { createCalendarEvent } from "@/services/n8n";

export default function CalendarModal({ onClose, dashboard, question }) {
  const today = new Date().toISOString().split("T")[0];
  const [title, setTitle] = useState(`Sales Review: ${question || "Dashboard Analysis"}`);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState("60");
  const [description, setDescription] = useState(() => {
    if (!dashboard) return "";
    const kpiText = (dashboard.kpis || []).map(k => `${k.label}: ${k.value}`).join(", ");
    return `Dashboard Question: ${question}\n\nKey Metrics: ${kpiText}\n\nSummary: ${dashboard.summary || ""}`;
  });
  const [status, setStatus] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleCreate = async () => {
    if (!title.trim()) { setErrorMsg("Please enter an event title."); return; }
    if (!date) { setErrorMsg("Please select a date."); return; }
    setStatus("loading");
    setErrorMsg("");
    try {
      await createCalendarEvent({ title: title.trim(), date, time, description, duration: parseInt(duration) });
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message || "Failed to create event.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📅</span>
            <h2 className="text-base font-bold text-gray-800">Create Calendar Event</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        {status === "success" ? (
          <div className="text-center py-8 space-y-3">
            <div className="text-5xl">✅</div>
            <p className="text-green-700 font-semibold">Event created successfully!</p>
            <p className="text-xs text-gray-500">Check your Google Calendar for <strong>{title}</strong></p>
            <button onClick={onClose}
              className="mt-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Title */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600">Event Title</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Sales Review Meeting"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">Time</label>
                <input type="time" value={time} onChange={e => setTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600">Duration</label>
              <select value={duration} onChange={e => setDuration(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="90">1.5 hours</option>
                <option value="120">2 hours</option>
              </select>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
            </div>

            {/* Error */}
            {errorMsg && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                ⚠️ {errorMsg}
              </p>
            )}

            {/* Buttons */}
            <div className="flex gap-2 pt-1">
              <button onClick={onClose}
                className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleCreate} disabled={status === "loading"}
                className="flex-1 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {status === "loading" ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Creating...</>
                ) : (
                  <><span>📅</span> Create Event</>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
