"""
langgraph_workflow.py
---------------------
Multi-agent workflow using LangGraph.
Orchestrates all 7 AI agents in a directed graph pipeline.
"""

import logging
from typing import TypedDict, Optional, Any
from langgraph.graph import StateGraph, END
import google.generativeai as genai

from agents import (
    query_understanding_agent,
    schema_retrieval_agent,
    sql_generation_agent,
    query_execution_agent,
    data_analysis_agent,
    visualization_agent,
    dashboard_generator_agent,
)
from rag_engine import retrieve_schema_context
from sql_generator import generate_sql
from query_executor import run_query
from chart_generator import build_chart_configs, build_kpi_cards

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# LangGraph State Definition
# ---------------------------------------------------------------------------

class DashboardState(TypedDict):
    """Shared state flowing through all agents in the pipeline."""
    # Input
    user_question: str
    table_name: str

    # Agent outputs (populated as pipeline progresses)
    query_intent: Optional[dict]
    schema_context: Optional[str]
    sql: Optional[str]
    query_result: Optional[dict]
    analysis: Optional[dict]
    charts: Optional[list]
    dashboard: Optional[dict]

    # Error state
    error: Optional[str]
    error_stage: Optional[str]


# ---------------------------------------------------------------------------
# Node Functions (each wraps one agent)
# ---------------------------------------------------------------------------

def node_understand_query(state: DashboardState) -> DashboardState:
    """Node 1: Extract intent from user question."""
    try:
        model = state["_model"]
        intent = query_understanding_agent(state["user_question"], model)
        return {**state, "query_intent": intent}
    except Exception as e:
        logger.error(f"[understand_query] {e}")
        return {**state, "error": str(e), "error_stage": "query_understanding"}


def node_retrieve_schema(state: DashboardState) -> DashboardState:
    """Node 2: RAG schema retrieval."""
    if state.get("error"):
        return state
    try:
        context = schema_retrieval_agent(state["user_question"], retrieve_schema_context)
        return {**state, "schema_context": context}
    except Exception as e:
        logger.error(f"[retrieve_schema] {e}")
        return {**state, "error": str(e), "error_stage": "schema_retrieval"}


def node_generate_sql(state: DashboardState) -> DashboardState:
    """Node 3: Generate SQL from intent + schema context."""
    if state.get("error"):
        return state
    try:
        model = state["_model"]
        sql = sql_generation_agent(
            user_question=state["user_question"],
            schema_context=state["schema_context"] or "",
            query_intent=state["query_intent"] or {},
            model=model,
            sql_generate_fn=generate_sql,
        )
        return {**state, "sql": sql}
    except Exception as e:
        logger.error(f"[generate_sql] {e}")
        return {**state, "error": str(e), "error_stage": "sql_generation"}


def node_execute_query(state: DashboardState) -> DashboardState:
    """Node 4: Execute the SQL query."""
    if state.get("error"):
        return state
    try:
        result = query_execution_agent(state["sql"], run_query)
        if result["row_count"] == 0:
            return {
                **state,
                "error": "The query returned no results. This question may not be answerable with the current dataset.",
                "error_stage": "query_execution",
            }
        return {**state, "query_result": result}
    except ValueError as e:
        # Destructive SQL or validation error
        return {**state, "error": str(e), "error_stage": "sql_safety"}
    except RuntimeError as e:
        return {**state, "error": str(e), "error_stage": "query_execution"}


def node_analyze_data(state: DashboardState) -> DashboardState:
    """Node 5: Analyze query results for insights and chart recommendations."""
    if state.get("error"):
        return state
    try:
        model = state["_model"]
        analysis = data_analysis_agent(
            user_question=state["user_question"],
            query_result=state["query_result"],
            model=model,
        )
        return {**state, "analysis": analysis}
    except Exception as e:
        logger.error(f"[analyze_data] {e}")
        # Non-fatal: continue with empty analysis
        return {
            **state,
            "analysis": {
                "insights": [],
                "kpis": [],
                "charts": [],
                "summary": "Analysis could not be completed.",
            },
        }


