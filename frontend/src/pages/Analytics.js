import React, { useState, useEffect } from 'react';
import { dashboardAPI, analyticsAPI, commissionAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import {
  TrendingUp, Users, Percent, Target, Building2, PoundSterling, BarChart3,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import { toast } from 'sonner';

const COLORS = ['#DC2626', '#2563EB', '#16A34A', '#D97706', '#7C3AED', '#EC4899', '#14B8A6'];

const Analytics = () => {
  const [stats, setStats] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [leadAnalytics, setLeadAnalytics] = useState(null);
  const [retention, setRetention] = useState(null);
  const [mortgageTypes, setMortgageTypes] = useState(null);
  const [commAnalytics, setCommAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commFilters, setCommFilters] = useState({ start_date: '', end_date: '', product_filter: 'all', commission_status: 'all' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsD, revenueD, leadD, retentionD, mtD, commD] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getRevenue(),
        dashboardAPI.getLeadAnalytics(),
        dashboardAPI.getRetention(),
        analyticsAPI.getMortgageTypes(),
        commissionAPI.getAnalytics({}),
      ]);
      setStats(statsD);
      setRevenue(revenueD);
      setLeadAnalytics(leadD);
      setRetention(retentionD);
      setMortgageTypes(mtD);
      setCommAnalytics(commD);
    } catch (err) {
      console.error('Failed to load:', err);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const reloadCommAnalytics = async () => {
    try {
      const params = {};
      if (commFilters.start_date) params.start_date = commFilters.start_date;
      if (commFilters.end_date) params.end_date = commFilters.end_date;
      if (commFilters.product_filter !== 'all') params.product_filter = commFilters.product_filter;
      if (commFilters.commission_status !== 'all') params.commission_status = commFilters.commission_status;
      const data = await commissionAPI.getAnalytics(params);
      setCommAnalytics(data);
    } catch (err) {
      toast.error('Failed to reload commission analytics');
    }
  };

  const fmt = (v) => {
    if (!v && v !== 0) return '£0';
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0 }).format(v);
  };
  const fmtSrc = (s) => s?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';

  const leadSourceData = leadAnalytics?.by_lead_source?.map(i => ({
    name: fmtSrc(i._id), leads: i.total || 0, converted: i.completed || 0,
    revenue: i.total_commission || 0, conversionRate: i.conversion_rate || 0, avgLoan: i.avg_loan || 0,
  })) || [];
  const referralData = leadAnalytics?.by_referral_partner?.map(i => ({ name: i._id || 'Unknown', count: i.count || 0, revenue: i.total_commission || 0 })) || [];
  const revenueByLender = revenue?.by_lender?.map(i => ({ name: i._id || 'Unknown', value: i.total || 0, count: i.count || 0 })) || [];
  const revenueBySource = revenue?.by_lead_source?.map(i => ({ name: fmtSrc(i._id), value: i.total || 0, count: i.count || 0 })) || [];
  const retentionByMonth = retention?.expiring_by_month?.map(i => ({ month: i._id || 'N/A', count: i.count || 0, value: i.value || 0 })) || [];
  const pipelineData = stats?.status_counts ? Object.entries(stats.status_counts).map(([k, v]) => ({ name: k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), value: v })) : [];

  // Mortgage type data
  const mtPieData = mortgageTypes?.types?.map(t => ({ name: fmtSrc(t.mortgage_type), value: t.case_count })) || [];
  const mtBarData = mortgageTypes?.types?.map(t => ({ name: fmtSrc(t.mortgage_type), commission: t.total_commission, avgLoan: t.avg_loan })) || [];

  // Commission analytics data
  const commByMonth = commAnalytics?.by_month?.map(i => ({ name: i._id || 'N/A', commission: i.total || 0, proc_fees: i.proc_fees || 0 })) || [];
  const commByLender = commAnalytics?.by_lender?.map(i => ({ name: i._id || 'Unknown', value: i.total || 0 })) || [];
  const commByProduct = commAnalytics?.by_product?.map(i => ({ name: fmtSrc(i._id), value: i.total || 0 })) || [];
  const commByLeadSrc = commAnalytics?.by_lead_source?.map(i => ({ name: fmtSrc(i._id), value: i.total || 0 })) || [];
  const commByAdvisor = commAnalytics?.by_advisor?.map(i => ({ name: i.name || 'Unknown', value: i.total || 0, proc_fees: i.proc_fees || 0, cases: i.count || 0 })) || [];

  if (loading) {
    return (<div className="flex items-center justify-center h-96"><div className="animate-spin h-8 w-8 border-4 border-red-600 border-t-transparent rounded-full" /></div>);
  }

  return (
    <div className="p-6 space-y-6 animate-fadeIn" data-testid="analytics-page">
      <div>
        <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>Analytics & Reports</h1>
        <p className="text-slate-500 mt-1">Comprehensive business intelligence and insights</p>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { icon: Users, color: 'blue', value: stats?.total_clients || 0, label: 'Total Clients' },
          { icon: Percent, color: 'green', value: `${stats?.conversion_rate || 0}%`, label: 'Conversion Rate' },
          { icon: PoundSterling, color: 'purple', value: fmt(stats?.avg_loan_size), label: 'Avg Loan Size' },
          { icon: Target, color: 'red', value: stats?.completed_cases || 0, label: 'Completed Cases' },
          { icon: Building2, color: 'orange', value: fmt(retention?.retention_pipeline_value), label: 'Retention Value' },
        ].map(({ icon: Icon, color, value, label }) => (
          <Card key={label} className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full bg-${color}-100 flex items-center justify-center`}><Icon className={`h-5 w-5 text-${color}-600`} /></div>
                <div><p className="text-2xl font-bold text-slate-900">{value}</p><p className="text-sm text-slate-500">{label}</p></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="leads" className="w-full">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
          <TabsTrigger value="leads">Lead Analytics</TabsTrigger>
          <TabsTrigger value="mortgage-types" data-testid="mortgage-types-tab">Mortgage Types</TabsTrigger>
          <TabsTrigger value="commission-analytics" data-testid="commission-analytics-tab">Commission Analytics</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="retention">Retention</TabsTrigger>
        </TabsList>

        {/* Lead Analytics Tab */}
        <TabsContent value="leads" className="mt-6 space-y-6">
          <Card className="border-slate-200">
            <CardHeader><CardTitle>Lead Source Performance</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead Source</TableHead><TableHead className="text-right">Leads</TableHead><TableHead className="text-right">Converted</TableHead><TableHead className="text-right">Conversion Rate</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Avg Loan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leadSourceData.map((i, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{i.name}</TableCell>
                        <TableCell className="text-right">{i.leads}</TableCell>
                        <TableCell className="text-right">{i.converted}</TableCell>
                        <TableCell className="text-right"><Badge className={i.conversionRate >= 50 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>{i.conversionRate}%</Badge></TableCell>
                        <TableCell className="text-right font-medium">{fmt(i.revenue)}</TableCell>
                        <TableCell className="text-right">{fmt(i.avgLoan)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-slate-200">
              <CardHeader><CardTitle>Conversion by Lead Source</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[300px]"><ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={leadSourceData}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" /><YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" /><Tooltip /><Legend /><Bar dataKey="leads" fill="#2563EB" radius={[4, 4, 0, 0]} name="Total Leads" /><Bar dataKey="converted" fill="#16A34A" radius={[4, 4, 0, 0]} name="Converted" /></BarChart>
                </ResponsiveContainer></div>
              </CardContent>
            </Card>
            <Card className="border-slate-200">
              <CardHeader><CardTitle>Top Referral Partners</CardTitle></CardHeader>
              <CardContent>
                {referralData.length === 0 ? <div className="text-center py-8 text-slate-500"><Users className="h-12 w-12 mx-auto text-slate-300 mb-4" /><p>No referral data available</p></div> : (
                  <div className="h-[300px]"><ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <BarChart data={referralData} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => `£${v/1000}k`} /><YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" width={100} /><Tooltip formatter={(v) => fmt(v)} /><Bar dataKey="revenue" fill="#DC2626" radius={[0, 4, 4, 0]} name="Revenue" /></BarChart>
                  </ResponsiveContainer></div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Mortgage Types Tab */}
        <TabsContent value="mortgage-types" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {mortgageTypes?.types?.map((t) => (
              <Card key={t.mortgage_type} className="border-slate-200">
                <CardContent className="p-5">
                  <p className="text-sm text-slate-500 mb-1">{fmtSrc(t.mortgage_type)}</p>
                  <p className="text-3xl font-bold text-slate-900">{t.case_count}</p>
                  <p className="text-sm text-slate-500">{t.percentage}% of total</p>
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <p className="text-xs text-slate-500">Commission: <span className="font-medium text-slate-700">{fmt(t.total_commission)}</span></p>
                    <p className="text-xs text-slate-500">Avg Loan: <span className="font-medium text-slate-700">{fmt(t.avg_loan)}</span></p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-slate-200">
              <CardHeader><CardTitle>Mortgage Type Distribution</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[300px]"><ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <PieChart><Pie data={mtPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>{mtPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart>
                </ResponsiveContainer></div>
              </CardContent>
            </Card>
            <Card className="border-slate-200">
              <CardHeader><CardTitle>Commission by Mortgage Type</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[300px]"><ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={mtBarData}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" /><YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `£${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} /><Tooltip formatter={(v) => fmt(v)} /><Legend /><Bar dataKey="commission" fill="#DC2626" radius={[4, 4, 0, 0]} name="Commission" /><Bar dataKey="avgLoan" fill="#2563EB" radius={[4, 4, 0, 0]} name="Avg Loan Size" /></BarChart>
                </ResponsiveContainer></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Commission Analytics Tab */}
        <TabsContent value="commission-analytics" className="mt-6 space-y-6">
          {/* Filters */}
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="space-y-1"><Label className="text-xs">Start Date</Label><Input type="date" value={commFilters.start_date} onChange={(e) => setCommFilters({ ...commFilters, start_date: e.target.value })} className="w-40" /></div>
                <div className="space-y-1"><Label className="text-xs">End Date</Label><Input type="date" value={commFilters.end_date} onChange={(e) => setCommFilters({ ...commFilters, end_date: e.target.value })} className="w-40" /></div>
                <div className="space-y-1">
                  <Label className="text-xs">Product</Label>
                  <Select value={commFilters.product_filter} onValueChange={(v) => setCommFilters({ ...commFilters, product_filter: v })}>
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="mortgage">Mortgage</SelectItem><SelectItem value="insurance">Insurance</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Commission Status</Label>
                  <Select value={commFilters.commission_status} onValueChange={(v) => setCommFilters({ ...commFilters, commission_status: v })}>
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="submitted_to_lender">Submitted</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="clawed_back">Clawed Back</SelectItem></SelectContent>
                  </Select>
                </div>
                <Button onClick={reloadCommAnalytics} size="sm" className="bg-red-600 hover:bg-red-700" data-testid="apply-comm-filters">Apply Filters</Button>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Total Commission', value: fmt(commAnalytics?.summary?.total_commission) },
              { label: 'Total Paid', value: fmt(commAnalytics?.summary?.total_paid) },
              { label: 'Total Pending', value: fmt(commAnalytics?.summary?.total_pending) },
              { label: 'Total Clawbacks', value: fmt(commAnalytics?.summary?.total_clawbacks) },
              { label: 'Avg per Case', value: fmt(commAnalytics?.summary?.avg_commission) },
            ].map(({ label, value }) => (
              <Card key={label} className="border-slate-200">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-slate-200">
              <CardHeader><CardTitle>Commission by Month</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[300px]"><ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={commByMonth}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" /><YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `£${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} /><Tooltip formatter={(v) => fmt(v)} /><Legend /><Bar dataKey="commission" fill="#DC2626" radius={[4, 4, 0, 0]} name="Commission" /><Bar dataKey="proc_fees" fill="#2563EB" radius={[4, 4, 0, 0]} name="Proc Fees" /></BarChart>
                </ResponsiveContainer></div>
              </CardContent>
            </Card>
            <Card className="border-slate-200">
              <CardHeader><CardTitle>Commission by Lender</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[300px]"><ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={commByLender} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `£${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} /><YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" width={100} /><Tooltip formatter={(v) => fmt(v)} /><Bar dataKey="value" fill="#DC2626" radius={[0, 4, 4, 0]} name="Commission" /></BarChart>
                </ResponsiveContainer></div>
              </CardContent>
            </Card>
            <Card className="border-slate-200">
              <CardHeader><CardTitle>Commission by Product Type</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[300px]"><ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <PieChart><Pie data={commByProduct} cx="50%" cy="50%" outerRadius={100} paddingAngle={2} dataKey="value" label={({ name, value }) => `${name}: ${fmt(value)}`}>{commByProduct.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip formatter={(v) => fmt(v)} /></PieChart>
                </ResponsiveContainer></div>
              </CardContent>
            </Card>
            <Card className="border-slate-200">
              <CardHeader><CardTitle>Commission by Lead Source</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[300px]"><ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={commByLeadSrc} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `£${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} /><YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" width={80} /><Tooltip formatter={(v) => fmt(v)} /><Bar dataKey="value" fill="#2563EB" radius={[0, 4, 4, 0]} name="Commission" /></BarChart>
                </ResponsiveContainer></div>
              </CardContent>
            </Card>
          </div>

          {/* Commission by Advisor Table */}
          {commByAdvisor.length > 0 && (
            <Card className="border-slate-200">
              <CardHeader><CardTitle>Commission by Advisor</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Advisor</TableHead><TableHead className="text-right">Cases</TableHead><TableHead className="text-right">Commission</TableHead><TableHead className="text-right">Proc Fees</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {commByAdvisor.map((a, i) => (
                      <TableRow key={i}><TableCell className="font-medium">{a.name}</TableCell><TableCell className="text-right">{a.cases}</TableCell><TableCell className="text-right">{fmt(a.value)}</TableCell><TableCell className="text-right">{fmt(a.proc_fees)}</TableCell><TableCell className="text-right font-bold">{fmt(a.value + a.proc_fees)}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-slate-200">
              <CardHeader><CardTitle>Revenue by Lender</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[300px]"><ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <PieChart><Pie data={revenueByLender} cx="50%" cy="50%" outerRadius={100} paddingAngle={2} dataKey="value" label={({ name, value }) => `${name}: ${fmt(value)}`}>{revenueByLender.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip formatter={(v) => fmt(v)} /></PieChart>
                </ResponsiveContainer></div>
              </CardContent>
            </Card>
            <Card className="border-slate-200">
              <CardHeader><CardTitle>Revenue by Lead Source</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[300px]"><ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={revenueBySource} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => `£${v/1000}k`} /><YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" width={80} /><Tooltip formatter={(v) => fmt(v)} /><Bar dataKey="value" fill="#2563EB" radius={[0, 4, 4, 0]} name="Revenue" /></BarChart>
                </ResponsiveContainer></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Pipeline Tab */}
        <TabsContent value="pipeline" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-slate-200">
              <CardHeader><CardTitle>Pipeline Stage Distribution</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[300px]"><ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <PieChart><Pie data={pipelineData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>{pipelineData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart>
                </ResponsiveContainer></div>
              </CardContent>
            </Card>
            <Card className="border-slate-200">
              <CardHeader><CardTitle>Completion vs Lost Ratio</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-8">
                      <div><p className="text-5xl font-bold text-green-600">{stats?.completed_cases || 0}</p><p className="text-slate-500 mt-2">Completed</p></div>
                      <div className="text-4xl text-slate-300">vs</div>
                      <div><p className="text-5xl font-bold text-red-600">{stats?.lost_cases || 0}</p><p className="text-slate-500 mt-2">Lost</p></div>
                    </div>
                    <div className="mt-8"><p className="text-3xl font-bold text-slate-900">{stats?.conversion_rate || 0}%</p><p className="text-slate-500">Overall Conversion Rate</p></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Retention Tab */}
        <TabsContent value="retention" className="mt-6 space-y-6">
          <Card className="border-slate-200">
            <CardHeader><CardTitle>Products Expiring by Month</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]"><ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <AreaChart data={retentionByMonth}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" /><YAxis yAxisId="left" tick={{ fontSize: 12 }} stroke="#94a3b8" /><YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => `£${v/1000}k`} /><Tooltip formatter={(v, name) => name === 'value' ? fmt(v) : v} /><Legend /><Area yAxisId="left" type="monotone" dataKey="count" stroke="#2563EB" fill="#2563EB" fillOpacity={0.3} name="Cases Expiring" /><Area yAxisId="right" type="monotone" dataKey="value" stroke="#DC2626" fill="#DC2626" fillOpacity={0.3} name="Loan Value" /></AreaChart>
              </ResponsiveContainer></div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardHeader><CardTitle>Products Expiring This Month</CardTitle></CardHeader>
            <CardContent>
              {retention?.expiring_this_month?.length === 0 ? (
                <div className="text-center py-8 text-slate-500"><BarChart3 className="h-12 w-12 mx-auto text-slate-300 mb-4" /><p>No products expiring this month</p></div>
              ) : (
                <div className="space-y-3">
                  {retention?.expiring_this_month?.map((i) => (
                    <div key={i.case_id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                      <div><p className="font-medium">{i.client_name}</p><p className="text-sm text-slate-500">{i.lender_name} · Expires: {i.product_expiry_date}</p></div>
                      <p className="font-bold text-slate-900">{fmt(i.loan_amount)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;
