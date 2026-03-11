"""
agents.py
---------
Individual AI agent implementations for the BI Dashboard system.
Each agent is a focused function that handles one step of the pipeline.
"""

import json
import re
import logging
import pandas as pd
from pathlib import Path
import google.generativeai as genai

logger = logging.getLogger(__name__)

ANALYSIS_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "analysis_prompt.txt"


def query_understanding_agent(user_question: str, model: genai.GenerativeModel) -> dict:
    """
    Agent 1: Analyze the user query and extract structured intent.

    Returns dict with:
        intent, metrics, dimensions, filters, time_range
    """
    prompt = f"""Analyze this business intelligence question and extract structured information.

USER QUESTION: "{user_question}"

Respond ONLY with a valid JSON object (no markdown, no explanation):
{{
  "intent": "summarize|compare|trend|rank|distribution|filter",
  "metrics": ["list of numeric things to measure, e.g. revenue, quantity"],
  "dimensions": ["list of grouping columns, e.g. region, product"],
  "filters": ["any specific filters, e.g. Q3, East region"],
  "time_range": "specific time range or null",
  "aggregation": "SUM|AVG|COUNT|MAX|MIN or null"
}}"""

    try:
        response = model.generate_content(prompt)
        raw = response.text.strip()

        # Strip markdown fences if present
        raw = re.sub(r"```(?:json)?", "", raw, flags=re.IGNORECASE).replace("```", "").strip()

        intent = json.loads(raw)
        logger.info(f"Query intent extracted: {intent}")
        return intent
    except Exception as e:
        logger.warning(f"Query understanding failed, using defaults: {e}")
        return {
            "intent": "summarize",
            "metrics": ["revenue"],
            "dimensions": [],
            "filters": [],
            "time_range": None,
            "aggregation": "SUM",
        }


def schema_retrieval_agent(user_question: str, rag_retrieve_fn) -> str:
    """
    Agent 2: Retrieve relevant schema context using RAG.

    Args:
        user_question: The user's question.
        rag_retrieve_fn: Function from rag_engine to perform semantic search.

    Returns:
        Formatted schema context string.
    """
    context = rag_retrieve_fn(user_question)
    logger.info(f"Schema context retrieved ({len(context)} chars)")
    return context


def sql_generation_agent(
    user_question: str,
    schema_context: str,
    query_intent: dict,
    model: genai.GenerativeModel,
    sql_generate_fn,
) -> str:
    """
    Agent 3: Generate SQL from the structured intent and schema context.

    Returns:
        Valid SQLite SQL query string.
    """
    sql = sql_generate_fn(
        user_question=user_question,
        schema_context=schema_context,
        query_intent=query_intent,
        model=model,
    )
    logger.info(f"SQL generated: {sql[:300]}")
    return sql


def query_execution_agent(sql: str, run_query_fn) -> dict:
    """
    Agent 4: Execute the SQL query safely.

    Returns:
        dict with data, columns, row_count, dtypes, dataframe
    """
    result = run_query_fn(sql)
    logger.info(f"Query returned {result['row_count']} rows")
    return result


