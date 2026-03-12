import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import {
  Download,
  FileSpreadsheet,
  Users,
  Briefcase,
  CheckSquare,
  FileText,
  UserCog,
  Loader2,
  Check,
  Search,
  FileDown,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { clientsAPI, casesAPI, tasksAPI, documentsAPI } from '../lib/api';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// ── PDF generator (pure client-side, no extra deps) ──────────────────────────
const generateClientPDF = (client, cases, tasks, documents, sections) => {
  const formatCurrency = (v) =>
    v ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0 }).format(v) : '-';
  const formatDate = (d) => {
    if (!d) return '-';
    const p = d.split('T')[0].split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d;
  };
  const fmtStatus = (s) => s?.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) || '-';

  const style = `
    body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; margin: 0; padding: 0; }
    .page { padding: 32px 40px; max-width: 900px; margin: 0 auto; }
    .header { border-bottom: 3px solid #dc2626; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
    .header h1 { font-size: 22px; font-weight: 700; margin: 0; color: #0f172a; }
    .header .sub { font-size: 11px; color: #64748b; margin-top: 4px; }
    .header .logo { font-size: 14px; font-weight: 700; color: #dc2626; text-align: right; }
    .section { margin-bottom: 28px; }
    .section-title { font-size: 13px; font-weight: 700; color: #dc2626; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px 16px; }
    .field { margin-bottom: 6px; }
    .field .label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
    .field .value { font-weight: 600; color: #0f172a; margin-top: 1px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 8px; }
    th { background: #f1f5f9; text-align: left; padding: 7px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; border: 1px solid #e2e8f0; }
    td { padding: 7px 10px; border: 1px solid #e2e8f0; color: #1e293b; vertical-align: top; }
    tr:nth-child(even) td { background: #f8fafc; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 600; }
    .badge-green { background: #dcfce7; color: #166534; }
    .badge-blue { background: #dbeafe; color: #1e40af; }
    .badge-yellow { background: #fef9c3; color: #854d0e; }
    .badge-red { background: #fee2e2; color: #991b1b; }
    .badge-slate { background: #f1f5f9; color: #475569; }
    .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; }
    .case-card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px; margin-bottom: 16px; background: #fafafa; }
    .case-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .case-card-title { font-size: 13px; font-weight: 700; color: #0f172a; }
    .highlight-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 10px 14px; margin-top: 10px; }
    .highlight-box .label { font-size: 10px; color: #15803d; }
    .highlight-box .value { font-size: 16px; font-weight: 700; color: #166534; }
  `;

  const statusBadge = (s) => {
    const map = { completed: 'badge-green', new_lead: 'badge-blue', application_submitted: 'badge-yellow', lost_case: 'badge-red' };
    return `<span class="badge ${map[s] || 'badge-slate'}">${fmtStatus(s)}</span>`;
  };

  let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${style}</style></head><body><div class="page">`;

  // Header
  html += `
    <div class="header">
      <div>
        <h1>${client.first_name} ${client.last_name} — Client Report</h1>
        <div class="sub">Generated on ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} &nbsp;·&nbsp; KK Mortgage Solutions CRM</div>
      </div>
      <div class="logo">KK MORTGAGE<br/>SOLUTIONS</div>
    </div>`;

  // Client Details
  if (sections.clientDetails) {
    html += `<div class="section"><div class="section-title">Client Details — Primary Applicant</div><div class="grid-3">
      <div class="field"><div class="label">Full Name</div><div class="value">${client.first_name} ${client.last_name}</div></div>
      <div class="field"><div class="label">Date of Birth</div><div class="value">${formatDate(client.dob)}</div></div>
      <div class="field"><div class="label">Email</div><div class="value">${client.email || '-'}</div></div>
      <div class="field"><div class="label">Phone</div><div class="value">${client.phone || '-'}</div></div>
      <div class="field"><div class="label">Postcode</div><div class="value">${client.postcode || '-'}</div></div>
      <div class="field"><div class="label">Employment</div><div class="value">${fmtStatus(client.employment_type)}</div></div>
      <div class="field"><div class="label">Income</div><div class="value">${formatCurrency(client.income)}</div></div>
    </div>
    ${client.current_address ? `<div class="field" style="margin-top:8px"><div class="label">Current Address</div><div class="value">${client.current_address}</div></div>` : ''}
    </div>`;

    // Additional Applicants
    const additionalApplicants = client.additional_applicants || [];
    if (additionalApplicants.length > 0) {
      additionalApplicants.forEach((app, idx) => {
        html += `<div class="section"><div class="section-title">Additional Applicant ${idx + 1}</div><div class="grid-3">
          <div class="field"><div class="label">Full Name</div><div class="value">${app.first_name || ''} ${app.last_name || ''}</div></div>
          <div class="field"><div class="label">Date of Birth</div><div class="value">${formatDate(app.dob)}</div></div>
          <div class="field"><div class="label">Email</div><div class="value">${app.email || '-'}</div></div>
          <div class="field"><div class="label">Phone</div><div class="value">${app.phone || '-'}</div></div>
          <div class="field"><div class="label">Employment</div><div class="value">${fmtStatus(app.employment_type)}</div></div>
          <div class="field"><div class="label">Income</div><div class="value">${formatCurrency(app.income)}</div></div>
        </div></div>`;
      });
    }
  }

  // Cases
  if (sections.cases && cases.length > 0) {
    html += `<div class="section"><div class="section-title">Cases (${cases.length})</div>`;
    cases.forEach((c, i) => {
      const isInsurance = c.product_type === 'insurance';
      html += `<div class="case-card">
        <div class="case-card-header">
          <div class="case-card-title">${isInsurance ? '🛡️ Insurance' : '🏠 Mortgage'} — ${isInsurance ? (c.insurance_provider || 'No Provider') : (c.lender_name || 'No Lender')}</div>
          ${statusBadge(c.status)}
        </div>
        <div class="grid-3">
          <div class="field"><div class="label">Case ID</div><div class="value">${c.case_id}</div></div>
          <div class="field"><div class="label">Case Reference</div><div class="value">${c.case_reference || '-'}</div></div>
          <div class="field"><div class="label">Type</div><div class="value">${fmtStatus(isInsurance ? c.insurance_type : c.mortgage_type)}</div></div>
          <div class="field"><div class="label">Status</div><div class="value">${fmtStatus(c.status)}</div></div>
          ${!isInsurance ? `
          <div class="field"><div class="label">Loan Amount</div><div class="value">${formatCurrency(c.loan_amount)}</div></div>
          <div class="field"><div class="label">Property Value</div><div class="value">${formatCurrency(c.property_value)}</div></div>
          <div class="field"><div class="label">Deposit</div><div class="value">${formatCurrency(c.deposit)}</div></div>
          <div class="field"><div class="label">LTV</div><div class="value">${c.ltv ? c.ltv + '%' : '-'}</div></div>
          <div class="field"><div class="label">Interest Rate</div><div class="value">${c.interest_rate ? c.interest_rate + '%' : '-'}</div></div>
          <div class="field"><div class="label">Interest Rate Type</div><div class="value">${fmtStatus(c.interest_rate_type)}</div></div>
          <div class="field"><div class="label">Term</div><div class="value">${c.term_years ? c.term_years + ' years' : '-'}</div></div>
          <div class="field"><div class="label">Initial Product Term</div><div class="value">${c.initial_product_term ? c.initial_product_term + ' years' : '-'}</div></div>
          <div class="field"><div class="label">Security Address</div><div class="value">${c.security_address || '-'}</div></div>
          ` : `
          <div class="field"><div class="label">Monthly Premium</div><div class="value">${formatCurrency(c.monthly_premium)}</div></div>
          <div class="field"><div class="label">Sum Assured</div><div class="value">${formatCurrency(c.sum_assured)}</div></div>
          <div class="field"><div class="label">Cover Type</div><div class="value">${fmtStatus(c.insurance_cover_type)}</div></div>
          `}
          <div class="field"><div class="label">Expected Completion</div><div class="value">${formatDate(c.expected_completion_date)}</div></div>
          <div class="field"><div class="label">Product Expiry</div><div class="value">${formatDate(c.product_expiry_date)}</div></div>
          <div class="field"><div class="label">Commission Status</div><div class="value">${fmtStatus(c.commission_status)}</div></div>
        </div>
        ${c.proc_fee_total || c.gross_commission || c.client_fee ? `
        <div class="highlight-box">
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
            <div><div class="label">Proc Fee</div><div class="value" style="font-size:14px">${formatCurrency(c.proc_fee_total)}</div></div>
            <div><div class="label">Your Commission</div><div class="value" style="font-size:14px;color:#166534">${formatCurrency(c.gross_commission)}</div></div>
            <div><div class="label">Client Fee</div><div class="value" style="font-size:14px">${formatCurrency(c.client_fee)}</div></div>
          </div>
        </div>` : ''}
      </div>`;
    });
    html += `</div>`;
  }

  // Tasks
  if (sections.tasks && tasks.length > 0) {
    html += `<div class="section"><div class="section-title">Tasks (${tasks.length})</div>
      <table>
        <thead><tr><th>Title</th><th>Due Date</th><th>Priority</th><th>Status</th></tr></thead>
        <tbody>
          ${tasks.map(t => `<tr>
            <td>${t.title}</td>
            <td>${formatDate(t.due_date)}</td>
            <td><span class="badge ${t.priority === 'high' ? 'badge-red' : t.priority === 'medium' ? 'badge-yellow' : 'badge-green'}">${t.priority}</span></td>
            <td><span class="badge ${t.completed ? 'badge-green' : 'badge-slate'}">${t.completed ? 'Completed' : 'Pending'}</span></td>
          </tr>`).join('')}
        </tbody>
      </table></div>`;
  }

  // Documents
  if (sections.documents && documents.length > 0) {
    html += `<div class="section"><div class="section-title">Documents (${documents.length})</div>
      <table>
        <thead><tr><th>File Name</th><th>Document Type</th><th>Uploaded</th></tr></thead>
        <tbody>
          ${documents.map(d => `<tr>
            <td>${d.file_name}</td>
            <td>${fmtStatus(d.document_type)}</td>
            <td>${formatDate(d.uploaded_at)}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>`;
  }

  // Footer
  html += `
    <div class="footer">
      <span>KK Mortgage Solutions CRM &nbsp;·&nbsp; Confidential</span>
      <span>Generated ${new Date().toLocaleString('en-GB')}</span>
    </div>
  </div></body></html>`;

  return html;
};

