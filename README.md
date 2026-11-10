# BatchBack
### Every Batch. Every Journey. Every Action.

**An Agentic AI-inspired Food Recall Coordination and Batch Traceability Platform**

BatchBack is a food-safety coordination platform designed to help organizations trace potentially affected food batches, understand downstream distribution exposure, prioritize recall investigations, and coordinate structured response workflows.

Food recalls require more than identifying a defective product. Organizations must understand where a batch originated, where it was distributed, how much inventory may be affected, and what actions should be taken next.

BatchBack brings these activities into one centralized application, providing batch visibility, risk assessment, investigation support, recall workflow management, and audit history.

---

## 1. The Problem

Food-safety incidents can affect manufacturers, suppliers, distributors, retailers, and consumers.

Traditional recall coordination can involve disconnected records, delayed communication, manual investigation, and limited visibility into downstream distribution.

This creates several challenges:

- **Limited traceability:** Identifying the origin and movement of affected batches can take time.
- **Delayed investigations:** Teams may struggle to identify the batches and destinations requiring attention.
- **Inventory exposure:** Understanding the quantity of potentially affected products is difficult without consolidated records.
- **Uncoordinated responses:** Recall actions may be tracked across separate systems and communication channels.
- **Limited accountability:** Maintaining a clear history of investigation and approval decisions can be challenging.

BatchBack addresses these challenges through a centralized, structured recall coordination workflow.

## 2. Our Solution

BatchBack provides a unified interface for monitoring food batches, investigating potential risks, and coordinating human-approved recall workflows.

The platform combines batch records, deterministic risk assessment, investigation evidence, workflow tracking, and audit events.

Its design emphasizes three principles:

1. **Visibility:** Understand batches, suppliers, production information, and distribution exposure.
2. **Intelligence:** Use structured investigation logic to identify risk indicators and prioritize attention.
3. **Accountability:** Keep recall decisions under human approval and maintain a record of workflow actions.

## 3. Key Features

### 3.1 Batch Registry and Traceability
- Centralized food-batch registry.
- Batch identification and product information.
- Supplier and category information.
- Production and expiry dates.
- Quantity and quality-status visibility.
- Recall and investigation status tracking.

### 3.2 Risk Investigation
- Structured investigation of selected batches.
- Deterministic risk scoring and prioritization.
- Evidence and data-provenance information.
- Investigation findings and execution traces.
- Risk-based identification of batches requiring attention.

### 3.3 Recall Operations
- Recall case creation and tracking.
- Human approval and rejection workflow.
- Structured recall execution steps.
- Destination-level workflow tracking in the demonstration environment.
- Closure checks and action history.

### 3.4 Audit History
- Recorded workflow events.
- Investigation and approval history.
- Traceable action records.
- Visibility into recall progress and decisions.

### 3.5 Dashboard and Reports
- Centralized operational dashboard.
- Batch and recall status summaries.
- Risk-level visibility.
- Investigation and operational reports.
- Notification and activity views.

### 3.6 About and Project Information
The application also includes a dedicated About page explaining the food-safety challenge, the BatchBack approach, system capabilities, and its technical direction.

---

## 4. How BatchBack Works

The application follows a structured workflow:

1. **Batch Registration:** Food-batch information is made available in the platform.
2. **Batch Monitoring:** The dashboard provides visibility into batch status and operational indicators.
3. **Investigation:** A selected batch is examined using available records and deterministic risk-assessment logic.
4. **Risk Prioritization:** The system presents findings and risk indicators to support operational decisions.
5. **Human Review:** An authorized user reviews the investigation and approves or rejects the proposed recall workflow.
6. **Recall Coordination:** The demonstration workflow tracks the required response steps and destination-level progress.
7. **Audit and Reporting:** Actions and workflow events remain available for review.

**Important:** Recall execution in the current prototype is simulated. It does not physically isolate inventory, contact distributors, or issue real-world recall notifications.

---

## 5. System Architecture

BatchBack follows a frontend-backend architecture.

### Frontend
The React application provides the user interface for dashboard monitoring, batch exploration, investigations, recall operations, audit history, and reports.

### Backend
FastAPI exposes REST API endpoints for application data, batch information, investigation results, notifications, reports, and recall workflow operations.

### Data Layer
The current demonstration environment uses local SQLite persistence for workflow state and fictional demonstration records.

An IBM Db2 adapter and schema baseline are included as integration groundwork. However, a successful live Db2 connection and schema execution have not yet been verified. The current demonstration must therefore be understood as operating in demo mode, not as a live Db2 deployment.

