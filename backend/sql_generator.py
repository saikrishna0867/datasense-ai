"""
sql_generator.py
----------------
SQL Generation module using Google Gemini LLM.
Takes structured query intent + RAG schema context → produces valid SQLite SQL.
"""

import re
import logging
from pathlib import Path
import google.generativeai as genai
from typing import Optional

logger = logging.getLogger(__name__)

# Load prompt template
PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "sql_prompt.txt"


def _load_prompt_template() -> str:
    """Load the SQL generation prompt template from file."""
    try:
        return PROMPT_PATH.read_text()
    except FileNotFoundError:
        logger.warning("sql_prompt.txt not found, using inline template")
        return """You are an expert SQL analyst. Generate a valid SQLite SELECT query.

DATABASE SCHEMA CONTEXT:
{schema_context}

USER QUESTION: {user_question}
QUERY INTENT: {query_intent}

Return ONLY the SQL query, no explanation, no markdown."""


def generate_sql(
    user_question: str,
    schema_context: str,
    query_intent: dict,
    model: genai.GenerativeModel,
) -> str:
    """
    Generate a SQL query from natural language using Gemini.

    Args:
        user_question: The original user question.
        schema_context: Schema context retrieved from RAG.
        query_intent: Structured intent dict from Query Understanding Agent.
        model: Initialized Gemini GenerativeModel.

    Returns:
        A clean SQL query string.

    Raises:
        ValueError: If no valid SQL could be generated.
    """
    template = _load_prompt_template()

    prompt = template.format(
        schema_context=schema_context,
        user_question=user_question,
        query_intent=str(query_intent),
    )

    logger.info("Generating SQL via Gemini...")
    response = model.generate_content(prompt)
    raw_sql = response.text.strip()

    # Clean up: remove markdown code fences if present
    cleaned_sql = _clean_sql(raw_sql)

    logger.info(f"Generated SQL: {cleaned_sql[:200]}")
    return cleaned_sql


def _clean_sql(raw: str) -> str:
    """
    Strip markdown fences and whitespace from LLM SQL output.

    Args:
        raw: Raw text output from LLM.

    Returns:
        Clean SQL string.
    """
    # Remove ```sql ... ``` or ``` ... ``` blocks
    raw = re.sub(r"```(?:sql)?", "", raw, flags=re.IGNORECASE)
    raw = raw.replace("```", "").strip()

    # Take only the first SQL statement if multiple exist
    # Split on semicolon and take the first non-empty statement
    statements = [s.strip() for s in raw.split(";") if s.strip()]
    if statements:
        return statements[0] + ";"

    return raw


def validate_sql(sql: str) -> tuple[bool, Optional[str]]:
    """
    Lightweight SQL validation before execution.

    Args:
        sql: The SQL query to validate.

    Returns:
        (is_valid, error_message)
    """
    if not sql or not sql.strip():
        return False, "Empty SQL query"

    blocked = ["DROP", "DELETE", "ALTER", "INSERT", "UPDATE", "TRUNCATE", "EXEC"]
    sql_upper = sql.upper()

    for keyword in blocked:
        if re.search(rf"\b{keyword}\b", sql_upper):
            return False, f"Blocked keyword: {keyword}"

    if not re.search(r"\bSELECT\b", sql_upper):
        return False, "Query must be a SELECT statement"

    return True, None
