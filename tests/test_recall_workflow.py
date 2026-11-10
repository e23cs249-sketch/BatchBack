from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

import server
from src.database.db_adapter import DemoDBAdapter
from src.database.demo_workflow import DemoWorkflowStore
from src.database.repository import BatchBackRepository


class RecallWorkflowApiTests(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.original_repository = server.repo
        workflow_store = DemoWorkflowStore(Path(self.temporary_directory.name) / "workflow.sqlite3")
        server.repo = BatchBackRepository(adapter=DemoDBAdapter(), workflow_store=workflow_store)
        self.client = TestClient(server.app)

    def tearDown(self):
        server.repo = self.original_repository
        self.temporary_directory.cleanup()

    def test_core_api_routes_and_demo_provenance(self):
        health = self.client.get("/health")
        self.assertEqual(health.status_code, 200)
        self.assertEqual(health.json()["database"], "demo")
        self.assertEqual(health.json()["ai_mode"], "rule-based")

        batches = self.client.get("/api/batches")
        self.assertEqual(batches.status_code, 200)
        self.assertTrue(batches.json())
        batch_id = batches.json()[0]["batch_id"]
        investigation = self.client.get(f"/api/batches/{batch_id}/investigate")
        self.assertEqual(investigation.status_code, 200)
        result = investigation.json()
        self.assertEqual(result["data_provenance"]["mode"], "demo")
        self.assertEqual(len(result["execution_trace"]), 3)
        self.assertIn("baseline", result["risk_factors"])

        self.assertEqual(self.client.get("/api/dashboard").status_code, 200)
        self.assertEqual(self.client.get("/api/notifications").status_code, 200)
        report = self.client.get("/api/reports")
        self.assertEqual(report.status_code, 200)
        self.assertIn("recalls", report.json())
        self.assertIn("audit", report.json())
        self.assertEqual(report.json()["data_provenance"]["mode"], "demo")
        self.assertEqual(self.client.get("/api/batches/not-a-batch").status_code, 404)

        cors = self.client.options(
            "/health",
            headers={
                "Origin": "http://localhost:5174",
                "Access-Control-Request-Method": "GET",
            },
        )
        self.assertEqual(cors.headers.get("access-control-allow-origin"), "http://localhost:5174")

    def test_human_approval_simulation_and_close_lifecycle(self):
        created = self.client.post(
            "/api/recalls",
            json={"batch_id": "B001", "actor": "  Safety Operator  "},
        )
        self.assertEqual(created.status_code, 201)
        case = created.json()
        self.assertEqual(case["status"], "Awaiting approval")
        self.assertGreater(len(case["actions"]), 0)
        self.assertEqual(case["approvals"], [])
        self.assertEqual(case["investigation"]["data_provenance"]["mode"], "demo")
        self.assertEqual(
            self.client.post(
                "/api/recalls",
                json={"batch_id": "B001", "actor": "Another Operator"},
            ).status_code,
            409,
        )

        self.assertEqual(
            self.client.post(
                f"/api/recalls/{case['recall_id']}/actions/{case['actions'][0]['action_id']}/simulate",
                json={"actor": "Operator", "notes": "Before approval"},
            ).status_code,
            409,
        )
        approval = self.client.post(
            f"/api/recalls/{case['recall_id']}/approval?decision=approved",
            json={"actor": "Reviewer", "reason": "Evidence reviewed and approved."},
        )
        self.assertEqual(approval.status_code, 200)

        self.assertEqual(
            self.client.post(
                f"/api/recalls/{case['recall_id']}/close",
                json={"actor": "Reviewer", "reason": "Closing before all actions."},
            ).status_code,
            409,
        )
        for action in case["actions"]:
            response = self.client.post(
                f"/api/recalls/{case['recall_id']}/actions/{action['action_id']}/simulate",
                json={"actor": "Operator", "notes": "Simulation only."},
            )
            self.assertEqual(response.status_code, 200)

        duplicate = self.client.post(
            f"/api/recalls/{case['recall_id']}/actions/{case['actions'][0]['action_id']}/simulate",
            json={"actor": "Operator", "notes": "Duplicate simulation."},
        )
        self.assertEqual(duplicate.status_code, 409)

        closed = self.client.post(
            f"/api/recalls/{case['recall_id']}/close",
            json={"actor": "Reviewer", "reason": "All simulated steps reviewed."},
        )
        self.assertEqual(closed.status_code, 200)
        self.assertEqual(closed.json()["status"], "Closed")
        audit = self.client.get(f"/api/audit?recall_id={case['recall_id']}").json()
        self.assertEqual(
            {event["action"] for event in audit},
            {
                "recall_case_created",
                "recall_approved",
                "destination_action_simulated",
                "recall_case_closed",
            },
        )

    def test_rejection_and_request_validation(self):
        self.assertEqual(
            self.client.post("/api/recalls", json={"batch_id": "missing", "actor": "Operator"}).status_code,
            404,
        )
        self.assertEqual(
            self.client.post("/api/recalls", json={"batch_id": "B001", "actor": "   "}).status_code,
            422,
        )

        case = self.client.post(
            "/api/recalls",
            json={"batch_id": "B003", "actor": "Operator"},
        ).json()
        rejected = self.client.post(
            f"/api/recalls/{case['recall_id']}/approval?decision=rejected",
            json={"actor": "Reviewer", "reason": "Evidence does not support activation."},
        )
        self.assertEqual(rejected.status_code, 200)
        self.assertEqual(rejected.json()["status"], "Rejected")
        self.assertEqual(
            self.client.post(
                f"/api/recalls/{case['recall_id']}/approval?decision=approved",
                json={"actor": "Reviewer", "reason": "Attempt to override rejection."},
            ).status_code,
            409,
        )


if __name__ == "__main__":
    unittest.main()
