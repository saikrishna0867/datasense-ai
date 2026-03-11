"""
query_executor.py
-----------------
Safe query execution layer.
Executes SQL queries on SQLite and returns results as pandas DataFrames.
Includes safety checks to block destructive operations.
"""

import pandas as pd
import logging
from typing import Optional
from database import execute_query

logger = logging.getLogger(__name__)

MAX_ROWS = 1000  # Hard cap on query results


def run_query(sql: str, table_name: str = "sales") -> dict:
    """
    Execute SQL safely and return structured results.

    Args:
        sql: The validated SQL query.
        table_name: Primary table for context.

    Returns:
        dict with:
            - data: list of row dicts
            - columns: list of column names
            - row_count: number of rows returned
            - dtypes: column data types
            - truncated: bool if results were truncated
    """
    logger.info(f"Executing query on table '{table_name}'")

    df = execute_query(sql, table_name)

    truncated = False
    if len(df) > MAX_ROWS:
        logger.warning(f"Result truncated from {len(df)} to {MAX_ROWS} rows")
        df = df.head(MAX_ROWS)
        truncated = True

    return {
        "data": df.to_dict(orient="records"),
        "columns": list(df.columns),
        "row_count": len(df),
        "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
        "truncated": truncated,
        "dataframe": df,  # Internal use for analysis agent
    }


def get_column_stats(df: pd.DataFrame) -> dict:
    """
    Compute basic statistics for each column.

    Args:
        df: Query result DataFrame.

    Returns:
        dict mapping column names to stat dicts.
    """
    stats = {}
    for col in df.columns:
        col_stats = {"dtype": str(df[col].dtype), "null_count": int(df[col].isnull().sum())}

        if pd.api.types.is_numeric_dtype(df[col]):
            col_stats.update(
                {
                    "min": float(df[col].min()) if not df[col].isnull().all() else None,
                    "max": float(df[col].max()) if not df[col].isnull().all() else None,
                    "mean": float(df[col].mean()) if not df[col].isnull().all() else None,
                    "sum": float(df[col].sum()),
                    "type_category": "numeric",
                }
            )
        elif "date" in col.lower() or "time" in col.lower():
            col_stats["type_category"] = "datetime"
        else:
            col_stats.update(
                {
                    "unique_count": int(df[col].nunique()),
                    "top_values": df[col].value_counts().head(5).to_dict(),
                    "type_category": "categorical",
                }
            )

    stats[col] = col_stats
    return stats


def detect_column_roles(df: pd.DataFrame) -> dict:
    """
    Detect which columns are dimensions vs measures.

    Returns:
        dict with 'dimensions' and 'measures' lists.
    """
    dimensions = []
    measures = []
    time_columns = []

    for col in df.columns:
        if "date" in col.lower() or "time" in col.lower() or "month" in col.lower() or "year" in col.lower():
            time_columns.append(col)
        elif pd.api.types.is_numeric_dtype(df[col]):
            measures.append(col)
        else:
            dimensions.append(col)

    return {
        "dimensions": dimensions,
        "measures": measures,
        "time_columns": time_columns,
    }
