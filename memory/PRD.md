# KK Mortgage Solutions — CRM System PRD

## Original Problem Statement
Build a comprehensive, web-based CRM system for a UK Mortgage & Insurance Broker business named "KK Mortgage Solutions". Features include authentication, client/case management, pipeline Kanban, commission/revenue engine, task management, analytics, retention automation, document management, GDPR compliance, and a CEO dashboard.

## Tech Stack
- **Backend:** FastAPI, MongoDB (pymongo), Pandas, XlsxWriter, openpyxl
- **Frontend:** React, Tailwind CSS, shadcn/ui, Recharts
- **Auth:** JWT + Emergent-managed Google OAuth (restricted to kunalkapadia2212@gmail.com)
- **Deployment:** Docker/Kubernetes, Supervisor-managed

## Architecture
```
/app/
├── backend/
│   ├── server.py        # Monolithic FastAPI app (all routes)
│   ├── tests/
│   ├── .env
│   └── requirements.txt
├── frontend/src/
│   ├── pages/           # Dashboard, Clients, Cases, Pipeline, Commission, Tasks, Analytics, Reports, Documents, Export, Login
│   ├── components/      # Layout, Sidebar, ProtectedRoute, ui/
│   ├── context/         # AuthContext
│   ├── lib/             # api.js
│   └── App.js
└── memory/PRD.md
```

## DB Schema (MongoDB)
- **users:** {email, hashed_password, name, role}
- **clients:** {client_id, firstName, lastName, email, phone, address, property_price, loan_amount, financial_snapshot, lead_source, ...}
- **cases:** {case_id, client_id, status, productType, mortgageType, lender, loanAmount, gross_commission, proc_fee_total, commission_status, expected_completion_date, product_expiry_date, ...}
- **tasks:** {task_id, case_id, description, due_date, status, assigned_to, completed}
- **documents:** {document_id, client_id, document_type, file_path}

## Key API Endpoints
- `/api/auth/login`, `/api/auth/register`, `/api/auth/google/callback`
- `/api/clients` (GET w/ enrich_cases, POST 201), `/api/clients/<id>` (GET, PUT, DELETE)
- `/api/cases` (GET w/ filters, POST), `/api/cases/<id>` (GET, PUT)
- `/api/tasks` (GET, POST 201), `/api/tasks/<id>` (PUT)
- `/api/dashboard-stats`, `/api/export/clients`, `/api/export/all`
- `/api/commission/monthly` (GET w/ year, start_date, end_date)
- `/api/commission/analytics` (GET w/ date range, product_filter, commission_status)
- `/api/analytics/mortgage-types` (GET)
- `/api/reports/cases-completed` (GET w/ start_date, end_date)
- `/api/reports/commission-paid` (GET w/ start_date, end_date)
- `/api/reports/export` (GET w/ report_type, start_date, end_date, format)

## What's Been Implemented (as of 2026-03-03)
- [x] Full-stack CRM foundation with branded UI (KK Mortgage logo, red/white theme)
- [x] Role-based authentication (JWT & Google OAuth)
- [x] Access restriction to kunalkapadia2212@gmail.com
- [x] Dashboard with KPI cards, revenue charts, pipeline distribution
- [x] Client management (CRUD, search, filters, list view)
- [x] **Client list with row highlighting** (green=completed, red=lost, amber=expiring 90d)
- [x] **Client list new columns**: Security Address, Postcode, Loan Amount, Property Value, auto-calc LTV, Case Status, Commission Status, Completion Date, Lead Source
- [x] Case management (CRUD, detail page with full editing)
- [x] **Cases filter bug fixed** (was crashing from empty SelectItem values)
- [x] Pipeline Kanban board
- [x] **Commission module enhanced**: Monthly breakdown (Pending/Submitted/Paid/Clawed Back), Mortgage vs Insurance split, Proc Fees, Monthly/YTD/Custom Range toggle, stacked bar charts, detail table with totals
- [x] Commission tracker with inline status updates
- [x] Task management (CRUD)
- [x] **Analytics page with 6 tabs**: Lead Analytics, Mortgage Types, Commission Analytics, Revenue, Pipeline, Retention
- [x] **Mortgage Type Analytics**: Case count, percentage, commission, avg loan per type; Pie chart + Bar chart
- [x] **Commission Analytics module**: By Month, Lender, Product Type, Lead Source, Advisor; with date range/product/status filters
- [x] **Custom Business Reports page**: Cases Completed + Commission Paid within date range, with CSV/Excel export
- [x] Documents page (UI only)
- [x] Generic data export page
- [x] Formatted Client Excel Export

## Prioritized Backlog

### P1 — Upcoming
- Document Management: File upload for client documents (object storage integration)
- Task Automation: Auto-generate tasks based on product expiry dates
- Retention Dashboards: "Products Expiring This Year" & "Clients To Contact This Month"

### P2 — Future
- Advanced Analytics: More granular revenue per referral partner charts
- Audit Log: Track all data modifications
- Email Automation: Templates & daily summary email
- Backend Refactoring: Break monolithic server.py into /routes/ modules

## Testing
- Backend: 21/21 tests pass (100%) across all iterations
- Frontend: All pages and flows verified (100%)
- Test reports: /app/test_reports/iteration_1.json, iteration_2.json, iteration_3.json
