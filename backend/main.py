"""
main.py - FastAPI backend using OpenAI ChatGPT API.
Compatible with Python 3.14+
"""
import os, logging, tempfile
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger(__name__)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

app = FastAPI(title="AI BI Dashboard API", version="2.0.0")
app.add_middleware(CORSMiddleware,
    allow_origins=["http://localhost:3000","http://127.0.0.1:3000"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class QueryRequest(BaseModel):
    question: str
    table_name: Optional[str] = "sales"

class QueryResponse(BaseModel):
    success: bool
    question: str
    sql: Optional[str] = None
    dashboard: Optional[dict] = None
    error: Optional[str] = None
    error_stage: Optional[str] = None

class UploadResponse(BaseModel):
    success: bool
    table_name: str
    columns: list
    row_count: int
    message: str

def get_openai_client():
    """Initialize OpenAI client."""
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=503,
            detail="OPENAI_API_KEY not set. Please add it to your .env file.")
    try:
        from openai import OpenAI
        return OpenAI(api_key=OPENAI_API_KEY)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"OpenAI init failed: {e}")

def call_openai(client, prompt: str, system: str = "You are a helpful data analyst.") -> str:
    """Call OpenAI ChatGPT and return text response."""
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt}
        ],
        temperature=0.1,
        max_tokens=1000,
    )
    return response.choices[0].message.content.strip()

@app.get("/")
async def root():
    return {"status": "running", "ai": "OpenAI ChatGPT", "openai_configured": bool(OPENAI_API_KEY)}

@app.get("/health")
async def health():
    from database import get_schema, list_tables
    tables = list_tables()
    schema = get_schema("sales")
    return {
        "status": "healthy",
        "tables": tables,
        "active_table": "sales",
        "active_table_rows": schema["row_count"] if schema else 0,
        "openai_configured": bool(OPENAI_API_KEY),
    }

