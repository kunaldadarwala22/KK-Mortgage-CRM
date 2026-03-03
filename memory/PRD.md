# KK Mortgage Solutions — CRM System PRD

## Original Problem Statement
Build a comprehensive, web-based CRM system for a UK Mortgage & Insurance Broker business named "KK Mortgage Solutions".

## Key Business Rules
- **Single advisor:** Kunal Kapadia is the sole account manager
- **Commission:** Bank pays Proc Fee → user enters Proc Fee + Commission % → system auto-calculates Commission
- **Date format:** UK format dd/mm/yyyy throughout
- **Access:** Email/password login only (Google OAuth removed). Two users seeded:
  - `kunalkapadia2212@gmail.com` / `Admin2468!!!`
  - `kunal.dadarwala22@gmail.com` / `Admin2468!!!`
- **Multi-application clients:** One client can have multiple linked mortgage/insurance applications. Client info (address, income, employment) is shared across all their applications — no re-entry needed.

## Architecture
- **Backend:** FastAPI + MongoDB
- **Frontend:** React + Tailwind CSS + shadcn/ui + Recharts
- **Auth:** JWT (email/password only)

## What's Been Implemented
- [x] Full-stack CRM with branded UI (KK Mortgage logo, red/white theme)
- [x] Auth (JWT email/password login), default credentials seeded for Kunal Kapadia
- [x] Google OAuth removed — clean email/password only login
- [x] Dashboard: Expiring Soon, Contact This Month, Recent Clients, Upcoming Tasks, KPIs, Forecasts, Charts
- [x] Client management with row highlighting, enriched columns, LTV auto-calc
- [x] **Client profile as central hub**: Summary banner (total apps, active cases, commission, proc fees, documents)
- [x] **Multi-application support**: "New Application" button pre-fills loan amount from client profile, dialog explains linking
- [x] **Applications tab**: All cases linked to client with status, lender, loan, proc fee, commission, completion date
- [x] Case management with working filters (status, product, commission status, lender)
- [x] Case detail with Proc Fee + Commission % auto-calc
- [x] Pipeline Kanban board
- [x] Commission module: Monthly breakdown, toggle views, stacked charts, detail table
- [x] Task management
- [x] Analytics: 6 tabs (Lead, Mortgage Types, Commission Analytics, Revenue, Pipeline, Retention)
- [x] Custom Business Reports with CSV/Excel export
- [x] UK date format (dd/mm/yyyy) throughout
- [x] Single advisor (Kunal Kapadia) — no multi-advisor dropdowns

## Prioritized Backlog
### P1 — Upcoming
- Document Management: File upload with object storage
- Task Automation: Auto-generate tasks from product expiry dates

### P2 — Future
- Audit Log, Email Automation, Backend refactoring