### Investigation Logic
The current prototype uses deterministic, rule-based risk assessment and structured execution traces. It does not currently claim a live large language model or autonomous AI decision-making integration.

---

## 6. Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite |
| Backend | Python, FastAPI |
| Data persistence | SQLite (demo workflow state) |
| Database integration groundwork | IBM Db2 adapter (`ibm_db`) |
| API | REST |
| Development | VS Code, Ubuntu on WSL |
| Deployment direction | Docker and cloud deployment |

The technology stack reflects the implemented prototype and its integration groundwork.

---

## 7. API Overview

The backend exposes REST endpoints including:

| Endpoint | Purpose |
|---|---|
| `GET /health` | Backend health status |
| `GET /api/dashboard` | Dashboard summary |
| `GET /api/batches` | Retrieve batch records |
| `GET /api/batches/{batch_id}` | Retrieve an individual batch |
| `GET /api/batches/{batch_id}/investigate` | Investigate a selected batch |
| `GET /api/notifications` | Retrieve notifications |
| `GET /api/reports` | Retrieve reports |

Additional recall workflow and audit endpoints support the application's operational features.

Interactive API documentation is available through FastAPI's Swagger interface at `/docs` when the backend is running.

---

## 8. Project Structure

```text
batchback/
│
├── README.md
├── architecture.md
├── submission.json
├── .env.example
├── .gitignore
├── requirements.txt
│
├── app.py
├── server.py
│
├── data/
│
├── docs/
│
├── src/
│   ├── agents/
│   ├── database/
│   ├── tools/
│   └── utils/
│
├── tests/
│
└── frontend/
    ├── package.json
    ├── index.html
    ├── public/
    └── src/
        ├── App.tsx
        ├── App.css
        ├── index.css
        ├── GlobeScene.tsx
        └── main.tsx
```

---

## 9. Installation and Local Setup

### Prerequisites

- Python 3.11 or later
- Node.js and npm
- Git
- Ubuntu, Linux, or WSL environment

### Step 1: Clone the project

```bash
git clone <YOUR_REPOSITORY_URL>
cd batchback
```

### Step 2: Set up the backend

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Step 3: Configure environment variables

```bash
cp .env.example .env
```

Configure the required values in `.env` for your environment. Never commit secrets or credentials.

### Step 4: Start the backend

```bash
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

Backend:

`http://localhost:8000`

API documentation:

`http://localhost:8000/docs`

### Step 5: Set up the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0
```

Open the Vite URL displayed in the terminal, normally:

`http://localhost:5173`

---

## 10. Demonstration Data

The current demonstration environment includes six fictional food batches representing products such as:

- Organic Milk
- Apple Juice
- Packaged Yogurt
- Tomato Sauce
- Fresh Cream
- Orange Nectar

These records are fictional and are intended to demonstrate batch monitoring, risk investigation, and recall coordination. They do not represent actual food-safety incidents or commercial inventory.

---

## 11. Testing and Validation

The project has undergone backend workflow testing and frontend validation.

Latest recorded development checks:

- 3 backend API/workflow tests passed.
- 36 frontend and workflow-related tests passed across 5 test files in the earlier validation run.
- ESLint validation passed.
- Production frontend build completed successfully.
- Responsive browser checks covered 320px, 375px, 768px, 1024px, and 1440px viewport widths.

These results reflect the recorded development checks, not an independent production certification.

---

## 12. Future Enhancements

BatchBack is designed with room for further development:

- Verified live IBM Db2 integration for persistent batch and workflow data.
- Integration with an approved AI orchestration framework.
- LLM-powered investigation assistance with evidence-grounded explanations.
- Real supplier and distributor traceability integrations.
- Secure role-based access control.
- Real-time notifications and recall communication.
- Geographical visualization of distribution networks.
- Production-grade audit logging and monitoring.
- Cloud deployment and scalable data processing.

---

## 13. Impact and Vision

BatchBack aims to make food recall coordination more transparent, structured, and accountable.

By bringing batch information, investigation findings, human decisions, and recall progress into a single platform, it demonstrates how software engineering and intelligent workflow design can support food-safety operations.

Our vision is to move from fragmented recall coordination toward a connected ecosystem where every batch can be traced, every risk can be investigated, and every action can be accounted for.

**BatchBack — Every Batch. Every Journey. Every Action.**

---

## 14. Hackathon Project

**Project:** BatchBack  
**Event:** IBM Db2 TechX Summit – Db2Hack 2026  
**Category:** Food Safety / Supply Chain Traceability

This project is a prototype developed for the hackathon. Its current demo-mode database and investigation limitations are documented transparently in the project architecture and submission metadata.

