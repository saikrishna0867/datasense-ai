# DataSense AI

> Conversational Business Intelligence — Ask questions about your business data in plain English and get instant interactive dashboards, charts, and AI insights in under 10 seconds.

![DataSense AI](https://img.shields.io/badge/DataSense-AI-6366f1?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?style=for-the-badge&logo=fastapi)
![Gemini](https://img.shields.io/badge/Google-Gemini_AI-4285F4?style=for-the-badge&logo=google)
![LangGraph](https://img.shields.io/badge/LangGraph-Multi--Agent-8B5CF6?style=for-the-badge)

---

## Overview

Most businesses have data but cannot use it. Getting insights requires SQL knowledge, Power BI skills, or a dedicated data analyst. DataSense AI removes that barrier completely.

Upload any CSV file, type your question in plain English, and get a full interactive dashboard with charts, KPI numbers, and AI-written business insights — all in under 10 seconds. No coding required.

---

## Features

- **Natural Language Querying** — No SQL or coding knowledge needed
- **7-Agent AI Pipeline** — LangGraph orchestrates 7 specialized agents for maximum accuracy
- **Smart Chart Selection** — AI automatically picks the best chart type for your data
- **KPI Cards** — Key metrics extracted and highlighted automatically
- **AI Business Insights** — Gemini AI writes meaningful business insights
- **Combo Charts** — Dual-axis charts for comparing two metrics side by side
- **PDF Export** — Download professional reports instantly
- **Email Automation** — Send full reports via Gmail with one click using n8n
- **Query History** — All queries saved with timestamps and processing time
- **CSV Upload** — Upload any CSV file and start querying immediately
- **SQL Transparency** — View the auto-generated SQL for every query

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 14 + TailwindCSS | User interface |
| Charts | Plotly.js | Interactive visualizations |
| Backend | Python FastAPI | API server |
| AI Model | Google Gemini 2.0 Flash | Language understanding |
| Agent Framework | LangGraph | Multi-agent orchestration |
| Database | SQLite | Data storage |
| Data Processing | Pandas | Data analysis and KPIs |
| Automation | n8n Cloud | Email workflow automation |

---

## Architecture — 7-Agent AI Pipeline

The core of DataSense AI is a multi-agent pipeline. Instead of a single AI call, 7 specialized agents each handle one specific task:

```
User Question (Plain English)
         │
         ▼
┌─────────────────────────────────────────────┐
│           LangGraph Pipeline                │
│                                             │
│  1. Query Understanding Agent               │
│     └── Reads and understands the question  │
│                                             │
│  2. Schema Retrieval Agent                  │
│     └── Reads database columns and types    │
│                                             │
│  3. SQL Generation Agent  (Gemini AI)       │
│     └── Writes the correct SQL query        │
│                                             │
│  4. Query Execution Agent                   │
│     └── Runs SQL on SQLite database         │
│                                             │
│  5. Data Analysis Agent   (Pandas)          │
│     └── Calculates KPIs and finds patterns  │
│                                             │
│  6. Chart Selection Agent                   │
│     └── Picks best visualization type       │
│                                             │
│  7. Insight Generation Agent  (Gemini AI)   │
│     └── Writes AI business insights         │
└─────────────────────────────────────────────┘
         │
         ▼
  Full Interactive Dashboard
  (Charts + KPIs + Insights + Table)
```

---

## Project Structure

```
datasense-ai/
├── backend/
│   ├── main.py                  # FastAPI server and endpoints
│   ├── agents.py                # 7 AI agent definitions
│   ├── langgraph_workflow.py    # LangGraph pipeline
│   ├── sql_generator.py         # SQL generation with Gemini
│   ├── query_executor.py        # SQLite query execution
│   ├── chart_generator.py       # Chart type selection
│   ├── rag_engine.py            # Schema retrieval
│   ├── database.py              # Database management
│   ├── .env.example             # Environment variables template
│   └── data/                    # Sample data files
├── frontend/
│   ├── app/
│   │   ├── page.jsx             # Main page
│   │   └── layout.jsx           # App layout
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── ChartCard.jsx
│   │   │   ├── KpiCards.jsx
│   │   │   ├── ComboChart.jsx
│   │   │   ├── DataTable.jsx
│   │   │   └── InsightsPanel.jsx
│   │   └── ui/
│   │       ├── QueryInput.jsx
│   │       ├── EmailModal.jsx
│   │       └── CsvUpload.jsx
│   └── services/
│       ├── api.js
│       └── n8n.js
├── n8n-workflows/
│   └── Sub_Workflow_Mails.json
├── prompts/
│   ├── sql_prompt.txt
│   └── analysis_prompt.txt
└── .gitignore
```

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- Google Gemini API key — free at [aistudio.google.com](https://aistudio.google.com)

### 1. Clone the repository

```bash
git clone https://github.com/saikrishna0867/datasense-ai.git
cd datasense-ai
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate on Windows
venv\Scripts\activate

# Activate on Mac or Linux
source venv/bin/activate

# Install dependencies
pip install fastapi uvicorn pandas python-multipart python-dotenv aiofiles google-genai langgraph

# Set up environment variables
cp .env.example .env
# Open .env and add your Gemini API key

# Start backend server
uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start frontend
npm run dev
```

### 4. Open in browser

```
http://localhost:3000
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Server health check |
| POST | `/upload` | Upload CSV file |
| POST | `/load-sample` | Load built-in sample dataset |
| POST | `/query` | Submit natural language query |
| GET | `/schema` | Get current database schema |
| GET | `/tables` | List all available tables |

---

## Environment Variables

Create a `.env` file inside the `backend/` folder:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Get your free API key at: [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

---

## Email Automation Setup

The email report feature uses n8n workflow automation:

1. Import `n8n-workflows/Sub_Workflow_Mails.json` into your n8n instance
2. Connect your Gmail account inside n8n
3. Update the webhook URL in `frontend/services/n8n.js`
4. Click **Email This Report** in the app to send reports automatically

---

## Sample Queries

**Basic:**
- Show total revenue by category
- Which product generated the most revenue?
- Compare sales across all regions

**Intermediate:**
- Show monthly revenue trend for 2024
- Which sales representative performed the best?
- Show top 5 cities by total revenue

**Advanced:**
- What is the impact of discount percentage on total revenue?
- Show revenue trend by region month by month
- Which city and product combination is most profitable?

---

## Built With

- [Next.js](https://nextjs.org)
- [FastAPI](https://fastapi.tiangolo.com)
- [LangGraph](https://langchain-ai.github.io/langgraph)
- [Google Gemini AI](https://ai.google.dev)
- [Plotly.js](https://plotly.com/javascript)
- [n8n](https://n8n.io)
- [SQLite](https://sqlite.org)
- [Pandas](https://pandas.pydata.org)

---

## License

This project is licensed under the MIT License.

---

*DataSense AI — Making business intelligence accessible to everyone.*
