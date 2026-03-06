# KK Mortgage Solutions CRM - Product Requirements Document

## Overview
Comprehensive web-based CRM system for a UK Mortgage & Insurance Broker business named "KK Mortgage Solutions". Single-advisor model for Kunal Kapadia.

## Tech Stack
- **Backend:** FastAPI, MongoDB (via pymongo), Pandas, openpyxl
- **Frontend:** React, Tailwind CSS, Recharts, shadcn/ui
- **Auth:** JWT (email/password only)

## Access
- `kunalkapadia2212@gmail.com` / `Admin2468!!!`
- `kunal.dadarwala22@gmail.com` / `Admin2468!!!`
- Google OAuth: REMOVED
- Role system: REMOVED (all users have full access)

## Implemented Features

### Core
- [x] JWT email/password authentication (2 seeded users)
- [x] Dashboard with Expiring Soon, Contact This Month, Recent Clients, KPI cards
- [x] Client Management with search, filters, conditional row highlighting
- [x] Case Management (Mortgage + Insurance) with Kanban pipeline
- [x] Commission Engine (auto-calculated from Proc Fee * Commission %)
- [x] Task Management
- [x] Analytics (Mortgage Types, Commission)
- [x] Custom Business Reports (date range)
- [x] Document Management (upload/view)
- [x] Data Export (single-sheet, case-per-row)

### March 2026 Updates (Session 1)
- [x] Global search bar (clients + cases, 2+ chars)
- [x] Notifications bell (overdue tasks, upcoming, expiring products)
- [x] Delete client without permission error
- [x] Multiple applicants per client (Add Additional Applicant)
- [x] Simplified Add Client form (removed Security Address, Property Price, Loan Amount, Deposit)
- [x] Dynamic New Case form (searchable client + Mortgage/Insurance toggle)
- [x] Mortgage new fields: Property Value, Deposit Source, Repayment Type, Property Type, Case Reference, Rate Fixed For
- [x] Insurance fields: Insurance Type, Term, Provider, Cover Type, Reference, Monthly Premium, Guaranteed/Reviewable, Sum Assured, In Trust
- [x] Cases dashboard split Mortgage/Insurance tabs
- [x] Client dashboard: removed case-metric columns
- [x] Task automation only on Review Due / For Review status
- [x] UK date format dd/mm/yyyy

### March 2026 Updates (Session 2)
- [x] Currency formatting (£X,XXX GBP with thousand separators) across all pages
- [x] Field naming: "Application Number/Reference" → "Case Reference Number" everywhere
- [x] Case creation bug fix (empty strings → null for Pydantic int/float/bool)
- [x] Commission Paid Date field (on case detail, in reports/exports)
- [x] Commission structure: Proc Fee = lender payment, Commission = % of proc fee
- [x] Commission dashboard: replaced 30/60/90 forecasts with "This Month" + "Last 30 Days"
- [x] Case deletion from Cases dashboard (trash icon + confirmation)
- [x] Multiple applicants fix: primary applicant section + numbered "Applicant N" cards

### March 2026 Updates (Session 3)
- [x] Commission Paid Date bug fix — saves on blur, not on each keystroke
- [x] Add Additional Applicant during client creation (unlimited applicants with name/DOB/email/phone)
- [x] Currency display: raw number when typing, £X,XXX format on blur (CurrencyInput component)
- [x] Expiring Soon dashboard filtered to 6 months (was 90 days)

### March 2026 Updates (Session 4)
- [x] Commission Paid Date: restricted to 4-digit year (max=9999-12-31) on all date inputs
- [x] Additional Applicant: replaced Full Name with First Name + Surname, added Income + Employment Type
- [x] Expiring Soon: fixed backend to strictly filter to 6 months (expiring_by_month + retention_value queries capped)

### March 2026 Updates (Session 5)
- [x] Interest Rate Type dropdown on mortgage case form (Fixed, Variable, Discounted, Tracker, Capped)
- [x] Initial Product Term (Years) field on mortgage case form
- [x] Both fields visible on CaseDetail page (view + edit modes)
- [x] Both fields included in Excel export
- [x] Admin wipe-data endpoint (DELETE /api/admin/wipe-data)
- [x] Database wiped clean for production use

## Upcoming Tasks (P1)
- Backend refactoring (break server.py into modular routes)
- Document Management improvements (cloud storage)

## Future Tasks (P2)
- Audit Log system
- Email Automation (templates + daily summary)
- Frontend cleanup (deduplicate formatDate utility)
- Change Password feature

## Key API Endpoints
- `/api/auth/login`, `/api/auth/register`, `/api/auth/me`, `/api/auth/logout`
- `/api/search?q=`, `/api/notifications`
- `/api/clients`, `/api/clients/search?q=`, `/api/clients/{id}`
- `/api/cases`, `/api/cases/{id}` (GET/POST/PUT/DELETE)
- `/api/tasks`, `/api/tasks/{id}`
- `/api/dashboard/forecast` (returns commission_this_month + commission_last_30_days)
- `/api/commission/monthly`, `/api/commission/ytd`
- `/api/analytics/commission`, `/api/analytics/mortgage-types`
- `/api/reports/cases-completed`, `/api/reports/commission-paid`
- `/api/export/excel` (single sheet), `/api/export/clients`
- `/api/admin/wipe-data` (DELETE - wipes all clients, cases, tasks)
- `/api/retention-stats`

## DB Collections
- users, clients, cases, tasks, documents, audit_logs, user_sessions
- Client: `additional_applicants: [{full_name, dob, email, phone}]`
- Case: property_value, deposit_source, repayment_type, property_type, case_reference, rate_fixed_for, interest_rate_type, initial_product_term, insurance_cover_type, insurance_reference, monthly_premium, guaranteed_or_reviewable, sum_assured, in_trust, insurance_provider, commission_paid_date
