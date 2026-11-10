from __future__ import annotations

import json
import logging
from typing import Literal

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

from src.agents.recall_workflow import investigate_batch
from src.database.repository import get_repository

logger = logging.getLogger("batchback.api")
app = FastAPI(title="BatchBack API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://0.0.0.0:5173",
        "http://localhost:8501",
        "http://127.0.0.1:8501",
        "http://0.0.0.0:8501",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
repo = get_repository()


class OperatorRequest(BaseModel):
    actor: str = Field(min_length=1, max_length=80)

    @field_validator("actor", mode="before")
    @classmethod
    def trim_actor(cls, value):
        return value.strip() if isinstance(value, str) else value


class RecallCaseRequest(OperatorRequest):
    batch_id: str = Field(min_length=1, max_length=80, pattern=r"^[A-Za-z0-9._-]+$")


class ApprovalRequest(OperatorRequest):
    reason: str = Field(min_length=5, max_length=1000)

    @field_validator("reason", mode="before")
    @classmethod
    def trim_reason(cls, value):
        return value.strip() if isinstance(value, str) else value


class SimulationRequest(OperatorRequest):
    notes: str = Field(default="Demo simulation recorded by operator.", max_length=1000)

    @field_validator("notes", mode="before")
    @classmethod
    def trim_notes(cls, value):
        return value.strip() if isinstance(value, str) else value


class CloseRecallRequest(OperatorRequest):
    reason: str = Field(min_length=5, max_length=1000)

    @field_validator("reason", mode="before")
    @classmethod
    def trim_reason(cls, value):
        return value.strip() if isinstance(value, str) else value


@app.get("/health")
def health():
    database = repo.adapter.get_database_status()
    return {
        "status": "ok",
        "service": "BatchBack",
        "database": database["mode"],
        "database_status": database["status"],
        "database_message": database["message"],
        "ai_mode": "rule-based",
    }


@app.get("/api/dashboard")
def dashboard():
    return repo.get_dashboard_snapshot()


@app.get("/api/batches")
def batches():
    return repo.get_batches().to_dict(orient="records")


@app.get("/api/batches/{batch_id}")
def batch(batch_id: str):
    item = repo.get_batch_by_id(batch_id)
    if not item:
        raise HTTPException(status_code=404, detail="Batch not found")
    return item


@app.get("/api/batches/{batch_id}/investigate")
def batch_investigation(batch_id: str):
    try:
        return investigate_batch(repo, batch_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/api/notifications")
def notifications():
    return repo.get_notifications()


@app.get("/api/recalls")
def recall_cases():
    return repo.list_recall_cases()


@app.post("/api/recalls", status_code=201)
def create_recall_case(payload: RecallCaseRequest):
    try:
        if repo.get_batch_by_id(payload.batch_id) is None:
            raise HTTPException(status_code=404, detail="Batch not found")
        return repo.create_recall_case(payload.batch_id, payload.actor)
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Recall case creation failed")
        raise HTTPException(status_code=500, detail="Unable to create recall case") from exc


@app.get("/api/recalls/{recall_id}")
def recall_case(recall_id: str):
    result = repo.get_recall_case(recall_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Recall case not found")
    return result


@app.post("/api/recalls/{recall_id}/approval")
def decide_recall_case(
    recall_id: str,
    decision: Literal["approved", "rejected"] = Query(...),
    payload: ApprovalRequest = ...,
):
    try:
        return repo.decide_recall_case(recall_id, decision, payload.actor, payload.reason)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Recall case not found") from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@app.post("/api/recalls/{recall_id}/actions/{action_id}/simulate")
def simulate_recall_action(recall_id: str, action_id: int, payload: SimulationRequest):
    try:
        return repo.simulate_recall_action(recall_id, action_id, payload.actor, payload.notes)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Recall case or destination action not found") from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@app.post("/api/recalls/{recall_id}/close")
def close_recall_case(recall_id: str, payload: CloseRecallRequest):
    try:
        return repo.close_recall_case(recall_id, payload.actor, payload.reason)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Recall case not found") from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@app.get("/api/audit")
def audit_logs(recall_id: str | None = Query(default=None, max_length=80, pattern=r"^[A-Za-z0-9._-]+$")):
    return repo.get_audit_logs(recall_id)


@app.get("/api/reports")
def reports():
    report = json.loads(repo.export_report())
    report["recalls"] = repo.list_recall_cases()
    report["audit"] = repo.get_audit_logs()
    report["data_provenance"] = repo.adapter.get_data_provenance()
    return report


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
