import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI, casesAPI, tasksAPI, clientsAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Users, Briefcase, PoundSterling, TrendingUp, Calendar, AlertTriangle,
  CheckCircle, ArrowRight, Percent, Phone, Mail, Clock, ShieldAlert,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [retention, setRetention] = useState(null);
  const [recentClients, setRecentClients] = useState([]);
  const [recentCases, setRecentCases] = useState([]);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDashboardData(); }, []);

  const loadDashboardData = async () => {
    try {
      const [statsD, revenueD, forecastD, retentionD, clientsD, casesD, tasksD] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getRevenue(),
        dashboardAPI.getForecast(),
        dashboardAPI.getRetention(),
        clientsAPI.getAll({ limit: 5, enrich_cases: true }),
        casesAPI.getAll({ limit: 5 }),
        tasksAPI.getAll({ completed: false, limit: 5 }),
      ]);
      setStats(statsD);
      setRevenue(revenueD);
      setForecast(forecastD);
      setRetention(retentionD);
      setRecentClients(clientsD.clients || []);
      setRecentCases(casesD.cases || []);
      setUpcomingTasks(tasksD.tasks || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (v) => v ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v) : '£0';
  const fmtDate = (d) => { if (!d) return '-'; const p = d.split('T')[0].split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d; };
  const fmtStatus = (s) => s?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || '';
  const statusColor = (s) => ({ new_lead: 'bg-blue-100 text-blue-800', fact_find_complete: 'bg-purple-100 text-purple-800', application_submitted: 'bg-yellow-100 text-yellow-800', valuation_booked: 'bg-orange-100 text-orange-800', offer_issued: 'bg-indigo-100 text-indigo-800', completed: 'bg-green-100 text-green-800', lost_case: 'bg-red-100 text-red-800' }[s] || 'bg-slate-100 text-slate-800');

  const COLORS = ['#DC2626', '#2563EB', '#16A34A', '#D97706', '#7C3AED'];
  const pipelineData = stats?.status_counts ? Object.entries(stats.status_counts).map(([k, v]) => ({ name: fmtStatus(k), value: v })) : [];
  const monthlyData = revenue?.monthly_revenue?.map(i => ({ month: i._id || 'N/A', revenue: i.total || 0, proc_fees: i.proc_fees || 0 })) || [];

  const expiringThisMonth = retention?.expiring_this_month || [];
  const expiringByMonth = retention?.expiring_by_month || [];
  // Combine all expiring cases: this month first, then build a flat list from by_month cases if available
  // We use expiringThisMonth for individual rows (has client_name + case_id), and byMonth for the summary count
  const expiringSoonCount = expiringByMonth.reduce((sum, m) => sum + m.count, 0);
  const expiringSoonValue = expiringByMonth.reduce((sum, m) => sum + m.value, 0);

  if (loading) {
    return (<div className="flex items-center justify-center h-96"><div className="animate-spin h-8 w-8 border-4 border-red-600 border-t-transparent rounded-full" /></div>);
  }

  return (
    <div className="p-6 space-y-6 animate-fadeIn" data-testid="dashboard-page">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Welcome back, Kunal. Here's your business overview.</p>
        </div>
        <Button className="bg-red-600 hover:bg-red-700" onClick={() => navigate('/clients', { state: { openAddDialog: true } })} data-testid="add-client-btn">
          Add New Client
        </Button>
      </div>

      {/* ========== 1. EXPIRING SOON & CONTACT THIS MONTH ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiring Soon */}
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/10 dark:to-slate-800 dark:border-amber-800" data-testid="expiring-soon-section">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <CardTitle className="text-lg font-semibold text-amber-900 dark:text-amber-400">Expiring Soon</CardTitle>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{expiringSoonCount}</p>
              <p className="text-xs text-amber-600 dark:text-amber-500">products in 6 months</p>
            </div>
          </CardHeader>
          <CardContent>
            {expiringSoonCount === 0 ? (
              <div className="text-center py-6 text-amber-600">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-amber-300" />
                <p className="text-sm">No products expiring in the next 6 months</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-amber-700 dark:text-amber-500 mb-3">
                  Total loan value at risk: <span className="font-bold">{fmt(expiringSoonValue)}</span>
                </p>
                <div className="space-y-2">
                  {expiringThisMonth.slice(0, 5).map((c) => (
                    <div
                      key={c.case_id}
                      className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-800 rounded border border-amber-100 dark:border-amber-900/40 hover:bg-amber-50 dark:hover:bg-amber-900/20 cursor-pointer transition-colors"
                      onClick={() => navigate(`/cases/${c.case_id}`)}
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{c.client_name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {c.lender_name} · Expires: {fmtDate(c.product_expiry_date)}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-amber-800 dark:text-amber-400">{fmt(c.loan_amount)}</p>
                    </div>
                  ))}
                  {/* If expiringThisMonth is empty but byMonth has data, show month-level rows as fallback */}
                  {expiringThisMonth.length === 0 && expiringByMonth.slice(0, 3).map((m) => (
                    <div
                      key={m._id}
                      className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded border border-amber-100 dark:border-amber-900/40 hover:bg-amber-50 dark:hover:bg-amber-900/20 cursor-pointer transition-colors"
                      onClick={() => navigate('/cases')}
                    >
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{m._id}</span>
                      <div className="text-right">
                        <span className="text-sm font-bold text-amber-800 dark:text-amber-400">{m.count} products</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">{fmt(m.value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/cases')}
                  className="mt-3 text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300"
                >
                  View All Cases <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Contact This Month */}
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/10 dark:to-slate-800 dark:border-blue-800" data-testid="contact-this-month-section">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Phone className="h-4 w-4 text-blue-600" />
              </div>
              <CardTitle className="text-lg font-semibold text-blue-900 dark:text-blue-400">Contact Soon</CardTitle>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{expiringThisMonth.length}</p>
              <p className="text-xs text-blue-600 dark:text-blue-500">clients to contact</p>
            </div>
          </CardHeader>
          <CardContent>
            {expiringThisMonth.length === 0 ? (
              <div className="text-center py-6 text-blue-600">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-blue-300" />
                <p className="text-sm">No clients need contacting this month</p>
              </div>
            ) : (
              <div className="space-y-2">
                {expiringThisMonth.slice(0, 5).map((c) => (
                  <div key={c.case_id} className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-800 rounded border border-blue-100 dark:border-blue-900/40 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors" onClick={() => navigate(`/cases/${c.case_id}`)}>
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{c.client_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{c.lender_name} · Expires: {fmtDate(c.product_expiry_date)}</p>
                    </div>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{fmt(c.loan_amount)}</p>
                  </div>
                ))}
                {expiringThisMonth.length > 5 && (
                  <p className="text-xs text-blue-600 dark:text-blue-500 text-center mt-2">+ {expiringThisMonth.length - 5} more</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ========== 2. RECENT CLIENTS ========== */}
      <Card className="border-slate-200" data-testid="recent-clients-section">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">Recent Clients</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/clients')} data-testid="view-all-clients-btn">
            View All <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {recentClients.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p>No clients yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {recentClients.map((c) => (
                <div key={c.client_id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors border border-slate-100 dark:border-slate-700" onClick={() => navigate(`/clients/${c.client_id}`)}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center text-red-700 text-sm font-bold">
                      {c.first_name?.[0]}{c.last_name?.[0]}
                    </div>
                    <p className="font-medium text-sm text-slate-900 dark:text-white truncate">{c.first_name} {c.last_name}</p>
                  </div>
                  {c.case_status && <Badge className={`text-xs ${statusColor(c.case_status)}`}>{fmtStatus(c.case_status)}</Badge>}
                  {c.loan_amount && <p className="text-xs text-slate-500 mt-1">{fmt(c.loan_amount)}</p>}
                  {c.lead_source && <p className="text-xs text-slate-400 mt-0.5">{fmtStatus(c.lead_source)}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========== 3. UPCOMING TASKS ========== */}
      <Card className="border-slate-200" data-testid="upcoming-tasks-section">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">Upcoming Tasks</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/tasks')} data-testid="view-all-tasks-btn">
            View All <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {upcomingTasks.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p>No pending tasks</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingTasks.map((task) => (
                <div key={task.task_id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`h-2.5 w-2.5 rounded-full ${task.priority === 'high' ? 'bg-red-500' : task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{task.title}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{task.client_name || 'No client'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <p className="text-sm text-slate-500">{fmtDate(task.due_date)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========== 4. KPI CARDS ========== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="stat-card border-slate-200" data-testid="kpi-clients">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-slate-500 dark:text-slate-400">Total Clients</p><p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{stats?.total_clients || 0}</p></div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center"><Users className="h-6 w-6 text-blue-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card border-slate-200" data-testid="kpi-pipeline">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-slate-500 dark:text-slate-400">Pipeline Value</p><p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{fmt(stats?.total_pipeline_value)}</p></div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center"><PoundSterling className="h-6 w-6 text-green-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card border-slate-200" data-testid="kpi-commission">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-slate-500 dark:text-slate-400">Total Commission</p><p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{fmt(stats?.total_commission)}</p></div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center"><TrendingUp className="h-6 w-6 text-purple-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card border-slate-200" data-testid="kpi-conversion">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-slate-500 dark:text-slate-400">Conversion Rate</p><p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{stats?.conversion_rate || 0}%</p></div>
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center"><Percent className="h-6 w-6 text-red-600" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { v: stats?.total_cases || 0, l: 'Total Cases', c: 'text-slate-900 dark:text-white' },
          { v: stats?.completed_cases || 0, l: 'Completed', c: 'text-green-600' },
          { v: stats?.lost_cases || 0, l: 'Lost Cases', c: 'text-red-600' },
          { v: fmt(stats?.avg_loan_size), l: 'Avg Loan Size', c: 'text-slate-900 dark:text-white' },
          { v: stats?.expiring_products || 0, l: 'Expiring (90d)', c: 'text-orange-600' },
          { v: stats?.overdue_tasks || 0, l: 'Overdue Tasks', c: 'text-yellow-600' },
        ].map(({ v, l, c }) => (
          <Card key={l} className="border-slate-200">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${c}`}>{v}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{l}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Forecast Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { k: 'next_30_days', l: 'Next 30 Days', color: 'green' },
          { k: 'next_60_days', l: 'Next 60 Days', color: 'blue' },
          { k: 'next_90_days', l: 'Next 90 Days', color: 'purple' },
        ].map(({ k, l, color }) => (
          <Card key={k} className={`border-slate-200 bg-gradient-to-br from-${color}-50 to-white`}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className={`h-5 w-5 text-${color}-600`} />
                <p className={`text-sm font-medium text-${color}-700`}>{l}</p>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{fmt(forecast?.[k]?.amount)}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{forecast?.[k]?.cases || 0} cases expected</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200">
          <CardHeader className="pb-2"><CardTitle className="text-lg font-semibold">Monthly Revenue</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => `£${v/1000}k`} />
                  <Tooltip formatter={(v) => fmt(v)} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="revenue" fill="#DC2626" radius={[4, 4, 0, 0]} name="Commission" />
                  <Bar dataKey="proc_fees" fill="#2563EB" radius={[4, 4, 0, 0]} name="Proc Fees" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-2"><CardTitle className="text-lg font-semibold">Pipeline Distribution</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <PieChart>
                  <Pie data={pipelineData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {pipelineData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Cases */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">Recent Cases</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/cases')} data-testid="view-all-cases-btn">
            View All <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {recentCases.length === 0 ? (
            <div className="text-center py-8 text-slate-500"><Briefcase className="h-8 w-8 mx-auto mb-2 text-slate-300" /><p>No cases yet</p></div>
          ) : (
            <div className="space-y-2">
              {recentCases.map((c) => (
                <div key={c.case_id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors" onClick={() => navigate(`/cases/${c.case_id}`)}>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{c.client_name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{c.lender_name || 'No lender'} · {fmt(c.loan_amount)}</p>
                  </div>
                  <Badge className={statusColor(c.status)}>{fmtStatus(c.status)}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