@app.post("/query", response_model=QueryResponse)
async def process_query(request: QueryRequest):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    from database import get_schema, execute_query
    from rag_engine import retrieve_schema_context
    import pandas as pd, json, re

    table = request.table_name or "sales"
    schema = get_schema(table)

    if not schema:
        return QueryResponse(success=False, question=request.question,
            error="No dataset found. Please upload a CSV file first.",
            error_stage="pre_check")

    try:
        client = get_openai_client()

        # Get schema context
        try:
            ctx = retrieve_schema_context(request.question, table)
        except Exception:
            ctx = f"Table: {table}, Columns: {', '.join(schema['columns'])}"

        # Step 1: Generate SQL
        sql_prompt = f"""Generate a valid SQLite SELECT query.

Table name: {table}
Columns: {', '.join(schema['columns'])}
Schema: {ctx}
Question: {request.question}

Rules:
- Only SELECT statements allowed
- Return ONLY the raw SQL query
- No markdown, no backticks, no explanation
- Use proper SQLite syntax
- For dates use strftime() if needed"""

        sql_raw = call_openai(client, sql_prompt,
            system="You are an expert SQL analyst. Return ONLY raw SQL, nothing else.")
        sql = re.sub(r'```(?:sql)?', '', sql_raw, flags=re.IGNORECASE).replace('```','').strip()
        if ';' in sql:
            sql = sql.split(';')[0].strip() + ';'

        # Safety check
        blocked = ['DROP','DELETE','ALTER','INSERT','UPDATE','TRUNCATE']
        for kw in blocked:
            if kw in sql.upper():
                return QueryResponse(success=False, question=request.question, sql=sql,
                    error=f"Unsafe SQL keyword: {kw}", error_stage="sql_safety")

        # Step 2: Execute query
        try:
            df = execute_query(sql)
        except Exception as e:
            return QueryResponse(success=False, question=request.question, sql=sql,
                error=f"Query failed: {str(e)}. Try rephrasing your question.",
                error_stage="query_execution")

        if df.empty:
            return QueryResponse(success=False, question=request.question, sql=sql,
                error="Query returned no results. Try rephrasing your question.",
                error_stage="no_data")

        # Step 3: Analyze data
        numeric_cols = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]
        cat_cols = [c for c in df.columns if not pd.api.types.is_numeric_dtype(df[c])]
        date_cols = [c for c in df.columns if any(x in c.lower() for x in ['date','month','year','time'])]

        stats = {}
        for c in numeric_cols:
            stats[c] = {
                "sum": float(df[c].sum()),
                "max": float(df[c].max()),
                "mean": round(float(df[c].mean()), 2)
            }

        analysis_prompt = f"""Analyze this business data and return ONLY a JSON object.

Question: {request.question}
Columns and types: {json.dumps({c: str(t) for c,t in df.dtypes.items()})}
Data sample:
{df.head(8).to_string(index=False)}
Statistics: {json.dumps(stats)}

Return ONLY this JSON (absolutely no markdown, no backticks, start directly with {{):
{{
  "insights": ["insight 1", "insight 2", "insight 3"],
  "kpis": [
    {{"label": "KPI Name", "value": "1,234", "description": "what it means"}}
  ],
  "charts": [
    {{"type": "bar", "title": "Chart Title", "x_column": "column_name", "y_column": "column_name", "priority": 1}},
    {{"type": "pie", "title": "Chart Title", "x_column": "column_name", "y_column": "column_name", "priority": 2}}
  ],
  "summary": "One paragraph summary of the key findings."
}}

Chart type rules:
- Time/date data -> use "line"
- Category comparisons -> use "bar"
- Part of whole -> use "pie"
- Generate 2-3 charts"""

        try:
            analysis_raw = call_openai(client, analysis_prompt,
                system="You are a data analyst. Return ONLY valid JSON, no markdown, no explanation.")
            analysis_raw = re.sub(r'```(?:json)?', '', analysis_raw, flags=re.IGNORECASE)
            analysis_raw = analysis_raw.replace('```','').strip()
            analysis = json.loads(analysis_raw)
        except Exception as e:
            logger.warning(f"Analysis parsing failed: {e}")
            analysis = {
                "insights": [f"Data contains {len(df)} rows across {len(df.columns)} columns."],
                "kpis": [], "charts": [],
                "summary": f"Your query returned {len(df)} rows of data."
            }

        # Step 4: Build Plotly chart configs
        charts = []
        for spec in analysis.get("charts", []):
            x_col = spec.get("x_column","")
            y_col = spec.get("y_column","")
            if x_col not in df.columns:
                x_col = date_cols[0] if date_cols else (cat_cols[0] if cat_cols else df.columns[0])
            if y_col not in df.columns:
                y_col = numeric_cols[0] if numeric_cols else df.columns[-1]
            ctype = spec.get("type","bar")
            title = spec.get("title","Chart")
            x_data = df[x_col].astype(str).tolist()
            y_data = df[y_col].tolist()

            if ctype == "line":
                chart = {
                    "type": "line", "title": title, "priority": spec.get("priority",99),
                    "data": [{"x": x_data, "y": y_data, "type": "scatter",
                              "mode": "lines+markers", "name": y_col,
                              "line": {"color": "#6366f1", "width": 2}}],
                    "layout": {"title": title, "xaxis": {"title": x_col.replace("_"," ").title()},
                               "yaxis": {"title": y_col.replace("_"," ").title()}}
                }
            elif ctype == "pie":
                chart = {
                    "type": "pie", "title": title, "priority": spec.get("priority",99),
                    "data": [{"labels": x_data, "values": y_data, "type": "pie", "hole": 0.35,
                              "textinfo": "label+percent"}],
                    "layout": {"title": title}
                }
            else:  # bar
                chart = {
                    "type": "bar", "title": title, "priority": spec.get("priority",99),
                    "data": [{"x": x_data, "y": y_data, "type": "bar", "name": y_col,
                              "marker": {"color": "#6366f1"}}],
                    "layout": {"title": title, "xaxis": {"title": x_col.replace("_"," ").title()},
                               "yaxis": {"title": y_col.replace("_"," ").title()}}
                }
            charts.append(chart)

        # Auto-generate charts if AI didn't produce any
        if not charts:
            if date_cols and numeric_cols:
                charts.append({
                    "type": "line", "title": f"{numeric_cols[0].replace('_',' ').title()} Over Time",
                    "priority": 1,
                    "data": [{"x": df[date_cols[0]].astype(str).tolist(),
                              "y": df[numeric_cols[0]].tolist(),
                              "type": "scatter", "mode": "lines+markers",
                              "marker": {"color": "#6366f1"}}],
                    "layout": {"title": f"{numeric_cols[0].replace('_',' ').title()} Over Time"}
                })
            if cat_cols and numeric_cols:
                charts.append({
                    "type": "bar", "title": f"{numeric_cols[0].replace('_',' ').title()} by {cat_cols[0].replace('_',' ').title()}",
                    "priority": 2,
                    "data": [{"x": df[cat_cols[0]].astype(str).tolist(),
                              "y": df[numeric_cols[0]].tolist(),
                              "type": "bar", "marker": {"color": "#6366f1"}}],
                    "layout": {"title": f"{numeric_cols[0].replace('_',' ').title()} by {cat_cols[0].replace('_',' ').title()}"}
                })
                charts.append({
                    "type": "pie", "title": f"Distribution of {numeric_cols[0].replace('_',' ').title()}",
                    "priority": 3,
                    "data": [{"labels": df[cat_cols[0]].astype(str).tolist(),
                              "values": df[numeric_cols[0]].tolist(),
                              "type": "pie", "hole": 0.35}],
                    "layout": {"title": f"Distribution of {numeric_cols[0].replace('_',' ').title()}"}
                })

        charts.sort(key=lambda c: c.get("priority", 99))

        # Build KPI cards
        kpis = list(analysis.get("kpis", []))
        kpis.append({"label": "Total Records", "value": str(len(df)), "description": "Rows returned"})
        for c in numeric_cols[:2]:
            total = df[c].sum()
            kpis.append({
                "label": f"Total {c.replace('_',' ').title()}",
                "value": f"{total:,.0f}" if total == int(total) else f"{total:,.2f}",
                "description": f"Sum of all {c} values"
            })
        kpis = kpis[:4]

        dashboard = {
            "kpis": kpis,
            "summary": analysis.get("summary", ""),
            "insights": analysis.get("insights", []),
            "charts": {
                "main": charts[0] if len(charts) > 0 else None,
                "secondary": charts[1] if len(charts) > 1 else None,
                "tertiary": charts[2] if len(charts) > 2 else None,
            },
            "all_charts": charts,
            "table": {
                "columns": list(df.columns),
                "data": df.head(100).to_dict(orient="records"),
                "total_rows": len(df),
                "truncated": len(df) > 100
            }
        }

        return QueryResponse(success=True, question=request.question, sql=sql, dashboard=dashboard)

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
        return QueryResponse(success=False, question=request.question,
            error=f"Error: {str(e)}", error_stage="unknown")

