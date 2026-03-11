"""
database.py
-----------
SQLite database management module.
Handles CSV ingestion, table creation, and query execution.
"""

import sqlite3
import pandas as pd
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Path to the SQLite database file
DB_PATH = Path(__file__).parent / "data" / "bi_dashboard.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)


def get_connection() -> sqlite3.Connection:
    """Create and return a new SQLite connection."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def ingest_csv(file_path: str, table_name: str = "sales") -> dict:
    """
    Ingest a CSV file into SQLite.

    Args:
        file_path: Path to the CSV file.
        table_name: Name of the SQLite table to create/replace.

    Returns:
        dict with table_name, columns, row_count, dtypes
    """
    logger.info(f"Ingesting CSV: {file_path} → table '{table_name}'")

    df = pd.read_csv(file_path)

    # Clean column names: lowercase, replace spaces with underscores
    df.columns = [col.strip().lower().replace(" ", "_") for col in df.columns]

    # Attempt to parse date columns automatically
    for col in df.columns:
        if "date" in col or "time" in col:
            try:
                df[col] = pd.to_datetime(df[col]).dt.strftime("%Y-%m-%d")
            except Exception:
                pass

    conn = get_connection()
    try:
        df.to_sql(table_name, conn, if_exists="replace", index=False)
        conn.commit()
        logger.info(f"Ingested {len(df)} rows into '{table_name}'")
    finally:
        conn.close()

    return {
        "table_name": table_name,
        "columns": list(df.columns),
        "row_count": len(df),
        "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
        "sample_rows": df.head(3).to_dict(orient="records"),
    }


def get_schema(table_name: str = "sales") -> Optional[dict]:
    """
    Retrieve schema information for a table.

    Returns:
        dict with table_name, columns, dtypes, row_count, sample_rows
        or None if table does not exist.
    """
    conn = get_connection()
    try:
        cursor = conn.cursor()

        # Check if table exists
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
            (table_name,),
        )
        if not cursor.fetchone():
            return None

        # Fetch column info
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns_info = cursor.fetchall()
        columns = [row["name"] for row in columns_info]
        dtypes = {row["name"]: row["type"] for row in columns_info}

        # Row count
        cursor.execute(f"SELECT COUNT(*) as cnt FROM {table_name}")
        row_count = cursor.fetchone()["cnt"]

        # Sample rows
        cursor.execute(f"SELECT * FROM {table_name} LIMIT 5")
        sample_rows = [dict(row) for row in cursor.fetchall()]

        return {
            "table_name": table_name,
            "columns": columns,
            "dtypes": dtypes,
            "row_count": row_count,
            "sample_rows": sample_rows,
        }
    finally:
        conn.close()


def list_tables() -> list[str]:
    """Return a list of all tables in the database."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        return [row["name"] for row in cursor.fetchall()]
    finally:
        conn.close()


def execute_query(sql: str, table_name: str = "sales") -> pd.DataFrame:
    """
    Execute a SELECT SQL query safely.

    Args:
        sql: The SQL query string.
        table_name: The primary table name (used for validation).

    Returns:
        pandas DataFrame with query results.

    Raises:
        ValueError: If the query contains destructive keywords.
        RuntimeError: If the query fails.
    """
    # Safety check: block destructive SQL operations
    blocked_keywords = ["DROP", "DELETE", "ALTER", "INSERT", "UPDATE", "TRUNCATE", "CREATE"]
    sql_upper = sql.upper()
    for keyword in blocked_keywords:
        if keyword in sql_upper:
            raise ValueError(f"Destructive SQL keyword '{keyword}' is not allowed.")

    if not sql_upper.strip().startswith("SELECT"):
        raise ValueError("Only SELECT queries are permitted.")

    conn = get_connection()
    try:
        df = pd.read_sql_query(sql, conn)
        logger.info(f"Query returned {len(df)} rows")
        return df
    except Exception as e:
        logger.error(f"Query execution failed: {e}")
        raise RuntimeError(f"Query execution failed: {str(e)}")
    finally:
        conn.close()
