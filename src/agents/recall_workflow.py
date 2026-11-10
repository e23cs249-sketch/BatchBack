from __future__ import annotations

from typing import Any


def _priority_score(batch: dict[str, Any], shipments: list[dict[str, Any]]) -> int:
    risk_map = {"Low": 15, "Medium": 35, "High": 55, "Critical": 75}
    total_inventory = sum(int(item.get("inventory_quantity", 0) or 0) for item in shipments)
    return min(
        30
        + risk_map.get(batch.get("risk_level", "Medium"), 35)
        + min(20, len(shipments) * 5)
        + min(15, total_inventory // 100),
        100,
    )


def _risk_factors(batch: dict[str, Any], shipments: list[dict[str, Any]]) -> dict[str, int]:
    risk_map = {"Low": 15, "Medium": 35, "High": 55, "Critical": 75}
    total_inventory = sum(int(item.get("inventory_quantity", 0) or 0) for item in shipments)
    return {
        "baseline": 30,
        "batch_risk": risk_map.get(batch.get("risk_level", "Medium"), 35),
        "shipment_exposure": min(20, len(shipments) * 5),
        "inventory_exposure": min(15, total_inventory // 100),
    }


def generate_recall_recommendation(batch: dict[str, Any], shipments: list[dict[str, Any]]) -> dict[str, Any]:
    destinations = sorted({row.get("destination", "Unknown") for row in shipments})
    total_inventory = sum(int(row.get("inventory_quantity", 0) or 0) for row in shipments)
    risk_score = _priority_score(batch, shipments)
    if risk_score >= 80:
        priority = "Critical"
    elif risk_score >= 60:
        priority = "High"
    elif risk_score >= 40:
        priority = "Medium"
    else:
        priority = "Low"

    reasons = [
        f"Batch {batch.get('batch_id')} is classified as {batch.get('risk_level', 'Medium')} risk.",
        f"{len(shipments)} shipment records were found for this batch.",
        f"{total_inventory} units remain in inventory across {len(destinations)} destinations.",
    ]

    return {
        "batch_id": batch.get("batch_id"),
        "risk_priority": priority,
        "risk_score": risk_score,
        "risk_factors": _risk_factors(batch, shipments),
        "risk_methodology": "Deterministic demo heuristic: baseline + batch risk + shipment count + inventory exposure, capped at 100. Not a validated food-safety model.",
        "affected_destinations": destinations,
        "supporting_evidence": reasons,
        "recommended_action": "Freeze affected inventory and initiate destination-specific recall notifications after human validation.",
        "approval_status": "Pending human approval",
        "outstanding_information": "Verify whether any customer shipments or sales records are missing from the ledger before final recall activation.",
    }


def investigate_batch(repository, batch_id: str) -> dict[str, Any]:
    batch = repository.get_batch_by_id(batch_id)
    if not batch:
        raise ValueError(f"Unknown batch {batch_id}")
    shipments = repository.get_shipments_for_batch(batch_id).to_dict(orient="records")
    result = generate_recall_recommendation(batch, shipments)
    result["batch" ] = batch
    result["shipments"] = shipments
    result["status"] = "Rule-based investigation complete"
    provenance = repository.adapter.get_data_provenance()
    result["data_provenance"] = provenance
    result["execution_trace"] = [
        {
            "step": "Batch and shipment retrieval",
            "method": provenance["mode"],
            "status": "complete",
            "summary": f"Retrieved one batch record and {len(shipments)} shipment records.",
        },
        {
            "step": "Exposure and risk calculation",
            "method": "deterministic rule-based heuristic",
            "status": "complete",
            "summary": f"Calculated score {result['risk_score']}/100 from the documented risk factors.",
        },
        {
            "step": "Recommendation generation",
            "method": "deterministic rule-based recommendation",
            "status": "complete",
            "summary": "Generated a recommendation for human review; no action was executed.",
        },
    ]
    return result