// ── Main Component ────────────────────────────────────────────────────────────
const Export = () => {
  const [exporting, setExporting] = useState(false);

  // Client report state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [searching, setSearching] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [sections, setSections] = useState({
    clientDetails: true,
    cases: true,
    tasks: true,
    documents: true,
  });

  // Search clients
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await clientsAPI.getAll({ search: searchQuery, limit: 8 });
        setSearchResults(data.clients || []);
      } catch (e) {
        console.error(e);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Bulk Excel export (existing) ──────────────────────────────────────────
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/export/excel`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'KK_Mortgage_CRM_Export.xlsx';
      if (contentDisposition) {
        const m = contentDisposition.match(/filename=(.+)/);
        if (m) filename = m[1];
      }
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Export completed successfully!');
    } catch (error) {
      toast.error('Failed to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // ── Client report — Excel ─────────────────────────────────────────────────
  const handleClientExportExcel = async () => {
    if (!selectedClient) return;
    setGeneratingReport(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_URL}/api/export/client/${selectedClient.client_id}/excel`,
        { method: 'GET', credentials: 'include', headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${selectedClient.first_name}_${selectedClient.last_name}_Report.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Client Excel report downloaded!');
    } catch (error) {
      toast.error('Failed to generate Excel report.');
    } finally {
      setGeneratingReport(false);
    }
  };

  // ── Client report — PDF ───────────────────────────────────────────────────
  const handleClientExportPDF = async () => {
    if (!selectedClient) return;
    setGeneratingReport(true);
    try {
      const [casesData, tasksData, docsData] = await Promise.all([
        sections.cases ? casesAPI.getAll({ client_id: selectedClient.client_id }) : Promise.resolve({ cases: [] }),
        sections.tasks ? tasksAPI.getAll({ client_id: selectedClient.client_id }) : Promise.resolve({ tasks: [] }),
        sections.documents ? documentsAPI.getAll({ client_id: selectedClient.client_id }) : Promise.resolve([]),
      ]);

      const html = generateClientPDF(
        selectedClient,
        casesData.cases || [],
        tasksData.tasks || [],
        Array.isArray(docsData) ? docsData : [],
        sections
      );

      // Open in new window and print to PDF
      const win = window.open('', '_blank');
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
      }, 500);

      toast.success('PDF report opened — use "Save as PDF" in the print dialog!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate PDF report.');
    } finally {
      setGeneratingReport(false);
    }
  };

  const exportItems = [
    { icon: Users, label: 'Clients', description: 'All client records with personal and financial details' },
    { icon: Briefcase, label: 'Cases', description: 'All mortgage and insurance cases with status and commission' },
    { icon: CheckSquare, label: 'Tasks', description: 'All tasks with due dates and completion status' },
    { icon: FileText, label: 'Documents', description: 'Document metadata (file references, not actual files)' },
    { icon: UserCog, label: 'Users', description: 'All system users and their roles' },
  ];

  const sectionOptions = [
    { key: 'clientDetails', label: 'Client Details', description: 'Personal, financial & compliance info' },
    { key: 'cases', label: 'Cases', description: 'All mortgage & insurance cases' },
    { key: 'tasks', label: 'Tasks', description: 'All tasks linked to this client' },
    { key: 'documents', label: 'Documents', description: 'Document list (not actual files)' },
  ];

  return (
    <div className="p-6 space-y-6 animate-fadeIn" data-testid="export-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
          Export Data
        </h1>
        <p className="text-slate-500 mt-1">Download your CRM data in Excel or PDF format</p>
      </div>

      {/* ── CLIENT REPORT ─────────────────────────────────────────────────── */}
      <Card className="border-slate-200 max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
              <User className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <CardTitle>Client Report</CardTitle>
              <CardDescription>Generate a complete report for a specific client</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* Client search */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">Search Client</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Type client name..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSelectedClient(null); }}
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />
              )}
            </div>

            {/* Search results dropdown */}
            {searchResults.length > 0 && !selectedClient && (
              <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                {searchResults.map((c) => (
                  <div
                    key={c.client_id}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 border-b last:border-0 border-slate-100"
                    onClick={() => { setSelectedClient(c); setSearchQuery(`${c.first_name} ${c.last_name}`); setSearchResults([]); }}
                  >
                    <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-semibold text-sm flex-shrink-0">
                      {c.first_name?.[0]}{c.last_name?.[0]}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{c.first_name} {c.last_name}</p>
                      <p className="text-xs text-slate-500">{c.email || '-'} · {c.phone || '-'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Selected client pill */}
            {selectedClient && (
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="h-8 w-8 rounded-full bg-red-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                  {selectedClient.first_name?.[0]}{selectedClient.last_name?.[0]}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900 text-sm">{selectedClient.first_name} {selectedClient.last_name}</p>
                  <p className="text-xs text-slate-500">{selectedClient.email}</p>
                </div>
                <Check className="h-5 w-5 text-green-600" />
              </div>
            )}
          </div>

          {/* Sections to include */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">What to include</Label>
            <div className="space-y-2">
              {sectionOptions.map((opt) => (
                <div key={opt.key} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <Checkbox
                    id={opt.key}
                    checked={sections[opt.key]}
                    onCheckedChange={(v) => setSections({ ...sections, [opt.key]: v })}
                  />
                  <div>
                    <label htmlFor={opt.key} className="font-medium text-slate-900 text-sm cursor-pointer">{opt.label}</label>
                    <p className="text-xs text-slate-500">{opt.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Export buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              className="bg-green-600 hover:bg-green-700 h-11"
              onClick={handleClientExportExcel}
              disabled={!selectedClient || generatingReport}
              data-testid="client-export-excel-btn"
            >
              {generatingReport ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 mr-2" />
              )}
              Download Excel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 h-11"
              onClick={handleClientExportPDF}
              disabled={!selectedClient || generatingReport}
              data-testid="client-export-pdf-btn"
            >
              {generatingReport ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4 mr-2" />
              )}
              Download PDF
            </Button>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-800">
              <strong>PDF:</strong> Opens a print-ready page — select <strong>"Save as PDF"</strong> in the print dialog to save it.
              &nbsp;·&nbsp; <strong>Excel:</strong> Requires the backend <code>/api/export/client/[id]/excel</code> endpoint.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── BULK EXCEL EXPORT (existing) ──────────────────────────────────── */}
      <Card className="border-slate-200 max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
              <FileSpreadsheet className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <CardTitle>Export All Data to Excel</CardTitle>
              <CardDescription>Download a complete backup of all your data</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-3">What's included:</h3>
            <div className="space-y-3">
              {exportItems.map((item) => (
                <div key={item.label} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="h-8 w-8 rounded bg-white flex items-center justify-center border border-slate-200">
                    <item.icon className="h-4 w-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{item.label}</p>
                    <p className="text-sm text-slate-500">{item.description}</p>
                  </div>
                  <Check className="h-5 w-5 text-green-500 ml-auto flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>

          <Button
            className="w-full bg-red-600 hover:bg-red-700 h-12 text-base"
            onClick={handleExportExcel}
            disabled={exporting}
            data-testid="export-excel-btn"
          >
            {exporting ? (
              <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Generating Export...</>
            ) : (
              <><Download className="h-5 w-5 mr-2" />Download Excel File</>
            )}
          </Button>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> The exported file will contain multiple sheets (Clients, Cases, Tasks, Documents, Users)
              with all data formatted for easy viewing in Excel or Google Sheets.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Format Info */}
      <Card className="border-slate-200 max-w-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Export Format Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-sm text-slate-500">File Format</p><p className="font-medium">.xlsx / .pdf</p></div>
            <div><p className="text-sm text-slate-500">Compatible With</p><p className="font-medium">Excel, Google Sheets, Numbers, Adobe</p></div>
            <div><p className="text-sm text-slate-500">Data Included</p><p className="font-medium">All records from database</p></div>
            <div><p className="text-sm text-slate-500">Sensitive Data</p><p className="font-medium">Passwords excluded</p></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Export;