def node_build_visualizations(state: DashboardState) -> DashboardState:
    """Node 6: Build Plotly chart configurations."""
    if state.get("error"):
        return state
    try:
        df = state["query_result"]["dataframe"]
        chart_specs = state["analysis"].get("charts", [])

        charts = visualization_agent(
            df=df,
            chart_specs=chart_specs,
            user_question=state["user_question"],
            build_charts_fn=build_chart_configs,
        )
        return {**state, "charts": charts}
    except Exception as e:
        logger.error(f"[build_visualizations] {e}")
        return {**state, "charts": [], "error": str(e), "error_stage": "visualization"}


def node_assemble_dashboard(state: DashboardState) -> DashboardState:
    """Node 7: Assemble the final dashboard config."""
    if state.get("error") and not state.get("charts"):
        return state
    try:
        analysis = state.get("analysis") or {}
        df = state["query_result"]["dataframe"]

        kpis = build_kpi_cards(df, analysis.get("kpis", []))

        dashboard = dashboard_generator_agent(
            charts=state.get("charts", []),
            kpis=kpis,
            insights=analysis.get("insights", []),
            summary=analysis.get("summary", ""),
            sql=state.get("sql", ""),
            query_result=state.get("query_result", {}),
        )
        return {**state, "dashboard": dashboard}
    except Exception as e:
        logger.error(f"[assemble_dashboard] {e}")
        return {**state, "error": str(e), "error_stage": "dashboard_assembly"}


# ---------------------------------------------------------------------------
# Router: abort pipeline on error
# ---------------------------------------------------------------------------

def route_on_error(state: DashboardState) -> str:
    if state.get("error"):
        return "end"
    return "continue"


# ---------------------------------------------------------------------------
# Graph Builder
# ---------------------------------------------------------------------------

def build_workflow() -> StateGraph:
    """
    Build and compile the LangGraph multi-agent workflow.

    Returns:
        Compiled LangGraph application.
    """
    workflow = StateGraph(DashboardState)

    # Register nodes
    workflow.add_node("understand_query", node_understand_query)
    workflow.add_node("retrieve_schema", node_retrieve_schema)
    workflow.add_node("generate_sql", node_generate_sql)
    workflow.add_node("execute_query", node_execute_query)
    workflow.add_node("analyze_data", node_analyze_data)
    workflow.add_node("build_visualizations", node_build_visualizations)
    workflow.add_node("assemble_dashboard", node_assemble_dashboard)

    # Entry point
    workflow.set_entry_point("understand_query")

    # Linear pipeline with error routing at each step
    pipeline_nodes = [
        "understand_query",
        "retrieve_schema",
        "generate_sql",
        "execute_query",
        "analyze_data",
        "build_visualizations",
        "assemble_dashboard",
    ]

    for i, node in enumerate(pipeline_nodes[:-1]):
        next_node = pipeline_nodes[i + 1]
        workflow.add_conditional_edges(
            node,
            route_on_error,
            {"continue": next_node, "end": END},
        )

    workflow.add_edge("assemble_dashboard", END)

    return workflow.compile()


# Singleton compiled workflow
_compiled_workflow = None


def get_workflow():
    """Get or create the compiled workflow singleton."""
    global _compiled_workflow
    if _compiled_workflow is None:
        _compiled_workflow = build_workflow()
    return _compiled_workflow


def run_pipeline(user_question: str, model: genai.GenerativeModel, table_name: str = "sales") -> dict:
    """
    Execute the full multi-agent pipeline for a user question.

    Args:
        user_question: Natural language business question.
        model: Initialized Gemini model.
        table_name: Active database table name.

    Returns:
        Final state dict (check 'error' key for failures, 'dashboard' for results).
    """
    workflow = get_workflow()

    initial_state: DashboardState = {
        "user_question": user_question,
        "table_name": table_name,
        "query_intent": None,
        "schema_context": None,
        "sql": None,
        "query_result": None,
        "analysis": None,
        "charts": None,
        "dashboard": None,
        "error": None,
        "error_stage": None,
        "_model": model,  # Injected dependency (not part of TypedDict schema)
    }

    logger.info(f"Starting pipeline for: '{user_question}'")
    final_state = workflow.invoke(initial_state)
    logger.info(f"Pipeline complete. Error: {final_state.get('error')}")

    return final_state
