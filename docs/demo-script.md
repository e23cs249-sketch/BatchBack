# BatchBack presentation walkthrough

## Suggested five-minute demo

### 1. Set expectations (30 seconds)

Introduce BatchBack as a food-recall coordination prototype. Explain that the visible batch/shipment records are illustrative demo data, risk scores are deterministic heuristics, recall actions are simulations, and no live Db2 or LLM service is assumed.

### 2. Explore product and traceability (1 minute)

Open the landing page and About page, then visit the Batch Registry. Search for a batch such as `B001` and open its details. Point out the shipment destinations and that the information comes from the current API data source.

### 3. Show investigation transparency (1 minute)

Open AI Recall Intelligence, select `B001`, and run the investigation. Highlight the evidence summary, score formula, data provenance, and step trace. Clarify that “AI” in the page name refers to the product concept; the implementation shown is deterministic rules, not an LLM.

### 4. Walk through human approval (1.5 minutes)

Go to Recall Operations and create a case for `B001`. Confirm the case appears as **Awaiting approval**. Approve it with a reason, then use **Record simulation** for each destination. Explain that the explicit simulation does not send notifications or move/hold real inventory. Close the case only after the steps are recorded.

### 5. Show accountability (1 minute)

Open Audit History and identify the case creation, approval, destination simulation, and closure records. Finish with Reports and note that case/audit counts are local demo workflow state.

## Resetting demo workflow state

Stop the backend and remove the specific local state file configured by `DEMO_STATE_DB` (defaults to `data/batchback-demo-workflow.sqlite3`) only when you intentionally want to reset demo cases. This does not reset or modify the checked-in CSV records.
