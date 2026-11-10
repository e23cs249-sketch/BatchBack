from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from typing import Any

from src.config import DATABASE_MODE, DB2_DSN, DB2_PWD, DB2_UID
from src.utils.demo_data import load_batches, load_shipments

logger = logging.getLogger(__name__)


class BaseStorageAdapter(ABC):
    @abstractmethod
    def fetch_batches(self):
        raise NotImplementedError

    @abstractmethod
    def fetch_shipments(self):
        raise NotImplementedError

    def get_database_status(self) -> dict[str, str]:
        return {
            "mode": "demo",
            "status": "demo",
            "message": "Demo CSV data is active; a live Db2 connection is not verified.",
        }

    def get_data_provenance(self) -> dict[str, str]:
        return {
            "mode": "demo",
            "status": "demo",
            "message": "Demo CSV records are the source for this response.",
        }


class DemoDBAdapter(BaseStorageAdapter):
    def __init__(self):
        self._batches = load_batches()
        self._shipments = load_shipments()

    def fetch_batches(self):
        return self._batches.copy()

    def fetch_shipments(self):
        return self._shipments.copy()


class Db2Adapter(BaseStorageAdapter):
    def __init__(self, dsn: str | None = None, uid: str | None = None, pwd: str | None = None):
        self.dsn = dsn or DB2_DSN
        self.uid = uid or DB2_UID
        self.pwd = pwd or DB2_PWD
        self._fallback = DemoDBAdapter()
        self._last_error: str | None = None
        self._table_sources: dict[str, str] = {}

    def get_data_provenance(self) -> dict[str, str]:
        if not self._is_configured():
            return self._fallback.get_data_provenance()
        if self._table_sources.get("BATCHES") == "demo" or self._table_sources.get("SHIPMENTS") == "demo":
            error = self._last_error
            return {
                "mode": "demo",
                "status": "fallback",
                "message": "One or more required Db2 tables used demo CSV fallback data.",
            }
        if self._table_sources.get("BATCHES") != "db2" or self._table_sources.get("SHIPMENTS") != "db2":
            return {
                "mode": "demo",
                "status": "not_fetched",
                "message": "Db2 is configured; not all response data has been fetched.",
            }
        return {
            "mode": "db2",
            "status": "connected",
            "message": "Batch and shipment records were fetched from Db2.",
        }

    def _is_configured(self) -> bool:
        return bool(self.dsn and self.uid and self.pwd)

    def get_database_status(self) -> dict[str, str]:
        if not self._is_configured():
            return {
                "mode": "demo",
                "status": "demo",
                "message": "Db2 is not fully configured; demo CSV data is active.",
            }
        try:
            import ibm_db

            connection = ibm_db.connect(self.dsn, self.uid, self.pwd)
            try:
                batches = self._query_dataframe(
                    connection,
                    "SELECT * FROM BATCHES ORDER BY production_date DESC FETCH FIRST 1 ROW ONLY",
                )
                shipments = self._query_dataframe(
                    connection,
                    "SELECT * FROM SHIPMENTS ORDER BY shipped_date DESC FETCH FIRST 1 ROW ONLY",
                )
                required_batch_columns = {
                    "batch_id", "product_name", "product_category", "manufacturer",
                    "production_date", "expiry_date", "production_quantity",
                    "batch_quality_status", "recall_status", "risk_level",
                }
                required_shipment_columns = {
                    "batch_id", "product", "production_date", "expiry_date",
                    "shipped_quantity", "destination", "inventory_quantity",
                    "recall_status", "shipment_status",
                }
                if not required_batch_columns.issubset(batches.columns):
                    raise ValueError("BATCHES does not match the required BatchBack columns")
                if not required_shipment_columns.issubset(shipments.columns):
                    raise ValueError("SHIPMENTS does not match the required BatchBack columns")
            finally:
                ibm_db.close(connection)
            if "demo" in self._table_sources.values():
                return {
                    "mode": "demo",
                    "status": "fallback",
                    "message": "A recent Db2 read used demo CSV fallback; refresh the affected data before treating Db2 as active.",
                }
            self._last_error = None
            return {
                "mode": "db2",
                "status": "connected",
                "message": "Db2 connection and required BatchBack tables validated.",
            }
        except Exception as exc:
            self._last_error = type(exc).__name__
            logger.warning("Db2 connection validation failed (%s); demo data remains active", self._last_error)
            return {
                "mode": "demo",
                "status": "connection_error",
                "message": "Db2 could not be reached; demo CSV data remains active.",
            }

    def _fetch(self, table: str, order_by: str):
        if not self._is_configured():
            self._table_sources[table] = "demo"
            return self._fallback.fetch_batches() if table == "BATCHES" else self._fallback.fetch_shipments()
        try:
            import ibm_db

            connection = ibm_db.connect(self.dsn, self.uid, self.pwd)
            try:
                result = self._query_dataframe(connection, f"SELECT * FROM {table} ORDER BY {order_by}")
                required_columns = (
                    {
                        "batch_id", "product_name", "product_category", "manufacturer",
                        "production_date", "expiry_date", "production_quantity",
                        "batch_quality_status", "recall_status", "risk_level",
                    }
                    if table == "BATCHES"
                    else {
                        "batch_id", "product", "production_date", "expiry_date",
                        "shipped_quantity", "destination", "inventory_quantity",
                        "recall_status", "shipment_status",
                    }
                )
                if not required_columns.issubset(result.columns):
                    raise ValueError(f"{table} does not match the required BatchBack columns")
                self._last_error = None
                self._table_sources[table] = "db2"
                return result
            finally:
                ibm_db.close(connection)
        except Exception as exc:
            self._last_error = type(exc).__name__
            self._table_sources[table] = "demo"
            logger.warning("Db2 query failed for %s (%s); demo data remains active", table, self._last_error)
            return self._fallback.fetch_batches() if table == "BATCHES" else self._fallback.fetch_shipments()

    def fetch_batches(self):
        return self._fetch("BATCHES", "production_date DESC")

    def fetch_shipments(self):
        return self._fetch("SHIPMENTS", "shipped_date DESC")

    @staticmethod
    def _query_dataframe(conn: Any, sql: str):
        import ibm_db

        stmt = ibm_db.exec_immediate(conn, sql)
        columns = [column[0] for column in ibm_db.description(stmt)]
        rows = []
        while True:
            row = ibm_db.fetch_assoc(stmt)
            if not row:
                break
            rows.append(row)
        import pandas as pd

        return pd.DataFrame(rows, columns=columns).rename(columns=str.lower)


def get_storage_adapter() -> BaseStorageAdapter:
    if DATABASE_MODE.lower() == "db2":
        return Db2Adapter()
    return DemoDBAdapter()
