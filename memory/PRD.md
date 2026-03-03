# KK Mortgage Solutions — CRM System PRD

## Original Problem Statement
Build a comprehensive, web-based CRM system for a UK Mortgage & Insurance Broker business named "KK Mortgage Solutions". Features include authentication, client/case management, pipeline Kanban, commission/revenue engine, task management, analytics, retention automation, document management, GDPR compliance, and a CEO dashboard.

## Tech Stack
- **Backend:** FastAPI, MongoDB (pymongo), Pandas, XlsxWriter
- **Frontend:** React, Tailwind CSS, shadcn/ui, Recharts
- **Auth:** JWT + Emergent-managed Google OAuth (restricted to kunalkapadia2212@gmail.com)
- **Deployment:** Docker/Kubernetes, Supervisor-managed

## Architecture
```
/app/
├── backend/
│   ├── server.py        # Monolithic FastAPI app (all routes)
│   ├── tests/
│   │   └── test_crm_api.py
│   ├── .env
│   └── requirements.txt
├── frontend/src/
│   ├── pages/           # Dashboard, Clients, Cases, Pipeline, Commission, Tasks, Analytics, Documents, Export, Login
│   ├── components/      # Layout, Sidebar, ProtectedRoute, ui/
│   ├── context/         # AuthContext
│   ├── lib/             # api.js
│   └── App.js
└── memory/PRD.md
```

## DB Schema (MongoDB)
- **users:** {email, hashed_password, name, role}
- **clients:** {client_id, firstName, lastName, email, phone, address, financial_snapshot, lead_source, ...}
- **cases:** {case_id, client_id, status, productType, lender, loanAmount, commission_details, dates, ...}
- **tasks:** {task_id, case_id, description, due_date, status, assigned_to, completed}
- **documents:** {document_id, client_id, document_type, file_path}

## Key API Endpoints
- `/api/auth/login`, `/api/auth/register`, `/api/auth/google/callback`
- `/api/clients` (GET, POST 201), `/api/clients/<id>` (GET, PUT, DELETE)
- `/api/cases` (GET, POST), `/api/cases/<id>` (GET, PUT)
- `/api/tasks` (GET, POST 201), `/api/tasks/<id>` (PUT)
- `/api/dashboard-stats`, `/api/export/clients`, `/api/export/all`
- `/api/lead-analytics`, `/api/retention`

## What's Been Implemented (as of 2026-03-03)
- [x] Full-stack CRM foundation with branded UI (KK Mortgage logo, red/white theme)
- [x] Role-based authentication (JWT & Google OAuth)
- [x] Access restriction to kunalkapadia2212@gmail.com
- [x] Dashboard with KPI cards, revenue charts, pipeline distribution
- [x] Client management (CRUD, search, filters, list view)
- [x] Case management (CRUD, detail page with full editing)
- [x] Pipeline Kanban board
- [x] Commission tracking with charts and forecast (30/60/90 days)
- [x] Task management (CRUD)
- [x] Analytics page (Lead Analytics, Revenue, Pipeline, Retention tabs)
- [x] Documents page (UI only)
- [x] Generic data export page
- [x] **Formatted Client Excel Export** (backend + frontend "Export to Excel" button)
- [x] POST /api/clients returns 201, POST /api/tasks returns 201
- [x] Chart container sizing fix (minWidth/minHeight on ResponsiveContainer)

## Prioritized Backlog

### P1 — Upcoming
- Document Management: File upload for client documents (object storage integration)
- Task Automation: Auto-generate tasks based on product expiry dates
- Retention Dashboards: "Products Expiring This Year" & "Clients To Contact This Month"

### P2 — Future
- Advanced Analytics: Conversion rate per lead source, revenue per referral partner, dedicated chart pages
- Audit Log: Track all data modifications
- Email Automation: Templates & daily summary email
- Backend Refactoring: Break monolithic server.py into /routes/ modules

## Testing
- Backend: 21/21 tests pass (100%)
- Frontend: All pages and flows verified (100%)
- Test reports: /app/test_reports/iteration_1.json, /app/test_reports/iteration_2.json
- Test file: /app/backend/tests/test_crm_api.py

## Notes
- Email sending is NOT implemented (user deferred)
- Console warnings for Recharts container dimensions are cosmetic only
