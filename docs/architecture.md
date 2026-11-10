# BatchBack architecture and workflow

## Application architecture

```mermaid
flowchart LR
  Browser["React + TypeScript + Vite"] -->|"HTTP / JSON"| API["FastAPI server"]
  API --> Repo["BatchBack repository"]
  Repo --> Adapter["Storage adapter"]
  Adapter --> CSV["Illustrative CSV demo data"]
  Adapter -. "optional; not verified by default" .-> Db2["IBM Db2"]
  API --> Rules["Deterministic investigation components"]
  API --> Workflow["SQLite local demo workflow store"]
  Workflow --> Cases["Recall cases and simulated actions"]
  Workflow --> Audit["Workflow event records"]
  Workflow --> Notices["Local workflow notifications"]
```

Batch and shipment reads are routed through the repository. Demo mode is the default. The Db2 adapter validates both connectivity and the required table columns; unsuccessful reads use the CSV fallback and retain explicit source provenance. Recall workflow state remains local SQLite in this prototype, independent of the batch data adapter.

## Investigation sequence

```mermaid
sequenceDiagram
  participant U as Operator
  participant F as React UI
  participant A as FastAPI
  participant R as Repository and adapter
  participant I as Deterministic investigation

  U->>F: Select batch and request investigation
  F->>A: GET /api/batches/{batch_id}/investigate
  A->>I: investigate_batch(repository, batch_id)
  I->>R: Read batch and linked shipment records
  R-->>I: Records and source provenance
  I->>I: Calculate explainable heuristic score
  I->>I: Generate evidence summary and recommendation
  I-->>A: Result with methodology, provenance, execution trace
  A-->>F: JSON result
  F-->>U: Show evidence and require human review
```

The investigation stages are ordinary deterministic Python functions, not autonomous LLM agents. Scores and recommendations are not validated food-safety decisions.

## Recall lifecycle

1. A user creates a case from the current batch investigation. It is persisted as **Awaiting approval**.
2. A named reviewer records an approval or rejection with a reason. No external operation is triggered.
3. Only an **Approved** case can record destination actions. Each action requires an explicit operator simulation request and remains labeled simulated.
4. An approved case can be closed only after all of its destination steps have been simulated.
5. Each transition writes an event to the local audit table. These records are useful for demo traceability, but are not an immutable or production-grade audit system.
