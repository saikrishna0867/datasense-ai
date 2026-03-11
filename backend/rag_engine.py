"""
rag_engine.py
-------------
Simple schema storage system - no ChromaDB dependency.
Stores schema as JSON file for Python 3.14 compatibility.
"""
import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

SCHEMA_STORE_PATH = Path(__file__).parent / "data" / "schema_store.json"
SCHEMA_STORE_PATH.parent.mkdir(parents=True, exist_ok=True)

def store_schema_embeddings(schema: dict) -> None:
    """Store schema as a simple JSON file."""
    try:
        store = {}
        if SCHEMA_STORE_PATH.exists():
            store = json.loads(SCHEMA_STORE_PATH.read_text())
        store[schema["table_name"]] = schema
        SCHEMA_STORE_PATH.write_text(json.dumps(store, indent=2))
        logger.info(f"Schema stored for table '{schema['table_name']}'")
    except Exception as e:
        logger.warning(f"Schema store failed (non-fatal): {e}")

def retrieve_schema_context(query: str, table_name: str = "sales") -> str:
    """Retrieve schema context as formatted string."""
    try:
        if not SCHEMA_STORE_PATH.exists():
            return "No schema stored yet."
        store = json.loads(SCHEMA_STORE_PATH.read_text())
        schema = store.get(table_name)
        if not schema:
            return "No schema found for this table."
        lines = [
            f"Table: {schema['table_name']}",
            f"Columns: {', '.join(schema['columns'])}",
            f"Row count: {schema['row_count']}",
            f"Column types: {json.dumps(schema['dtypes'])}",
        ]
        if schema.get("sample_rows"):
            lines.append(f"Sample rows: {json.dumps(schema['sample_rows'][:2])}")
        return "\n".join(lines)
    except Exception as e:
        logger.warning(f"Schema retrieval failed: {e}")
        return "Schema context unavailable."

def clear_schema_embeddings(table_name: str) -> None:
    """Remove stored schema for a table."""
    try:
        if SCHEMA_STORE_PATH.exists():
            store = json.loads(SCHEMA_STORE_PATH.read_text())
            store.pop(table_name, None)
            SCHEMA_STORE_PATH.write_text(json.dumps(store, indent=2))
    except Exception as e:
        logger.warning(f"Schema clear failed (non-fatal): {e}")
