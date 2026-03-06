import React, { useState } from 'react';
import { reportsAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import {
  FileText, Download, Search, Loader2, Calendar, PoundSterling,
} from 'lucide-react';
import { toast } from 'sonner';

const Reports = () => {
  const [activeTab, setActiveTab] = useState('cases');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [casesReport, setCasesReport] = useState(null);
  const [commReport, setCommReport] = useState(null);
  const [feeReport, setFeeReport] = useState(null);
  const [bothReport, setBothReport] = useState(null);

  const fmt = (v) => {
    if (!v && v !== 0) return '£0';
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0 }).format(v);
  };
  const fmtDate = (d) => {
    if (!d) return '-';
    const parts = d.split('T')[0].split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return d;
  };
  const fmtStatus = (s) => s?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || '-';

  const handleGenerate = async () => {
    if (!dateRange.start || !dateRange.end) {
      toast.error('Please select both start and end dates');
      return;
    }
    if (dateRange.start > dateRange.end) {
      toast.error('Start date must be before end date');
      return;
    }
    setLoading(true);
    try {
      if (activeTab === 'cases') {
        const data = await reportsAPI.getCasesCompleted(dateRange.start, dateRange.end);
        setCasesReport(data);
      } else if (activeTab === 'commission') {
        const data = await reportsAPI.getCommissionPaid(dateRange.start, dateRange.end, 'commission');
        setCommReport(data);
      } else if (activeTab === 'client_fees') {
        const data = await reportsAPI.getCommissionPaid(dateRange.start, dateRange.end, 'client_fees');
        setFeeReport(data);
      } else {
        const data = await reportsAPI.getCommissionPaid(dateRange.start, dateRange.end, 'both');
        setBothReport(data);
      }
    } catch (err) {
      console.error('Report error:', err);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    if (!dateRange.start || !dateRange.end) return;
    setExporting(true);
    try {
      const reportTypeMap = { cases: 'cases_completed', commission: 'commission_paid', client_fees: 'client_fees', both: 'commission_and_fees' };
      const reportType = reportTypeMap[activeTab] || 'cases_completed';
      const response = await reportsAPI.exportReport(reportType, dateRange.start, dateRange.end, format);
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const ext = format === 'csv' ? 'csv' : 'xlsx';
      link.href = url;
      link.setAttribute('download', `${reportType}_${dateRange.start}_to_${dateRange.end}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fadeIn" data-testid="reports-page">
      <div>
        <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>Custom Business Reports</h1>
        <p className="text-slate-500 mt-1">Generate detailed reports for any date range</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setCasesReport(null); setCommReport(null); setFeeReport(null); setBothReport(null); }}>
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="cases" data-testid="report-cases-tab">Cases Completed</TabsTrigger>
          <TabsTrigger value="commission" data-testid="report-commission-tab">Commission</TabsTrigger>
          <TabsTrigger value="client_fees" data-testid="report-client-fees-tab">Client Fees</TabsTrigger>
          <TabsTrigger value="both" data-testid="report-both-tab">Commission + Fees</TabsTrigger>
        </TabsList>

        {/* Date Range Selector */}
        <Card className="border-slate-200 mt-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1">
                <Label className="text-xs">Start Date</Label>
                <Input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} className="w-44" data-testid="report-start-date" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">End Date</Label>
                <Input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} className="w-44" data-testid="report-end-date" />
              </div>
              <Button onClick={handleGenerate} disabled={loading} className="bg-red-600 hover:bg-red-700" data-testid="generate-report-btn">
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</> : <><Search className="h-4 w-4 mr-2" />Generate Report</>}
              </Button>
              {((activeTab === 'cases' && casesReport) || (activeTab === 'commission' && commReport) || (activeTab === 'client_fees' && feeReport) || (activeTab === 'both' && bothReport)) && (
                <div className="flex gap-2 ml-auto">
                  <Button variant="outline" onClick={() => handleExport('csv')} disabled={exporting} data-testid="export-csv-btn">
                    <Download className="h-4 w-4 mr-2" />CSV
                  </Button>
                  <Button variant="outline" onClick={() => handleExport('xlsx')} disabled={exporting} data-testid="export-xlsx-btn">
                    <Download className="h-4 w-4 mr-2" />Excel
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cases Completed Report */}
        <TabsContent value="cases" className="mt-0">
          {casesReport && (
            <div className="space-y-4 mt-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-slate-200 bg-gradient-to-br from-blue-50 to-white">
                  <CardContent className="p-5">
                    <p className="text-sm text-slate-500">Total Cases</p>
                    <p className="text-3xl font-bold text-slate-900" data-testid="report-total-cases">{casesReport.summary.total_cases}</p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 bg-gradient-to-br from-green-50 to-white">
                  <CardContent className="p-5">
                    <p className="text-sm text-slate-500">Total Loan Value</p>
                    <p className="text-3xl font-bold text-slate-900">{fmt(casesReport.summary.total_loan_value)}</p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 bg-gradient-to-br from-red-50 to-white">
                  <CardContent className="p-5">
                    <p className="text-sm text-slate-500">Total Commission</p>
                    <p className="text-3xl font-bold text-slate-900">{fmt(casesReport.summary.total_commission)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Table */}
              <Card className="border-slate-200">
                <CardContent className="p-0">
                  {casesReport.cases.length === 0 ? (
                    <div className="text-center py-12" data-testid="no-report-results">
                      <FileText className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                      <h3 className="text-lg font-medium text-slate-700">No Results Found</h3>
                      <p className="text-slate-500">No completed cases found in the selected date range.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Client Name</TableHead>
                            <TableHead>Loan Amount</TableHead>
                            <TableHead>Property Value</TableHead>
                            <TableHead>LTV</TableHead>
                            <TableHead>Lender</TableHead>
                            <TableHead>Product Type</TableHead>
                            <TableHead>Completion Date</TableHead>
                            <TableHead>Commission</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {casesReport.cases.map((c) => (
                            <TableRow key={c.case_id}>
                              <TableCell className="font-medium">{c.client_name}</TableCell>
                              <TableCell>{fmt(c.loan_amount)}</TableCell>
                              <TableCell>{fmt(c.property_value)}</TableCell>
                              <TableCell>{c.ltv ? <Badge className={c.ltv > 90 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>{c.ltv}%</Badge> : '-'}</TableCell>
                              <TableCell>{c.lender_name || '-'}</TableCell>
                              <TableCell>{fmtStatus(c.product_type)}</TableCell>
                              <TableCell>{fmtDate(c.expected_completion_date)}</TableCell>
                              <TableCell className="font-medium text-green-700">{fmt(c.gross_commission)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {!casesReport && !loading && (
            <div className="text-center py-16 mt-6">
              <Calendar className="h-16 w-16 mx-auto text-slate-200 mb-4" />
              <h3 className="text-lg font-medium text-slate-700">Select a Date Range</h3>
              <p className="text-slate-500 mt-1">Choose start and end dates to generate a report of completed cases.</p>
            </div>
          )}
        </TabsContent>

        {/* Commission Paid Report */}
        <TabsContent value="commission" className="mt-0">
          {commReport && (
            <div className="space-y-4 mt-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-slate-200 bg-gradient-to-br from-blue-50 to-white">
                  <CardContent className="p-5">
                    <p className="text-sm text-slate-500">Total Cases</p>
                    <p className="text-3xl font-bold text-slate-900">{commReport.summary.total_cases}</p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 bg-gradient-to-br from-green-50 to-white">
                  <CardContent className="p-5">
                    <p className="text-sm text-slate-500">Commission Paid</p>
                    <p className="text-3xl font-bold text-slate-900" data-testid="report-commission-paid">{fmt(commReport.summary.total_commission_paid)}</p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 bg-gradient-to-br from-purple-50 to-white">
                  <CardContent className="p-5">
                    <p className="text-sm text-slate-500">Proc Fees</p>
                    <p className="text-3xl font-bold text-slate-900">{fmt(commReport.summary.total_proc_fees)}</p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 bg-gradient-to-br from-red-50 to-white">
                  <CardContent className="p-5">
                    <p className="text-sm text-slate-500">Combined Revenue</p>
                    <p className="text-3xl font-bold text-slate-900">{fmt(commReport.summary.total_combined_revenue)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Table */}
              <Card className="border-slate-200">
                <CardContent className="p-0">
                  {commReport.cases.length === 0 ? (
                    <div className="text-center py-12" data-testid="no-report-results">
                      <PoundSterling className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                      <h3 className="text-lg font-medium text-slate-700">No Results Found</h3>
                      <p className="text-slate-500">No paid commissions found in the selected date range.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Client Name</TableHead>
                            <TableHead>Loan Amount</TableHead>
                            <TableHead>Lender</TableHead>
                            <TableHead>Product Type</TableHead>
                            <TableHead>Commission</TableHead>
                            <TableHead>Proc Fee</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {commReport.cases.map((c) => (
                            <TableRow key={c.case_id}>
                              <TableCell className="font-medium">{c.client_name}</TableCell>
                              <TableCell>{fmt(c.loan_amount)}</TableCell>
                              <TableCell>{c.lender_name || '-'}</TableCell>
                              <TableCell>{fmtStatus(c.product_type)}</TableCell>
                              <TableCell className="font-medium text-green-700">{fmt(c.gross_commission)}</TableCell>
                              <TableCell>{fmt(c.proc_fee_total)}</TableCell>
                              <TableCell>{fmtDate(c.expected_completion_date)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {!commReport && !loading && (
            <div className="text-center py-16 mt-6">
              <PoundSterling className="h-16 w-16 mx-auto text-slate-200 mb-4" />
              <h3 className="text-lg font-medium text-slate-700">Select a Date Range</h3>
              <p className="text-slate-500 mt-1">Choose start and end dates to generate a commission report.</p>
            </div>
          )}
        </TabsContent>

        {/* Client Fees Report */}
        <TabsContent value="client_fees" className="mt-0">
          {feeReport && (
            <div className="space-y-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-slate-200 bg-gradient-to-br from-blue-50 to-white">
                  <CardContent className="p-5">
                    <p className="text-sm text-slate-500">Total Cases</p>
                    <p className="text-3xl font-bold text-slate-900" data-testid="report-fee-total-cases">{feeReport.summary.total_cases}</p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 bg-gradient-to-br from-purple-50 to-white">
                  <CardContent className="p-5">
                    <p className="text-sm text-slate-500">Total Client Fees</p>
                    <p className="text-3xl font-bold text-purple-700" data-testid="report-total-client-fees">{fmt(feeReport.summary.total_client_fees)}</p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 bg-gradient-to-br from-green-50 to-white">
                  <CardContent className="p-5">
                    <p className="text-sm text-slate-500">Avg Fee per Case</p>
                    <p className="text-3xl font-bold text-slate-900">{fmt(feeReport.summary.total_cases > 0 ? feeReport.summary.total_client_fees / feeReport.summary.total_cases : 0)}</p>
                  </CardContent>
                </Card>
              </div>
              <Card className="border-slate-200">
                <CardContent className="p-0">
                  {feeReport.cases.length === 0 ? (
                    <div className="text-center py-12"><PoundSterling className="h-12 w-12 mx-auto text-slate-300 mb-4" /><h3 className="text-lg font-medium text-slate-700">No Results Found</h3><p className="text-slate-500">No client fees found in the selected date range.</p></div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader><TableRow><TableHead>Client Name</TableHead><TableHead>Loan Amount</TableHead><TableHead>Lender</TableHead><TableHead>Product Type</TableHead><TableHead>Client Fee</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {feeReport.cases.map((c) => (
                            <TableRow key={c.case_id}><TableCell className="font-medium">{c.client_name}</TableCell><TableCell>{fmt(c.loan_amount)}</TableCell><TableCell>{c.lender_name || '-'}</TableCell><TableCell>{fmtStatus(c.product_type)}</TableCell><TableCell className="font-medium text-purple-700">{fmt(c.client_fee)}</TableCell><TableCell>{fmtDate(c.expected_completion_date)}</TableCell></TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          {!feeReport && !loading && (
            <div className="text-center py-16 mt-6"><PoundSterling className="h-16 w-16 mx-auto text-slate-200 mb-4" /><h3 className="text-lg font-medium text-slate-700">Select a Date Range</h3><p className="text-slate-500 mt-1">Choose start and end dates to generate a client fees report.</p></div>
          )}
        </TabsContent>

        {/* Commission + Client Fees Combined Report */}
        <TabsContent value="both" className="mt-0">
          {bothReport && (
            <div className="space-y-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-slate-200 bg-gradient-to-br from-blue-50 to-white">
                  <CardContent className="p-5">
                    <p className="text-sm text-slate-500">Total Cases</p>
                    <p className="text-3xl font-bold text-slate-900" data-testid="report-both-total-cases">{bothReport.summary.total_cases}</p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 bg-gradient-to-br from-green-50 to-white">
                  <CardContent className="p-5">
                    <p className="text-sm text-slate-500">Commission</p>
                    <p className="text-3xl font-bold text-green-700">{fmt(bothReport.summary.total_commission_paid)}</p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 bg-gradient-to-br from-purple-50 to-white">
                  <CardContent className="p-5">
                    <p className="text-sm text-slate-500">Client Fees</p>
                    <p className="text-3xl font-bold text-purple-700">{fmt(bothReport.summary.total_client_fees)}</p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 bg-gradient-to-br from-slate-100 to-white">
                  <CardContent className="p-5">
                    <p className="text-sm text-slate-500">Combined Total</p>
                    <p className="text-3xl font-bold text-slate-900" data-testid="report-combined-total">{fmt(bothReport.summary.total_combined_revenue)}</p>
                  </CardContent>
                </Card>
              </div>
              <Card className="border-slate-200">
                <CardContent className="p-0">
                  {bothReport.cases.length === 0 ? (
                    <div className="text-center py-12"><PoundSterling className="h-12 w-12 mx-auto text-slate-300 mb-4" /><h3 className="text-lg font-medium text-slate-700">No Results Found</h3><p className="text-slate-500">No data found in the selected date range.</p></div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader><TableRow><TableHead>Client Name</TableHead><TableHead>Loan Amount</TableHead><TableHead>Lender</TableHead><TableHead>Product Type</TableHead><TableHead>Commission</TableHead><TableHead>Client Fee</TableHead><TableHead>Combined</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {bothReport.cases.map((c) => (
                            <TableRow key={c.case_id}><TableCell className="font-medium">{c.client_name}</TableCell><TableCell>{fmt(c.loan_amount)}</TableCell><TableCell>{c.lender_name || '-'}</TableCell><TableCell>{fmtStatus(c.product_type)}</TableCell><TableCell className="font-medium text-green-700">{fmt(c.gross_commission)}</TableCell><TableCell className="font-medium text-purple-700">{fmt(c.client_fee)}</TableCell><TableCell className="font-bold">{fmt((c.gross_commission || 0) + (c.client_fee || 0))}</TableCell><TableCell>{fmtDate(c.expected_completion_date)}</TableCell></TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          {!bothReport && !loading && (
            <div className="text-center py-16 mt-6"><PoundSterling className="h-16 w-16 mx-auto text-slate-200 mb-4" /><h3 className="text-lg font-medium text-slate-700">Select a Date Range</h3><p className="text-slate-500 mt-1">Choose start and end dates to generate a combined commission & client fees report.</p></div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
