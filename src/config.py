from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "data"

load_dotenv(PROJECT_ROOT / ".env")

DATABASE_MODE = os.getenv("DATABASE_MODE", "demo")
DB2_DSN = os.getenv("DB2_DSN", "")
DB2_UID = os.getenv("DB2_UID", "")
DB2_PWD = os.getenv("DB2_PWD", "")
AI_MODEL = os.getenv("AI_MODEL", "rule-based")
ENABLE_AI = os.getenv("ENABLE_AI", "false").lower() in {"1", "true", "yes", "on"}
DEMO_STATE_DB = Path(os.getenv("DEMO_STATE_DB", str(DATA_DIR / "batchback-demo-workflow.sqlite3")))
