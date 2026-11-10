from __future__ import annotations

import json
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator


class DemoWorkflowStore:
    """Durable local workflow state for simulated recall actions in demo mode."""

    def __init__(self, database_path: str | Path):
        self.database_path = str(database_path)
        if self.database_path != ":memory:":
            Path(self.database_path).parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    @staticmethod
    def _now() -> str:
        return datetime.now(timezone.utc).isoformat()

    @contextmanager
    def _connect(self) -> Iterator[sqlite3.Connection]:
        connection = sqlite3.connect(self.database_path, timeout=10)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("PRAGMA busy_timeout = 10000")
        try:
            with connection:
                yield connection
        finally:
            connection.close()

    def _initialize(self) -> None:
        with self._connect() as connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS recall_cases (
                    recall_id TEXT PRIMARY KEY,
                    batch_id TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    investigation_json TEXT NOT NULL,
                    closed_at TEXT
                );
                CREATE INDEX IF NOT EXISTS idx_recall_cases_batch ON recall_cases(batch_id);
                CREATE UNIQUE INDEX IF NOT EXISTS idx_recall_cases_one_open_per_batch
                    ON recall_cases(batch_id)
                    WHERE status NOT IN ('Rejected', 'Closed');
                CREATE TABLE IF NOT EXISTS recall_actions (
                    action_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    recall_id TEXT NOT NULL REFERENCES recall_cases(recall_id),
                    destination TEXT NOT NULL,
                    action TEXT NOT NULL,
                    status TEXT NOT NULL,
                    progress INTEGER NOT NULL DEFAULT 0 CHECK(progress BETWEEN 0 AND 100),
                    simulated INTEGER NOT NULL DEFAULT 1 CHECK(simulated = 1),
                    updated_at TEXT NOT NULL,
                    UNIQUE(recall_id, destination)
                );
                CREATE TABLE IF NOT EXISTS approvals (
                    approval_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    recall_id TEXT NOT NULL UNIQUE REFERENCES recall_cases(recall_id),
                    decision TEXT NOT NULL CHECK(decision IN ('approved', 'rejected')),
                    actor TEXT NOT NULL,
                    reason TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS audit_logs (
                    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    actor TEXT NOT NULL,
                    action TEXT NOT NULL,
                    recall_id TEXT,
                    batch_id TEXT,
                    timestamp TEXT NOT NULL,
                    details_json TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS workflow_notifications (
                    notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    message TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    source TEXT NOT NULL DEFAULT 'Demo workflow',
                    created_at TEXT NOT NULL
                );
                """
            )

    @staticmethod
    def _json(value: Any) -> str:
        return json.dumps(value, default=str)

    def _record_audit(
        self,
        connection: sqlite3.Connection,
        *,
        actor: str,
        action: str,
        recall_id: str | None,
        batch_id: str | None,
        details: dict[str, Any],
    ) -> None:
        connection.execute(
            """INSERT INTO audit_logs(actor, action, recall_id, batch_id, timestamp, details_json)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (actor, action, recall_id, batch_id, self._now(), self._json(details)),
        )

    def _notification(
        self,
        connection: sqlite3.Connection,
        title: str,
        message: str,
        severity: str,
    ) -> None:
        connection.execute(
            """INSERT INTO workflow_notifications(title, message, severity, created_at)
               VALUES (?, ?, ?, ?)""",
            (title, message, severity, self._now()),
        )

    def create_case(self, batch_id: str, investigation: dict[str, Any], actor: str) -> dict[str, Any]:
        now = self._now()
        recall_id = f"BB-RC-{uuid.uuid4().hex[:10].upper()}"
        batch = investigation["batch"]
        destinations = sorted({row["destination"] for row in investigation["shipments"] if row.get("destination")})
        try:
            with self._connect() as connection:
                active = connection.execute(
                    """SELECT recall_id FROM recall_cases
                       WHERE batch_id = ? AND status NOT IN ('Rejected', 'Closed') LIMIT 1""",
                    (batch_id,),
                ).fetchone()
                if active:
                    raise ValueError(f"An open recall case already exists for batch {batch_id}")

                connection.execute(
                    """INSERT INTO recall_cases
                       (recall_id, batch_id, status, created_at, updated_at, investigation_json)
                       VALUES (?, ?, 'Awaiting approval', ?, ?, ?)""",
                    (recall_id, batch_id, now, now, self._json(investigation)),
                )
                for destination in destinations:
                    connection.execute(
                        """INSERT INTO recall_actions
                           (recall_id, destination, action, status, updated_at)
                           VALUES (?, ?, 'Simulated destination notice and inventory hold', 'Awaiting approval', ?)""",
                        (recall_id, destination, now),
                    )
                self._record_audit(
                    connection,
                    actor=actor,
                    action="recall_case_created",
                    recall_id=recall_id,
                    batch_id=batch_id,
                    details={"status": "Awaiting approval", "destination_count": len(destinations)},
                )
                self._notification(
                    connection,
                    f"Recall approval requested · {recall_id}",
                    f"Batch {batch_id} requires human review before any simulated actions.",
                    investigation.get("risk_priority", "Medium"),
                )
        except sqlite3.IntegrityError as exc:
            raise ValueError(f"An open recall case already exists for batch {batch_id}") from exc
        return self.get_case(recall_id)

    def get_case(self, recall_id: str) -> dict[str, Any] | None:
        with self._connect() as connection:
            row = connection.execute("SELECT * FROM recall_cases WHERE recall_id = ?", (recall_id,)).fetchone()
            if row is None:
                return None
            actions = connection.execute(
                "SELECT action_id, destination, action, status, progress, simulated, updated_at FROM recall_actions WHERE recall_id = ? ORDER BY destination",
                (recall_id,),
            ).fetchall()
            approvals = connection.execute(
                "SELECT decision, actor, reason, created_at FROM approvals WHERE recall_id = ?",
                (recall_id,),
            ).fetchall()
        case = dict(row)
        case["investigation"] = json.loads(case.pop("investigation_json"))
        case["actions"] = [dict(action) for action in actions]
        case["approvals"] = [dict(approval) for approval in approvals]
        return case

    def list_cases(self) -> list[dict[str, Any]]:
        with self._connect() as connection:
            recall_ids = connection.execute(
                "SELECT recall_id FROM recall_cases ORDER BY created_at DESC"
            ).fetchall()
        return [self.get_case(row["recall_id"]) for row in recall_ids]

    def decide(self, recall_id: str, decision: str, actor: str, reason: str) -> dict[str, Any]:
        with self._connect() as connection:
            case = connection.execute(
                "SELECT batch_id, status FROM recall_cases WHERE recall_id = ?", (recall_id,)
            ).fetchone()
            if case is None:
                raise KeyError(recall_id)
            if case["status"] != "Awaiting approval":
                raise ValueError(f"Recall case is {case['status']} and cannot be decided again")
            now = self._now()
            status = "Approved" if decision == "approved" else "Rejected"
            connection.execute(
                "INSERT INTO approvals(recall_id, decision, actor, reason, created_at) VALUES (?, ?, ?, ?, ?)",
                (recall_id, decision, actor, reason, now),
            )
            connection.execute(
                "UPDATE recall_cases SET status = ?, updated_at = ? WHERE recall_id = ?",
                (status, now, recall_id),
            )
            connection.execute(
                "UPDATE recall_actions SET status = ?, updated_at = ? WHERE recall_id = ?",
                (("Ready for simulation" if decision == "approved" else status), now, recall_id),
            )
            self._record_audit(
                connection,
                actor=actor,
                action=f"recall_{decision}",
                recall_id=recall_id,
                batch_id=case["batch_id"],
                details={"reason": reason, "status": status},
            )
            self._notification(
                connection,
                f"Recall {status.lower()} · {recall_id}",
                f"Batch {case['batch_id']} decision recorded by {actor}. No external action was performed.",
                "Medium",
            )
        result = self.get_case(recall_id)
        if result is None:
            raise RuntimeError("Recall case disappeared after approval transaction")
        return result

    def simulate_action(self, recall_id: str, action_id: int, actor: str, notes: str) -> dict[str, Any]:
        with self._connect() as connection:
            case = connection.execute(
                "SELECT batch_id, status FROM recall_cases WHERE recall_id = ?", (recall_id,)
            ).fetchone()
            if case is None:
                raise KeyError(recall_id)
            if case["status"] != "Approved":
                raise ValueError("A human-approved recall case is required before simulation")
            action = connection.execute(
                "SELECT destination, status FROM recall_actions WHERE action_id = ? AND recall_id = ?",
                (action_id, recall_id),
            ).fetchone()
            if action is None:
                raise KeyError(str(action_id))
            if action["status"] == "Simulated complete":
                raise ValueError("This destination action has already been simulated")
            now = self._now()
            connection.execute(
                """UPDATE recall_actions SET status = 'Simulated complete', progress = 100, updated_at = ?
                   WHERE action_id = ? AND recall_id = ?""",
                (now, action_id, recall_id),
            )
            self._record_audit(
                connection,
                actor=actor,
                action="destination_action_simulated",
                recall_id=recall_id,
                batch_id=case["batch_id"],
                details={
                    "destination": action["destination"],
                    "progress": 100,
                    "simulated": True,
                    "notes": notes,
                    "disclaimer": "No external notification or physical inventory action was performed.",
                },
            )
            self._notification(
                connection,
                f"Simulation recorded · {action['destination']}",
                f"Recall case {recall_id}: simulated workflow step only; no external message or physical action was performed.",
                "Low",
            )
        result = self.get_case(recall_id)
        if result is None:
            raise RuntimeError("Recall case disappeared after simulation transaction")
        return result

    def close_case(self, recall_id: str, actor: str, reason: str) -> dict[str, Any]:
        with self._connect() as connection:
            case = connection.execute(
                "SELECT batch_id, status FROM recall_cases WHERE recall_id = ?", (recall_id,)
            ).fetchone()
            if case is None:
                raise KeyError(recall_id)
            if case["status"] != "Approved":
                raise ValueError("Only an approved recall case can be closed")
            actions = connection.execute(
                "SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'Simulated complete' THEN 1 ELSE 0 END) AS done FROM recall_actions WHERE recall_id = ?",
                (recall_id,),
            ).fetchone()
            if not actions["total"] or actions["done"] != actions["total"]:
                raise ValueError("All destination actions must be simulated before case closure")
            now = self._now()
            connection.execute(
                "UPDATE recall_cases SET status = 'Closed', updated_at = ?, closed_at = ? WHERE recall_id = ?",
                (now, now, recall_id),
            )
            self._record_audit(
                connection,
                actor=actor,
                action="recall_case_closed",
                recall_id=recall_id,
                batch_id=case["batch_id"],
                details={"reason": reason, "simulated_actions": actions["done"]},
            )
        result = self.get_case(recall_id)
        if result is None:
            raise RuntimeError("Recall case disappeared after closure transaction")
        return result

    def list_audit(self, recall_id: str | None = None) -> list[dict[str, Any]]:
        query = "SELECT * FROM audit_logs"
        parameters: tuple[str, ...] = ()
        if recall_id:
            query += " WHERE recall_id = ?"
            parameters = (recall_id,)
        query += " ORDER BY event_id DESC"
        with self._connect() as connection:
            rows = connection.execute(query, parameters).fetchall()
        result = []
        for row in rows:
            event = dict(row)
            event["details"] = json.loads(event.pop("details_json"))
            result.append(event)
        return result

    def list_notifications(self) -> list[dict[str, Any]]:
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT notification_id AS id, title, message, severity, 0 AS read, source, created_at FROM workflow_notifications ORDER BY notification_id DESC"
            ).fetchall()
        return [dict(row) for row in rows]
