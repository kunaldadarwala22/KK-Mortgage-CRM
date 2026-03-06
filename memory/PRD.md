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
- [x] Data Export

### Recent Updates (March 2026)
- [x] **Search bar** — Global search across clients and cases (2+ chars)
- [x] **Notifications bell** — Shows overdue tasks, upcoming tasks, expiring products
- [x] **Delete client** — Removed admin-only permission check
- [x] **Multiple applicants** — Add Additional Applicant button on client profile (joint applications)
- [x] **Simplified Add Client form** — Removed Security Address, Property Price, Loan Amount, Deposit
- [x] **Dynamic New Case form** — Searchable client field, Mortgage/Insurance toggle with separate fields
- [x] **Mortgage fields** — Added Property Value, Deposit Source, Repayment Type, Property Type, Case Reference, Rate Fixed For
- [x] **Insurance fields** — Insurance Type, Term, Provider, Cover Type, Reference, Monthly Premium, Guaranteed/Reviewable, Sum Assured, In Trust
- [x] **Cases dashboard** — Split into Mortgage and Insurance tabs; Property Value column for mortgage
- [x] **Client dashboard** — Removed Loan Amount, Property Price, Case Status, LTV columns
- [x] **Task automation** — Only auto-creates tasks when case status = "Review Due" or "For Review"
- [x] **Export** — Single-sheet format, each case = separate row, client data repeated
- [x] **UK date format** — dd/mm/yyyy across all UI

## Upcoming Tasks (P1)
- Document Management improvements (file upload to cloud storage)
- Backend refactoring (break server.py into modular routes)

## Future Tasks (P2)
- Audit Log system
- Email Automation (templates + daily summary)
- Frontend cleanup (deduplicate formatDate utility)
- Change Password feature

## Key API Endpoints
- `/api/auth/login`, `/api/auth/register`, `/api/auth/me`, `/api/auth/logout`
- `/api/search?q=`, `/api/notifications`
- `/api/clients`, `/api/clients/search?q=`, `/api/clients/{id}`
- `/api/cases`, `/api/cases/{id}`
- `/api/tasks`, `/api/tasks/{id}`
- `/api/commission/monthly`, `/api/commission/ytd`
- `/api/analytics/commission`, `/api/analytics/mortgage-types`
- `/api/reports/cases-completed`, `/api/reports/commission-paid`
- `/api/export/excel`, `/api/export/clients`
- `/api/retention-stats`

## DB Collections
- users, clients, cases, tasks, documents, audit_logs, user_sessions
- Client schema now includes `additional_applicants: [{full_name, dob, email, phone}]`
- Case schema now includes: property_value, deposit_source, repayment_type, property_type, case_reference, rate_fixed_for, insurance_cover_type, insurance_reference, monthly_premium, guaranteed_or_reviewable, sum_assured, in_trust, insurance_provider
