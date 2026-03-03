# KK Mortgage Solutions — CRM System PRD

## Original Problem Statement
Build a comprehensive, web-based CRM system for a UK Mortgage & Insurance Broker business named "KK Mortgage Solutions". Features include authentication, client/case management, pipeline Kanban, commission/revenue engine, task management, analytics, retention automation, document management, GDPR compliance, and a CEO dashboard.

## Tech Stack
- **Backend:** FastAPI, MongoDB (pymongo), Pandas, XlsxWriter, openpyxl
- **Frontend:** React, Tailwind CSS, shadcn/ui, Recharts
- **Auth:** JWT + Emergent-managed Google OAuth (restricted to kunalkapadia2212@gmail.com)

## Key Business Rules
- **Single advisor:** Kunal Kapadia is the sole account manager
- **Commission:** Bank pays Proc Fee → user enters Proc Fee + Commission % → system auto-calculates Commission
- **Date format:** UK format dd/mm/yyyy throughout
- **Access:** Restricted to kunalkapadia2212@gmail.com only

## Dashboard Layout (top to bottom)
1. Welcome header + Add New Client button
2. Expiring Soon (amber) + Contact This Month (blue) — side by side
3. Recent Clients — card grid with initials, status, loan amount
4. Upcoming Tasks — list with priority dots and UK-formatted dates
5. KPI Cards (Total Clients, Pipeline Value, Commission, Conversion Rate)
6. Secondary Stats (6 mini cards)
7. Forecast Cards (30/60/90 day)
8. Charts (Monthly Revenue + Pipeline Distribution)
9. Recent Cases

## What's Been Implemented
- [x] Full-stack CRM with branded UI
- [x] Auth (JWT & Google OAuth), access restricted
- [x] Dashboard with Expiring Soon, Contact This Month, Recent Clients, Tasks prioritized at top
- [x] Client management with row highlighting and enriched columns
- [x] Case management with working filters
- [x] Case detail with Proc Fee + Commission % auto-calc structure
- [x] Pipeline Kanban board
- [x] Commission module with monthly breakdown and toggle views
- [x] Task management
- [x] Analytics: 6 tabs (Lead, Mortgage Types, Commission Analytics, Revenue, Pipeline, Retention)
- [x] Custom Business Reports with CSV/Excel export
- [x] UK date format throughout
- [x] Single advisor (Kunal Kapadia)

## Prioritized Backlog
### P1 — Upcoming
- Document Management: File upload (object storage)
- Task Automation: Auto-generate tasks from product expiry dates

### P2 — Future
- Audit Log, Email Automation, Backend refactoring
