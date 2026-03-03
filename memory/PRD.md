# KK Mortgage Solutions — CRM System PRD

## Original Problem Statement
Build a comprehensive, web-based CRM system for a UK Mortgage & Insurance Broker business named "KK Mortgage Solutions". Features include authentication, client/case management, pipeline Kanban, commission/revenue engine, task management, analytics, retention automation, document management, GDPR compliance, and a CEO dashboard.

## Tech Stack
- **Backend:** FastAPI, MongoDB (pymongo), Pandas, XlsxWriter, openpyxl
- **Frontend:** React, Tailwind CSS, shadcn/ui, Recharts
- **Auth:** JWT + Emergent-managed Google OAuth (restricted to kunalkapadia2212@gmail.com)
- **Deployment:** Docker/Kubernetes, Supervisor-managed

## Key Business Rules
- **Single advisor:** Kunal Kapadia is the sole account manager. No multi-advisor features.
- **Commission structure:** Bank pays a Proc Fee → user enters Proc Fee amount + their Commission Percentage → system auto-calculates: `Commission = Proc Fee × Percentage / 100`
- **Date format:** UK format dd/mm/yyyy throughout the app
- **Access:** Restricted to kunalkapadia2212@gmail.com only

## Architecture
```
/app/
├── backend/
│   ├── server.py        # Monolithic FastAPI app (all routes)
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
- **clients:** {client_id, firstName, lastName, email, phone, address, property_price, loan_amount, lead_source, ...}
- **cases:** {case_id, client_id, status, productType, mortgageType, lender, loanAmount, proc_fee_total, commission_percentage, gross_commission (auto-calc), commission_status, expected_completion_date, product_expiry_date, ...}
- **tasks:** {task_id, case_id, description, due_date, status, completed}
- **documents:** {document_id, client_id, document_type, file_path}

## Key API Endpoints
- `/api/auth/login`, `/api/auth/register`, `/api/auth/google/callback`
- `/api/clients` (GET w/ enrich_cases, POST 201), `/api/clients/<id>` (GET, PUT, DELETE)
- `/api/cases` (GET w/ filters, POST), `/api/cases/<id>` (GET, PUT)
- `/api/tasks` (GET, POST 201), `/api/tasks/<id>` (PUT)
- `/api/dashboard-stats`, `/api/export/clients`, `/api/export/all`
- `/api/commission/monthly`, `/api/commission/analytics`
- `/api/analytics/mortgage-types`
- `/api/reports/cases-completed`, `/api/reports/commission-paid`, `/api/reports/export`

## What's Been Implemented
- [x] Full-stack CRM with branded UI (KK Mortgage logo, red/white theme)
- [x] Role-based auth (JWT & Google OAuth), access restricted to Kunal's account
- [x] Dashboard with KPI cards, revenue charts, pipeline distribution, working "Add New Client" button
- [x] Client management with row highlighting (green=completed, red=lost, amber=expiring 90d)
- [x] Client table: Name, Security Address, Postcode, Loan Amount, Property Value, LTV, Case Status, Commission Status, Completion Date, Lead Source
- [x] Case management with filters (status, product type, commission status, lender)
- [x] Case detail with Proc Fee + Commission % auto-calc structure
- [x] Pipeline Kanban board
- [x] Commission module: Monthly breakdown, toggle (Monthly/YTD/Custom), stacked charts, detail table
- [x] Task management
- [x] Analytics: 6 tabs (Lead, Mortgage Types, Commission Analytics, Revenue, Pipeline, Retention)
- [x] Custom Business Reports: Cases Completed + Commission Paid with CSV/Excel export
- [x] UK date format (dd/mm/yyyy) throughout all pages
- [x] Single advisor: Kunal Kapadia hardcoded, no multi-advisor dropdowns

## Prioritized Backlog

### P1 — Upcoming
- Document Management: File upload for client documents (object storage)
- Task Automation: Auto-generate tasks from product expiry dates
- Retention Dashboards: "Products Expiring This Year" & "Clients To Contact This Month"

### P2 — Future
- Audit Log: Track all data modifications
- Email Automation: Templates & daily summary
- Backend Refactoring: Break monolithic server.py into /routes/ modules

## Testing
- All tests pass (100%) across iterations 1-4
- Test reports: /app/test_reports/iteration_{1-4}.json