def data_analysis_agent(
    user_question: str,
    query_result: dict,
    model: genai.GenerativeModel,
) -> dict:
    """
    Agent 5: Analyze query results to determine insights and chart types.

    Returns:
        dict with insights, kpis, charts, summary
    """
    df: pd.DataFrame = query_result.get("dataframe", pd.DataFrame())

    if df.empty:
        return {
            "insights": ["No data was returned for this query."],
            "kpis": [],
            "charts": [],
            "summary": "The query returned no results.",
        }

    # Prepare data summary for prompt
    col_info = {col: str(dtype) for col, dtype in df.dtypes.items()}
    data_sample = df.head(10).to_string(index=False)
    stats = {}
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            stats[col] = {
                "min": float(df[col].min()),
                "max": float(df[col].max()),
                "mean": round(float(df[col].mean()), 2),
                "sum": float(df[col].sum()),
            }
        else:
            stats[col] = {"unique_values": int(df[col].nunique())}

    # Load analysis prompt template
    try:
        template = ANALYSIS_PROMPT_PATH.read_text()
    except FileNotFoundError:
        template = """Analyze this data and return JSON with insights, kpis, charts, summary.
User question: {user_question}
Columns: {column_info}
Data: {data_sample}
Stats: {statistics}
Return ONLY JSON."""

    prompt = template.format(
        user_question=user_question,
        column_info=json.dumps(col_info, indent=2),
        data_sample=data_sample,
        statistics=json.dumps(stats, indent=2),
    )

    try:
        response = model.generate_content(prompt)
        raw = response.text.strip()
        raw = re.sub(r"```(?:json)?", "", raw, flags=re.IGNORECASE).replace("```", "").strip()
        analysis = json.loads(raw)
        logger.info("Data analysis completed successfully")
        return analysis
    except Exception as e:
        logger.warning(f"Data analysis agent failed: {e}")
        # Return sensible defaults
        return {
            "insights": [f"Data contains {len(df)} rows across {len(df.columns)} columns."],
            "kpis": [],
            "charts": _fallback_chart_specs(df),
            "summary": f"Query returned {len(df)} rows.",
        }


def visualization_agent(
    df: pd.DataFrame,
    chart_specs: list[dict],
    user_question: str,
    build_charts_fn,
) -> list[dict]:
    """
    Agent 6: Build Plotly chart configurations from analysis specs.

    Returns:
        List of Plotly chart config dicts.
    """
    charts = build_charts_fn(df, chart_specs, user_question)
    logger.info(f"Built {len(charts)} chart configurations")
    return charts


def dashboard_generator_agent(
    charts: list[dict],
    kpis: list[dict],
    insights: list[str],
    summary: str,
    sql: str,
    query_result: dict,
) -> dict:
    """
    Agent 7: Assemble the final dashboard layout configuration.

    Returns:
        Complete dashboard config dict for the frontend.
    """
    # Sort charts by priority
    sorted_charts = sorted(charts, key=lambda c: c.get("priority", 99))

    dashboard = {
        "kpis": kpis,
        "summary": summary,
        "insights": insights,
        "sql": sql,
        "charts": {
            "main": sorted_charts[0] if len(sorted_charts) > 0 else None,
            "secondary": sorted_charts[1] if len(sorted_charts) > 1 else None,
            "tertiary": sorted_charts[2] if len(sorted_charts) > 2 else None,
        },
        "all_charts": sorted_charts,
        "table": {
            "columns": query_result.get("columns", []),
            "data": query_result.get("data", [])[:100],  # Show max 100 rows in table
            "total_rows": query_result.get("row_count", 0),
            "truncated": query_result.get("truncated", False),
        },
    }

    logger.info("Dashboard configuration assembled")
    return dashboard


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _fallback_chart_specs(df: pd.DataFrame) -> list[dict]:
    """Generate basic chart specs from DataFrame structure."""
    specs = []
    numeric_cols = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]
    cat_cols = [c for c in df.columns if not pd.api.types.is_numeric_dtype(df[c])]
    date_cols = [c for c in df.columns if "date" in c.lower() or "month" in c.lower()]

    if date_cols and numeric_cols:
        specs.append(
            {
                "type": "line",
                "title": f"{numeric_cols[0].title()} Over Time",
                "x_column": date_cols[0],
                "y_column": numeric_cols[0],
                "priority": 1,
            }
        )

    if cat_cols and numeric_cols:
        specs.append(
            {
                "type": "bar",
                "title": f"{numeric_cols[0].title()} by {cat_cols[0].title()}",
                "x_column": cat_cols[0],
                "y_column": numeric_cols[0],
                "priority": 2,
            }
        )

    return specs
