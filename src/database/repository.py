from __future__ import annotations

import json
from typing import Any

import pandas as pd

from src.config import DEMO_STATE_DB
from src.database.db_adapter import get_storage_adapter
from src.database.demo_workflow import DemoWorkflowStore
from src.agents.recall_workflow import investigate_batch


class BatchBackRepository:
    def __init__(self, adapter=None, workflow_store: DemoWorkflowStore | None = None):
        self.adapter = adapter or get_storage_adapter()
        self.workflow_store = workflow_store or DemoWorkflowStore(DEMO_STATE_DB)
        self._notifications = [
            {
                "id": 1,
                "title": "Batch B001 recall review",
                "message": "Inventory exposure flagged in Chennai and Hyderabad.",
                "severity": "High",
                "read": False,
                "source": "Demo data",
            },
            {
                "id": 2,
                "title": "B003 investigation status",
                "message": "Risk review updated for packaged yogurt distribution.",
                "severity": "Medium",
                "read": True,
                "source": "Rule engine",
            },
            {
                "id": 3,
                "title": "Inventory isolation reminder",
                "message": "Two destinations require confirmation before moving stock.",
                "severity": "Low",
                "read": False,
                "source": "Demo data",
            },
        ]

    def get_batches(self) -> pd.DataFrame:
        return self.adapter.fetch_batches()

    def get_shipments(self) -> pd.DataFrame:
        return self.adapter.fetch_shipments()

    def get_dashboard_snapshot(self) -> dict[str, Any]:
        batches = self.get_batches()
        shipments = self.get_shipments()

        total_batches = len(batches)
        active_statuses = {"dispatched", "in transit"}
        active_shipments = int(shipments["shipment_status"].astype(str).str.lower().isin(active_statuses).sum())
        under_investigation = int(
            batches["recall_status"].astype(str).str.lower().str.contains("investigation").sum()
        )
        pending_recall = sum(case["status"] in {"Awaiting approval", "Approved"} for case in self.list_recall_cases())
        non_clear = shipments[shipments["recall_status"].astype(str).str.lower() != "clear"]
        affected_destinations = int(non_clear["destination"].nunique())
        inventory_awaiting_isolation = int(non_clear["inventory_quantity"].sum())

        return {
            "total_registered_batches": total_batches,
            "active_shipments": active_shipments,
            "batches_under_investigation": under_investigation,
            "pending_recall_operations": pending_recall,
            "affected_destinations": affected_destinations,
            "inventory_awaiting_isolation": inventory_awaiting_isolation,
            "data_provenance": self.adapter.get_data_provenance(),
        }

    def get_batch_by_id(self, batch_id: str):
        df = self.get_batches()
        matching = df[df["batch_id"] == batch_id]
        return matching.iloc[0].to_dict() if not matching.empty else None

    def get_shipments_for_batch(self, batch_id: str) -> pd.DataFrame:
        shipments = self.get_shipments()
        return shipments[shipments["batch_id"] == batch_id].copy()

    def get_impact_summary(self, batch_id: str) -> dict[str, Any]:
        batch = self.get_batch_by_id(batch_id)
        if not batch:
            raise ValueError(f"Unknown batch {batch_id}")

        shipments = self.get_shipments_for_batch(batch_id)
        destinations = shipments["destination"].unique().tolist()
        total_inventory = int(shipments["inventory_quantity"].sum())
        affected = shipments[shipments["recall_status"].str.lower().str.contains("pending|investig")].copy()

        return {
            "batch": batch,
            "destinations": destinations,
            "total_inventory": total_inventory,
            "shipments": shipments.to_dict(orient="records"),
            "affected_destinations": affected["destination"].tolist(),
            "risk_level": batch.get("risk_level", "Medium"),
        }

    def get_notifications(self, filter_type: str | None = None):
        alerts = self.workflow_store.list_notifications() + self._notifications
        if filter_type:
            alerts = [n for n in alerts if n["severity"].lower() == filter_type.lower()]
        return sorted(alerts, key=lambda item: item.get("created_at", ""), reverse=True)

    def create_recall_case(self, batch_id: str, actor: str) -> dict[str, Any]:
        investigation = investigate_batch(self, batch_id)
        return self.workflow_store.create_case(batch_id, investigation, actor)

    def list_recall_cases(self) -> list[dict[str, Any]]:
        return self.workflow_store.list_cases()

    def get_recall_case(self, recall_id: str) -> dict[str, Any] | None:
        return self.workflow_store.get_case(recall_id)

    def decide_recall_case(self, recall_id: str, decision: str, actor: str, reason: str) -> dict[str, Any]:
        return self.workflow_store.decide(recall_id, decision, actor, reason)

    def simulate_recall_action(
        self, recall_id: str, action_id: int, actor: str, notes: str
    ) -> dict[str, Any]:
        return self.workflow_store.simulate_action(recall_id, action_id, actor, notes)

    def close_recall_case(self, recall_id: str, actor: str, reason: str) -> dict[str, Any]:
        return self.workflow_store.close_case(recall_id, actor, reason)

    def get_audit_logs(self, recall_id: str | None = None) -> list[dict[str, Any]]:
        return self.workflow_store.list_audit(recall_id)

    def create_operation(self, payload: dict[str, Any]) -> dict[str, Any]:
        payload = dict(payload)
        payload["id"] = max((n["id"] for n in self._notifications), default=0) + 1
        payload["source"] = "Demo mode"
        payload["read"] = False
        self._notifications.insert(0, payload)
        return payload

    def export_report(self) -> str:
        batches = self.get_batches().to_json(orient="records")
        shipments = self.get_shipments().to_json(orient="records")
        return json.dumps({"batches": json.loads(batches), "shipments": json.loads(shipments)})


def get_repository() -> BatchBackRepository:
    return BatchBackRepository()
