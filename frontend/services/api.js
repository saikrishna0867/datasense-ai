/**
 * services/api.js
 * ---------------
 * API service layer for the AI BI Dashboard frontend.
 * Handles all communication with the FastAPI backend.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Generic fetch wrapper with error handling.
 */
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || `API error: ${response.status}`);
  }

  return data;
}

/**
 * Submit a natural language query to the AI pipeline.
 * @param {string} question - The user's business question.
 * @param {string} tableName - The active table name.
 * @returns {Promise<Object>} Dashboard configuration and results.
 */
export async function submitQuery(question, tableName = "sales") {
  return apiFetch("/query", {
    method: "POST",
    body: JSON.stringify({ question, table_name: tableName }),
  });
}

/**
 * Upload a CSV file as the active dataset.
 * @param {File} file - The CSV File object.
 * @returns {Promise<Object>} Upload result with schema info.
 */
export async function uploadCSV(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: "POST",
    body: formData,
    // Don't set Content-Type header - browser sets it with boundary for multipart
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Upload failed");
  }
  return data;
}

/**
 * Load the built-in sample dataset.
 * @returns {Promise<Object>} Load result.
 */
export async function loadSampleData() {
  return apiFetch("/load-sample", { method: "POST" });
}

/**
 * Get the current dataset schema.
 * @param {string} tableName - Table name to inspect.
 * @returns {Promise<Object>} Schema metadata.
 */
export async function getSchema(tableName = "sales") {
  return apiFetch(`/schema?table_name=${tableName}`);
}

/**
 * Get API health status.
 * @returns {Promise<Object>} Health check result.
 */
export async function getHealth() {
  return apiFetch("/health");
}
