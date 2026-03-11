# DataSense AI — Conversational Business Intelligence Dashboard

> Ask questions about your business data in plain English. Get instant charts, KPI numbers, and AI insights in under 10 seconds. No coding required.

---

## What is DataSense AI?

DataSense AI is an AI-powered business intelligence platform that lets anyone — from a CEO to a shopkeeper — analyze their business data just by typing a question in plain English.

**Without DataSense AI:** You need SQL skills, Excel expertise, or a paid data analyst to get business insights.

**With DataSense AI:** Just type *"Show me total revenue by region"* and get a full interactive dashboard instantly.

---

## Live Demo

1. Upload any CSV file
2. Type a question in plain English
3. Get charts, KPIs, and AI insights in under 10 seconds
4. Email the report to your team with one click

---

## Features

- **Natural Language Querying** — Ask any business question in plain English
- **7-Agent AI Pipeline** — LangGraph orchestrates 7 specialized AI agents for high accuracy
- **Auto Chart Selection** — AI picks the best chart type for your data automatically
- **KPI Cards** — Key numbers extracted and displayed instantly
- **AI Business Insights** — Gemini AI writes business insights automatically
- **Combo Charts** — Dual-axis charts for multi-metric analysis
- **Export PDF** — Download professional PDF reports with one click
- **Email Reports** — Send full reports via Gmail using n8n automation
- **Query History** — Every query saved with timestamp and processing time
- **CSV Upload** — Upload any CSV file and start querying immediately
- **SQL Transparency** — View the auto-generated SQL query for every result

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TailwindCSS, Plotly.js |
| Backend | Python FastAPI |
| AI Model | Google Gemini 2.0 Flash |
| Agent Framework | LangGraph (7-Agent Pipeline) |
| Database | SQLite + Pandas |
| Automation | n8n Cloud (Gmail webhook) |
| Charts | Plotly.js (interactive) |

---

## The 7-Agent AI Pipeline

What makes DataSense AI unique is our multi-agent architecture. Instead of a single AI call, we use 7 specialized agents:

```
1. Query Understanding Agent   — Reads and understands the English question
2. Schema Retrieval Agent      — Reads the database structure and columns
3. SQL Generation Agent        — Writes the correct SQL query using Gemini AI
4. Query Execution Agent       — Runs the SQL on SQLite database
5. Data Analysis Agent         — Calculates KPIs and finds patterns using Pandas
6. Chart Selection Agent       — Picks the best chart type for the data
7. Insight Generation Agent    — Writes AI business insights in plain English
```

This pipeline approach makes our system significantly more accurate and reliable than a single AI call.

---

## How It Works

```
User types question in English
        ↓
Next.js Frontend sends to FastAPI Backend
        ↓
LangGraph triggers 7-Agent Pipeline
        ↓
Gemini AI generates SQL → SQLite executes → Pandas analyzes
        ↓
Charts + KPIs + AI Insights returned
        ↓
User sees full dashboard in under 10 seconds
        ↓
Optional: Email report via n8n automation
```

---

## Project Structure

```
datasense-ai/
├── backend/
│   ├── main.py                 # FastAPI server and API endpoints
│   ├── agents.py               # 7 AI agent definitions
│   ├── langgraph_workflow.py   # LangGraph pipeline orchestration
│   ├── sql_generator.py        # SQL generation using Gemini AI
│   ├── query_executor.py       # SQLite query execution
│   ├── chart_generator.py      # Chart type selection logic
│   ├── rag_engine.py           # Schema retrieval (RAG)
│   ├── database.py             # Database management
│   ├── .env.example            # Environment variables template
│   └── data/                   # Sample CSV data files
├── frontend/
│   ├── app/
│   │   ├── page.jsx            # Main application page
│   │   └── layout.jsx          # App layout
│   ├── components/
│   │   ├── dashboard/          # Dashboard components
│   │   │   ├── Dashboard.jsx
│   │   │   ├── ChartCard.jsx
│   │   │   ├── KpiCards.jsx
│   │   │   ├── ComboChart.jsx
│   │   │   ├── DataTable.jsx
│   │   │   └── InsightsPanel.jsx
│   │   └── ui/                 # UI components
│   │       ├── QueryInput.jsx
│   │       ├── EmailModal.jsx
│   │       └── CsvUpload.jsx
│   └── services/
│       ├── api.js              # Backend API calls
│       └── n8n.js              # n8n webhook integration
├── n8n-workflows/
│   └── Sub_Workflow_Mails.json # n8n email automation workflow
├── prompts/
│   ├── sql_prompt.txt          # SQL generation prompt
│   └── analysis_prompt.txt     # Analysis prompt
└── .gitignore
```

---

## Getting Started

### Prerequisites

- Python 3.10 or higher
- Node.js 18 or higher
- Google Gemini API key (free at https://aistudio.google.com)

### Backend Setup

```bash
# Go to backend folder
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment (Windows)
venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn pandas python-multipart python-dotenv aiofiles google-genai langgraph

# Create your .env file
copy .env.example .env

# Add your Gemini API key to .env file
# GEMINI_API_KEY=your_actual_key_here

# Start the backend server
uvicorn main:app --reload --port 8000
```

### Frontend Setup

```bash
# Go to frontend folder
cd frontend

# Install dependencies
npm install

# Start the frontend
npm run dev
```

### Open in Browser

```
http://localhost:3000
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | /health | Server health check |
| POST | /upload | Upload CSV file |
| POST | /load-sample | Load built-in sample data |
| POST | /query | Submit natural language query |
| GET | /schema | Get current database schema |
| GET | /tables | List all available tables |

---

## Sample Questions to Ask

**Simple:**
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

## n8n Email Automation

The email feature uses n8n cloud automation. When a user clicks "Email This Report":

1. Frontend sends report data to n8n webhook
2. n8n AI Agent formats the email professionally
3. Gmail sends the email automatically

To use this feature import the workflow file from `n8n-workflows/Sub_Workflow_Mails.json` into your n8n instance and update the webhook URL in `frontend/services/n8n.js`.

---

## Environment Variables

Create a `.env` file in the backend folder:

```
GEMINI_API_KEY=your_gemini_api_key_here
```

Get your free Gemini API key at: https://aistudio.google.com/app/apikey

---

## Evaluation Criteria Coverage

This project was built for a hackathon with the following evaluation criteria:

| Criteria | Weight | How We Address It |
|---|---|---|
| Accuracy | 40% | 7-agent pipeline ensures correct SQL, right chart types, no hallucinations |
| Aesthetics and UX | 30% | Clean Next.js UI, interactive Plotly charts, loading states, query history |
| Innovation | 30% | LangGraph multi-agent architecture, RAG schema retrieval, n8n automation |
| Bonus: CSV Upload | Extra | Users can upload any CSV and query it immediately |
| Bonus: Follow-up Questions | Extra | Users can ask follow-up questions to refine results |

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

## Hackathon

Built for: Conversational AI for Instant Business Intelligence Dashboards Hackathon

Team: DataSense AI

---

*DataSense AI — Making business intelligence accessible to everyone.*
