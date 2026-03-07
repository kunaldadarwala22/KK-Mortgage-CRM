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

### March 2026 Updates (Session 6)
- [x] Client Fee (£) currency field added to case commission section (CaseDetail edit/display, Cases new form)
- [x] Commission Dashboard: Total Client Fees, Total Commission + Client Fees, Client Fees This Month, Client Fees Last 30 Days cards
- [x] Analytics: Commission Analytics tab includes Total Client Fees in summary stats
- [x] Reports: 4 tabs - Cases Completed, Commission Only, Client Fees Only, Commission + Client Fees Combined
- [x] Excel export includes Client Fee column
- [x] Backend: /api/dashboard/forecast, /api/commission/analytics, /api/commission/monthly all return client_fee data
- [x] Reports: /api/reports/commission-paid accepts report_type param (commission, client_fees, both)
- [x] Export: /api/reports/export supports client_fees and commission_and_fees report types
- [x] Client Fee Status field (Pending/Submitted/Paid/Clawed Back) - mirrors Commission Status
- [x] Client Fee Paid Date field on CaseDetail page
- [x] Commission Dashboard: "Commission Paid This Month", "Commission Paid in Last 30 Days" (filtered by commission_paid_date)
- [x] Commission Dashboard: "Total Client Fees (Paid)", "Client Fee Pending", "Total Commission + Client Fees"
- [x] Commission Dashboard: "Client Fees Paid This Month", "Client Fees Paid Last 30 Days" (filtered by client_fee_paid_date)
- [x] Reports: Commission report filters by commission_paid_date, Client Fees report by client_fee_paid_date, Both report merges both
- [x] Database wiped clean for production use

### March 2026 Updates (Session 7)
- [x] Compliance Checklist tab on CaseDetail page
  - Auto-populates based on case type: Purchase/Remortgage/Remortgage+AB (12 items), Product Transfer (8 items), Life Insurance (8 items), Home/Buildings Insurance (3 items)
  - Individually tickable checkboxes, green tick on completion, progress bar (X/Y completed)
  - Green highlight when 100% complete, persists to database
- [x] Lender Autocomplete across all lender name fields (New Case form + Case Detail edit)
  - 105 UK lenders in predefined list, case-insensitive search, real-time filtering
  - Keyboard navigation support, fallback allows manual entry
- [x] Database wiped clean for production use

### March 2026 Updates (Session 8)
- [x] Lender Usage Analytics tab in Analytics page
  - 4 ranked tables: All Time, Last 12 Months, Buy To Let, Residential
  - Auto-updates with new cases, shows case count per lender
- [x] New Case form changes
  - Added Security Property Address and Security Post Code fields
  - Removed Rate Fixed For (Years) field
- [x] Fact Find Summary tab on CaseDetail page
  - Structured read-only view: Client Details, Employment, Mortgage Details, Security Address
  - Auto-pulls from case + client data for lender conversations
- [x] Client Portfolio tab on ClientDetail page
  - Summary metrics: Total Properties, Total Loan/Value, Average LTV, Residential/BTL count
  - Full mortgage portfolio table with all key fields
  - Expiry warning highlighting for mortgages within 6 months
  - View Case quick action on each row
- [x] Database wiped clean for production use

### March 2026 Updates (Session 9)
- [x] Screenshot Import feature using GPT-4o vision model
  - "Import from Screenshots" button on both New Client and New Case forms
  - Uploads multiple JPG/PNG screenshots, preprocesses images (contrast, noise reduction, resize)
  - All screenshots sent in single GPT-4o request for cost efficiency
  - Returns structured JSON that auto-fills form fields
  - Progress indicator with per-screenshot status
  - Screenshots never stored — deleted immediately after processing
  - Graceful fallback if extraction fails (manual entry still works)
- [x] Database wiped clean for production use

### March 2026 Updates (Session 11)
- [x] "Clear Form" button added to all dialog forms (Add New Client, Create New Case, Add Task)
  - Positioned in top-right of dialog header with RotateCcw icon
  - Resets all form fields to initial empty state
  - data-testid attributes: clear-client-form-btn, clear-case-form-btn, clear-task-form-btn

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
- `/api/dashboard/forecast` (returns commission_this_month + commission_last_30_days + total_client_fees)
- `/api/commission/monthly`, `/api/commission/ytd`
- `/api/analytics/commission`, `/api/analytics/mortgage-types`
- `/api/reports/cases-completed`, `/api/reports/commission-paid?report_type=commission|client_fees|both`
- `/api/export/excel` (single sheet), `/api/export/clients`
- `/api/admin/wipe-data` (DELETE - wipes all clients, cases, tasks)
- `/api/retention-stats`

## DB Collections
- users, clients, cases, tasks, documents, audit_logs, user_sessions
- Client: `additional_applicants: [{full_name, dob, email, phone}]`
- Case: property_value, deposit_source, repayment_type, property_type, case_reference, rate_fixed_for, interest_rate_type, initial_product_term, insurance_cover_type, insurance_reference, monthly_premium, guaranteed_or_reviewable, sum_assured, in_trust, insurance_provider, commission_paid_date, client_fee, client_fee_status, client_fee_paid_date
