from __future__ import annotations

from typing import Any


def retrieve_batch(repository, batch_id: str) -> dict[str, Any]:
    batch = repository.get_batch_by_id(batch_id)
    if not batch:
        raise ValueError(f"Batch {batch_id} not found")
    return batch


def retrieve_shipments(repository, batch_id: str):
    return repository.get_shipments_for_batch(batch_id).to_dict(orient="records")


def assess_risk(batch: dict[str, Any], shipments: list[dict[str, Any]]) -> dict[str, Any]:
    total_inventory = sum(int(item.get("inventory_quantity", 0) or 0) for item in shipments)
    risk_level = batch.get("risk_level", "Medium")
    risk_score = max(10, min(100, 35 + ("High" == risk_level) * 25 + ("Critical" == risk_level) * 30 + total_inventory // 100))
    return {"risk_level": risk_level, "risk_score": risk_score, "inventory_exposure": total_inventory}


def plan_recall(repository, batch_id: str) -> dict[str, Any]:
    batch = retrieve_batch(repository, batch_id)
    shipments = retrieve_shipments(repository, batch_id)
    risk = assess_risk(batch, shipments)
    destinations = sorted({item.get("destination", "Unknown") for item in shipments})
    return {
        "batch_id": batch_id,
        "product": batch.get("product_name"),
        "risk": risk,
        "destinations": destinations,
        "alert": f"Human review required before moving batch {batch_id} into active recall operations.",
    }
