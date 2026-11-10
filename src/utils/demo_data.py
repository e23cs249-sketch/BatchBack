from __future__ import annotations

from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"


def load_batches() -> pd.DataFrame:
    path = DATA_DIR / "batches.csv"
    return pd.read_csv(path)


def load_shipments() -> pd.DataFrame:
    path = DATA_DIR / "shipments.csv"
    df = pd.read_csv(path)
    if "inventory_quantity" not in df.columns:
        df["inventory_quantity"] = 0
    return df
