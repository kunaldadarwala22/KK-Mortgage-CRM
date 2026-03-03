import React, { useState, useEffect } from 'react';
import { dashboardAPI, casesAPI, commissionAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import {
  PoundSterling, TrendingUp, Calendar, CheckCircle, AlertTriangle, ArrowDownCircle,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { toast } from 'sonner';

const COMMISSION_STATUSES = [
  { key: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { key: 'submitted_to_lender', label: 'Submitted', color: 'bg-blue-100 text-blue-800' },
  { key: 'paid', label: 'Paid', color: 'bg-green-100 text-green-800' },
  { key: 'clawed_back', label: 'Clawed Back', color: 'bg-red-100 text-red-800' },
];

const Commission = () => {
  const [stats, setStats] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('monthly');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, forecastData, monthlyData, casesData] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getForecast(),
        commissionAPI.getMonthly({}),
        casesAPI.getAll({}),
      ]);
      setStats(statsData);
      setForecast(forecastData);
      setMonthly(monthlyData);
      setCases(casesData.cases || []);
    } catch (err) {
      console.error('Failed to load:', err);
      toast.error('Failed to load commission data');
    } finally {
      setLoading(false);
    }
  };

  const loadMonthly = async (params = {}) => {
    try {
      const data = await commissionAPI.getMonthly(params);
      setMonthly(data);
    } catch (err) {
      toast.error('Failed to load monthly data');
    }
  };

  const handleViewChange = (mode) => {
    setViewMode(mode);
    if (mode === 'monthly') loadMonthly({});
    else if (mode === 'ytd') loadMonthly({ year: new Date().getFullYear() });
  };

  const handleCustomRange = () => {
    if (customRange.start && customRange.end) {
      loadMonthly({ start_date: customRange.start, end_date: customRange.end });
    }
  };

  const handleUpdateCommissionStatus = async (caseId, newStatus) => {
    try {
      await casesAPI.update(caseId, { commission_status: newStatus });
      toast.success('Commission status updated');
      loadData();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const formatDate = (d) => {
    if (!d) return '';
    const parts = d.split('T')[0].split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return d;
  };

  const formatCurrency = (v) => {
    if (!v && v !== 0) return '£0';
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0 }).format(v);
  };

  const getFilteredCases = () => {
    if (statusFilter === 'all') return cases.filter(c => c.gross_commission > 0);
    return cases.filter(c => c.commission_status === statusFilter && c.gross_commission > 0);
  };

  const getStatusBadge = (status) => {
    const found = COMMISSION_STATUSES.find(s => s.key === status);
    return found ? found.color : 'bg-slate-100 text-slate-800';
  };

  const monthlyChartData = monthly?.monthly?.map(m => ({
    month: m.month,
    Pending: m.pending,
    Submitted: m.submitted,
    Paid: m.paid,
    'Clawed Back': m.clawed_back,
  })) || [];

  const monthlyBreakdownData = monthly?.monthly?.map(m => ({
    month: m.month,
    Mortgage: m.mortgage_commission,
    Insurance: m.insurance_commission,
    'Proc Fees': m.proc_fees,
    Total: m.total_commission,
  })) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin h-8 w-8 border-4 border-red-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fadeIn" data-testid="commission-page">
      <div>
        <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>Commission & Revenue</h1>
        <p className="text-slate-500 mt-1">Track your earnings and forecast future revenue</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 stat-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Paid Commission</p>
                <p className="text-3xl font-bold text-slate-900 mt-1" data-testid="total-paid-commission">{formatCurrency(stats?.total_commission)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center"><PoundSterling className="h-6 w-6 text-green-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 stat-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Pending Commission</p>
                <p className="text-3xl font-bold text-slate-900 mt-1" data-testid="pending-commission">{formatCurrency(monthly?.totals?.total_pending)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center"><AlertTriangle className="h-6 w-6 text-yellow-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 stat-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Proc Fees</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{formatCurrency(monthly?.totals?.total_proc_fees || stats?.total_proc_fees)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center"><TrendingUp className="h-6 w-6 text-blue-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 stat-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Clawed Back</p>
                <p className="text-3xl font-bold text-red-600 mt-1" data-testid="clawed-back">{formatCurrency(monthly?.totals?.total_clawed_back)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center"><ArrowDownCircle className="h-6 w-6 text-red-600" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mortgage vs Insurance Split */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <p className="text-sm text-slate-500">Mortgage Commission</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(monthly?.totals?.total_mortgage || stats?.mortgage_commission)}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <p className="text-sm text-slate-500">Insurance Commission</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(monthly?.totals?.total_insurance || stats?.insurance_commission)}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <p className="text-sm text-slate-500">Grand Total (All)</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(monthly?.totals?.grand_total)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Forecast Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[{ key: 'next_30_days', label: 'Next 30 Days', color: 'green' }, { key: 'next_60_days', label: 'Next 60 Days', color: 'blue' }, { key: 'next_90_days', label: 'Next 90 Days', color: 'purple' }].map(({ key, label, color }) => (
          <Card key={key} className={`border-slate-200 bg-gradient-to-br from-${color}-50 to-white`}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className={`h-5 w-5 text-${color}-600`} />
                <p className={`text-sm font-medium text-${color}-700`}>Forecast: {label}</p>
              </div>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(forecast?.[key]?.amount)}</p>
              <p className="text-sm text-slate-500">{forecast?.[key]?.cases || 0} cases expected</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly Revenue View */}
      <Card className="border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Monthly Commission Breakdown</CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex border rounded-lg overflow-hidden">
              {['monthly', 'ytd', 'custom'].map((mode) => (
                <button key={mode} onClick={() => handleViewChange(mode)} className={`px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === mode ? 'bg-red-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`} data-testid={`view-${mode}-btn`}>
                  {mode === 'monthly' ? 'Monthly' : mode === 'ytd' ? 'Year to Date' : 'Custom Range'}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'custom' && (
            <div className="flex gap-3 mb-4 items-end">
              <div className="space-y-1"><Label className="text-xs">Start Date</Label><Input type="date" value={customRange.start} onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })} className="w-40" /></div>
              <div className="space-y-1"><Label className="text-xs">End Date</Label><Input type="date" value={customRange.end} onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })} className="w-40" /></div>
              <Button onClick={handleCustomRange} size="sm" className="bg-red-600 hover:bg-red-700">Apply</Button>
            </div>
          )}
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `£${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                <Legend />
                <Bar dataKey="Pending" stackId="a" fill="#EAB308" />
                <Bar dataKey="Submitted" stackId="a" fill="#3B82F6" />
                <Bar dataKey="Paid" stackId="a" fill="#22C55E" />
                <Bar dataKey="Clawed Back" stackId="a" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Revenue by Type Chart */}
      <Card className="border-slate-200">
        <CardHeader><CardTitle>Monthly Revenue: Mortgage vs Insurance vs Proc Fees</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={monthlyBreakdownData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `£${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                <Legend />
                <Bar dataKey="Mortgage" fill="#DC2626" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Insurance" fill="#2563EB" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Proc Fees" fill="#16A34A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Detail Table */}
      <Card className="border-slate-200">
        <CardHeader><CardTitle>Monthly Detail</CardTitle></CardHeader>
        <CardContent>
          {monthly?.monthly?.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead className="text-right">Submitted</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Clawed Back</TableHead>
                    <TableHead className="text-right">Mortgage</TableHead>
                    <TableHead className="text-right">Insurance</TableHead>
                    <TableHead className="text-right">Proc Fees</TableHead>
                    <TableHead className="text-right font-bold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthly.monthly.map((m) => (
                    <TableRow key={m.month}>
                      <TableCell className="font-medium">{m.month}</TableCell>
                      <TableCell className="text-right text-yellow-700">{formatCurrency(m.pending)}</TableCell>
                      <TableCell className="text-right text-blue-700">{formatCurrency(m.submitted)}</TableCell>
                      <TableCell className="text-right text-green-700">{formatCurrency(m.paid)}</TableCell>
                      <TableCell className="text-right text-red-700">{formatCurrency(m.clawed_back)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(m.mortgage_commission)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(m.insurance_commission)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(m.proc_fees)}</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(m.total_commission)}</TableCell>
                    </TableRow>
                  ))}
                  {/* Totals Row */}
                  <TableRow className="bg-slate-50 font-bold">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-right text-yellow-700">{formatCurrency(monthly?.totals?.total_pending)}</TableCell>
                    <TableCell className="text-right text-blue-700">{formatCurrency(monthly?.totals?.total_submitted)}</TableCell>
                    <TableCell className="text-right text-green-700">{formatCurrency(monthly?.totals?.total_paid)}</TableCell>
                    <TableCell className="text-right text-red-700">{formatCurrency(monthly?.totals?.total_clawed_back)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(monthly?.totals?.total_mortgage)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(monthly?.totals?.total_insurance)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(monthly?.totals?.total_proc_fees)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(monthly?.totals?.grand_total)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <PoundSterling className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <p>No commission data for selected period</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Commission Tracker */}
      <Card className="border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Commission Tracker</CardTitle>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]" data-testid="commission-status-filter"><SelectValue placeholder="Filter by status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {COMMISSION_STATUSES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {getFilteredCases().length === 0 ? (
            <div className="text-center py-12">
              <PoundSterling className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-700 mb-2">No commissions found</h3>
              <p className="text-slate-500">Cases with commission will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {getFilteredCases().map((c) => (
                <div key={c.case_id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors" data-testid={`commission-row-${c.case_id}`}>
                  <div>
                    <p className="font-medium text-slate-900">{c.client_name}</p>
                    <p className="text-sm text-slate-500">{c.lender_name || 'No lender'} · {c.product_type}{c.expected_completion_date ? ` · Due: ${formatDate(c.expected_completion_date)}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-slate-900">{formatCurrency(c.gross_commission)}</p>
                      {c.proc_fee_total > 0 && <p className="text-sm text-slate-500">+ {formatCurrency(c.proc_fee_total)} proc fee</p>}
                    </div>
                    <Select value={c.commission_status} onValueChange={(v) => handleUpdateCommissionStatus(c.case_id, v)}>
                      <SelectTrigger className="w-[150px]">
                        <Badge className={getStatusBadge(c.commission_status)}>
                          {COMMISSION_STATUSES.find(s => s.key === c.commission_status)?.label || c.commission_status}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        {COMMISSION_STATUSES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Commission;
