/**
 * services/n8n.js
 * ----------------
 * n8n webhook integration - sends data as plain text prompt
 * so the AI Agent node receives it correctly.
 */

const N8N_GMAIL_WEBHOOK = "https://saikrishna086.app.n8n.cloud/webhook/1a9ef5c8-6c35-4b92-a5fb-3f0a8deafb22";
const N8N_CALENDAR_WEBHOOK = "https://saikrishna086.app.n8n.cloud/webhook/47281ba1-b861-454d-85cb-75cb198439ca";

/**
 * Send email report via n8n Gmail AI Agent.
 */
export async function sendEmailReport({ to, subject, body, chartSummary, kpis }) {
  // Format as a natural language prompt so AI Agent understands it
  const kpiText = (kpis || []).map(k => `${k.label}: ${k.value}`).join(", ");
  
  const prompt = `Please send an email with the following details:

To: ${to}
Subject: ${subject}
Body:
${body}

Key Metrics: ${kpiText}
Charts: ${chartSummary || ""}

Send this email now.`;

  const payload = {
    // Try multiple field names so n8n AI Agent picks it up
    prompt,
    message: prompt,
    chatInput: prompt,
    input: prompt,
    query: prompt,
    text: prompt,
    // Also include structured data
    to,
    subject,
    body,
    kpis: kpiText,
    chartSummary: chartSummary || "",
    sentAt: new Date().toISOString(),
  };

  console.log("Sending to Gmail webhook:", N8N_GMAIL_WEBHOOK);
  console.log("Payload:", payload);

  const response = await fetch(N8N_GMAIL_WEBHOOK, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  console.log("Gmail webhook response:", response.status, responseText);

  if (!response.ok) {
    throw new Error(`Gmail webhook failed: ${response.status} - ${responseText}`);
  }

  return { success: true, response: responseText };
}

/**
 * Create calendar event via n8n Calendar AI Agent.
 */
export async function createCalendarEvent({ title, date, time, description, duration }) {
  const prompt = `Please create a Google Calendar event with the following details:

Title: ${title}
Date: ${date}
Time: ${time}
Duration: ${duration} minutes
Description: ${description}

Create this calendar event now.`;

  const payload = {
    // Try multiple field names
    prompt,
    message: prompt,
    chatInput: prompt,
    input: prompt,
    query: prompt,
    text: prompt,
    // Also include structured data
    title,
    date,
    time,
    duration,
    description,
    createdAt: new Date().toISOString(),
  };

  console.log("Sending to Calendar webhook:", N8N_CALENDAR_WEBHOOK);
  console.log("Payload:", payload);

  const response = await fetch(N8N_CALENDAR_WEBHOOK, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  console.log("Calendar webhook response:", response.status, responseText);

  if (!response.ok) {
    throw new Error(`Calendar webhook failed: ${response.status} - ${responseText}`);
  }

  return { success: true, response: responseText };
}