@app.post("/upload", response_model=UploadResponse)
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")
    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    try:
        from database import ingest_csv, get_schema
        from rag_engine import store_schema_embeddings, clear_schema_embeddings
        result = ingest_csv(tmp_path, table_name="sales")
        schema = get_schema("sales")
        if schema:
            try:
                clear_schema_embeddings("sales")
                store_schema_embeddings(schema)
            except Exception as e:
                logger.warning(f"Schema store failed (non-fatal): {e}")
        return UploadResponse(success=True, table_name=result["table_name"],
            columns=result["columns"], row_count=result["row_count"],
            message=f"Loaded {result['row_count']} rows, {len(result['columns'])} columns.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
    finally:
        Path(tmp_path).unlink(missing_ok=True)

@app.get("/schema")
async def get_dataset_schema(table_name: str = "sales"):
    from database import get_schema
    schema = get_schema(table_name)
    if not schema:
        raise HTTPException(status_code=404, detail=f"Table '{table_name}' not found.")
    return schema

@app.get("/tables")
async def get_tables():
    from database import list_tables
    return {"tables": list_tables()}

@app.post("/load-sample")
async def load_sample_data():
    sample_path = Path(__file__).parent.parent / "data" / "sample_sales_data.csv"
    if not sample_path.exists():
        raise HTTPException(status_code=404, detail="Sample data file not found.")
    from database import ingest_csv, get_schema
    from rag_engine import store_schema_embeddings, clear_schema_embeddings
    result = ingest_csv(str(sample_path), table_name="sales")
    schema = get_schema("sales")
    if schema:
        try:
            clear_schema_embeddings("sales")
            store_schema_embeddings(schema)
        except Exception as e:
            logger.warning(f"Schema store failed (non-fatal): {e}")
    return {"success": True, "message": f"Sample data loaded: {result['row_count']} rows",
            "columns": result["columns"], "row_count": result["row_count"]}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
