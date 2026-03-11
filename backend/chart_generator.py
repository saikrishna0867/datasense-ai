"""
chart_generator.py
------------------
Visualization configuration generator.
Takes query results and analysis → produces Plotly-compatible chart configs.
"""

import pandas as pd
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def build_chart_configs(
    df: pd.DataFrame,
    chart_specs: list[dict],
    user_question: str,
) -> list[dict]:
    """
    Build Plotly chart configurations from analysis specs.

    Args:
        df: Query result DataFrame.
        chart_specs: List of chart spec dicts from Data Analysis Agent.
        user_question: Original user question (for fallback titles).

    Returns:
        List of Plotly-compatible chart configuration dicts.
    """
    configs = []

    for spec in chart_specs:
        try:
            config = _build_single_chart(df, spec)
            if config:
                configs.append(config)
        except Exception as e:
            logger.warning(f"Failed to build chart '{spec.get('title')}': {e}")

    # If no charts were built, attempt auto-detection
    if not configs:
        logger.info("Falling back to auto-detected charts")
        configs = _auto_detect_charts(df, user_question)

    return configs


def _build_single_chart(df: pd.DataFrame, spec: dict) -> Optional[dict]:
    """Build a single Plotly chart config from a spec dict."""
    chart_type = spec.get("type", "bar")
    title = spec.get("title", "Chart")
    x_col = spec.get("x_column")
    y_col = spec.get("y_column")

    # Validate columns exist
    if x_col and x_col not in df.columns:
        x_col = _find_best_column(df, "categorical")
    if y_col and y_col not in df.columns:
        y_col = _find_best_column(df, "numeric")

    if not x_col or not y_col:
        return None

    x_data = df[x_col].tolist()
    y_data = df[y_col].tolist()

    base_config = {
        "title": title,
        "type": chart_type,
        "description": spec.get("description", ""),
        "priority": spec.get("priority", 99),
    }

    if chart_type == "bar":
        return {
            **base_config,
            "data": [{"x": x_data, "y": y_data, "type": "bar", "name": y_col}],
            "layout": {
                "title": title,
                "xaxis": {"title": x_col.replace("_", " ").title()},
                "yaxis": {"title": y_col.replace("_", " ").title()},
            },
        }

    elif chart_type == "line":
        return {
            **base_config,
            "data": [
                {
                    "x": x_data,
                    "y": y_data,
                    "type": "scatter",
                    "mode": "lines+markers",
                    "name": y_col,
                }
            ],
            "layout": {
                "title": title,
                "xaxis": {"title": x_col.replace("_", " ").title()},
                "yaxis": {"title": y_col.replace("_", " ").title()},
            },
        }

    elif chart_type == "pie":
        return {
            **base_config,
            "data": [
                {
                    "labels": x_data,
                    "values": y_data,
                    "type": "pie",
                    "textinfo": "label+percent",
                    "hole": 0.3,
                }
            ],
            "layout": {"title": title},
        }

    elif chart_type == "histogram":
        return {
            **base_config,
            "data": [{"x": y_data, "type": "histogram", "name": y_col}],
            "layout": {
                "title": title,
                "xaxis": {"title": y_col.replace("_", " ").title()},
                "yaxis": {"title": "Count"},
            },
        }

    else:
        # Default to bar chart
        return {
            **base_config,
            "type": "bar",
            "data": [{"x": x_data, "y": y_data, "type": "bar"}],
            "layout": {
                "title": title,
                "xaxis": {"title": x_col.replace("_", " ").title()},
                "yaxis": {"title": y_col.replace("_", " ").title()},
            },
        }


def _auto_detect_charts(df: pd.DataFrame, question: str) -> list[dict]:
    """
    Auto-detect chart configurations when LLM analysis is unavailable.

    Applies heuristics:
    - Date/time column → line chart
    - Categorical + numeric → bar chart
    - Two numeric columns → scatter
    """
    if df.empty or len(df.columns) < 2:
        return []

    charts = []
    cols = df.columns.tolist()
    numeric_cols = [c for c in cols if pd.api.types.is_numeric_dtype(df[c])]
    date_cols = [c for c in cols if "date" in c.lower() or "month" in c.lower() or "year" in c.lower()]
    categorical_cols = [c for c in cols if c not in numeric_cols and c not in date_cols]

    if date_cols and numeric_cols:
        charts.append(
            _build_single_chart(
                df,
                {
                    "type": "line",
                    "title": f"{numeric_cols[0].replace('_', ' ').title()} Over Time",
                    "x_column": date_cols[0],
                    "y_column": numeric_cols[0],
                    "priority": 1,
                },
            )
        )

    if categorical_cols and numeric_cols:
        charts.append(
            _build_single_chart(
                df,
                {
                    "type": "bar",
                    "title": f"{numeric_cols[0].replace('_', ' ').title()} by {categorical_cols[0].replace('_', ' ').title()}",
                    "x_column": categorical_cols[0],
                    "y_column": numeric_cols[0],
                    "priority": 2,
                },
            )
        )

        if len(numeric_cols) >= 1:
            charts.append(
                _build_single_chart(
                    df,
                    {
                        "type": "pie",
                        "title": f"Distribution of {numeric_cols[0].replace('_', ' ').title()}",
                        "x_column": categorical_cols[0],
                        "y_column": numeric_cols[0],
                        "priority": 3,
                    },
                )
            )

    return [c for c in charts if c is not None]


def _find_best_column(df: pd.DataFrame, col_type: str) -> Optional[str]:
    """Find the best column of a given type."""
    if col_type == "numeric":
        numeric_cols = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]
        return numeric_cols[0] if numeric_cols else None
    elif col_type == "categorical":
        cat_cols = [c for c in df.columns if not pd.api.types.is_numeric_dtype(df[c])]
        return cat_cols[0] if cat_cols else df.columns[0] if len(df.columns) > 0 else None
    return None


def build_kpi_cards(df: pd.DataFrame, kpis_from_analysis: list[dict]) -> list[dict]:
    """
    Build KPI card data, merging LLM analysis with actual data stats.

    Args:
        df: Query result DataFrame.
        kpis_from_analysis: KPI specs from Data Analysis Agent.

    Returns:
        List of KPI card dicts.
    """
    cards = list(kpis_from_analysis) if kpis_from_analysis else []

    # Always add row count
    cards.append(
        {
            "label": "Total Records",
            "value": str(len(df)),
            "description": "Number of rows returned",
        }
    )

    # Add sum/max for numeric columns if not already provided
    if len(cards) < 4:
        for col in df.columns:
            if pd.api.types.is_numeric_dtype(df[col]):
                total = df[col].sum()
                cards.append(
                    {
                        "label": f"Total {col.replace('_', ' ').title()}",
                        "value": f"{total:,.0f}" if total == int(total) else f"{total:,.2f}",
                        "description": f"Sum of all {col} values",
                    }
                )
            if len(cards) >= 4:
                break

    return cards[:4]  # Return max 4 KPIs
