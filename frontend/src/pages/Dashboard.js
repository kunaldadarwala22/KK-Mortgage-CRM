import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI, casesAPI, tasksAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Users,
  Briefcase,
  PoundSterling,
  TrendingUp,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  Target,
  Percent,
  Building2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_broker-crm-uk/artifacts/fwvsstux_LOOGOO.png';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [recentCases, setRecentCases] = useState([]);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsData, revenueData, forecastData, casesData, tasksData] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getRevenue(),
        dashboardAPI.getForecast(),
        casesAPI.getAll({ limit: 5 }),
        tasksAPI.getAll({ completed: false, limit: 5 }),
      ]);
      
      setStats(statsData);
      setRevenue(revenueData);
      setForecast(forecastData);
      setRecentCases(casesData.cases || []);
      setUpcomingTasks(tasksData.tasks || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    if (!value) return '£0';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value) => {
    if (!value) return '0';
    return new Intl.NumberFormat('en-GB').format(value);
  };

  const getStatusColor = (status) => {
    const colors = {
      new_lead: 'bg-blue-100 text-blue-800',
      fact_find_complete: 'bg-purple-100 text-purple-800',
      application_submitted: 'bg-yellow-100 text-yellow-800',
      valuation_booked: 'bg-orange-100 text-orange-800',
      offer_issued: 'bg-indigo-100 text-indigo-800',
      completed: 'bg-green-100 text-green-800',
      lost_case: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-slate-100 text-slate-800';
  };

  const formatStatus = (status) => {
    return status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || '';
  };

  const COLORS = ['#DC2626', '#2563EB', '#16A34A', '#D97706', '#7C3AED'];

  const pipelineData = stats?.status_counts ? 
    Object.entries(stats.status_counts).map(([key, value]) => ({
      name: formatStatus(key),
      value: value
    })) : [];

  const monthlyData = revenue?.monthly_revenue?.map(item => ({
    month: item._id || 'N/A',
    revenue: item.total || 0,
    proc_fees: item.proc_fees || 0
  })) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin h-8 w-8 border-4 border-red-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fadeIn" data-testid="dashboard-page">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Dashboard
          </h1>
          <p className="text-slate-500 mt-1">Welcome back. Here's your business overview.</p>
        </div>
        <Button 
          className="bg-red-600 hover:bg-red-700"
          onClick={() => navigate('/clients/new')}
          data-testid="add-client-btn"
        >
          Add New Client
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="stat-card border-slate-200" data-testid="kpi-clients">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Clients</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{formatNumber(stats?.total_clients)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card border-slate-200" data-testid="kpi-pipeline">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Pipeline Value</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{formatCurrency(stats?.total_pipeline_value)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <PoundSterling className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card border-slate-200" data-testid="kpi-commission">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Commission</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{formatCurrency(stats?.total_commission)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card border-slate-200" data-testid="kpi-conversion">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Conversion Rate</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{stats?.conversion_rate || 0}%</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <Percent className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{stats?.total_cases || 0}</p>
            <p className="text-sm text-slate-500">Total Cases</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats?.completed_cases || 0}</p>
            <p className="text-sm text-slate-500">Completed</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats?.lost_cases || 0}</p>
            <p className="text-sm text-slate-500">Lost Cases</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats?.avg_loan_size)}</p>
            <p className="text-sm text-slate-500">Avg Loan Size</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{stats?.expiring_products || 0}</p>
            <p className="text-sm text-slate-500">Expiring (90d)</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats?.overdue_tasks || 0}</p>
            <p className="text-sm text-slate-500">Overdue Tasks</p>
          </CardContent>
        </Card>
      </div>

      {/* Forecast Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200 bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="h-5 w-5 text-green-600" />
              <p className="text-sm font-medium text-green-700">Next 30 Days</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(forecast?.next_30_days?.amount)}</p>
            <p className="text-sm text-slate-500">{forecast?.next_30_days?.cases || 0} cases expected</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <p className="text-sm font-medium text-blue-700">Next 60 Days</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(forecast?.next_60_days?.amount)}</p>
            <p className="text-sm text-slate-500">{forecast?.next_60_days?.cases || 0} cases expected</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              <p className="text-sm font-medium text-purple-700">Next 90 Days</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(forecast?.next_90_days?.amount)}</p>
            <p className="text-sm text-slate-500">{forecast?.next_90_days?.cases || 0} cases expected</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => `£${v/1000}k`} />
                  <Tooltip 
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="revenue" fill="#DC2626" radius={[4, 4, 0, 0]} name="Commission" />
                  <Bar dataKey="proc_fees" fill="#2563EB" radius={[4, 4, 0, 0]} name="Proc Fees" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pipeline Distribution */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Pipeline Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <PieChart>
                  <Pie
                    data={pipelineData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pipelineData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              <div className="text-center py-8 text-slate-500">
                <Briefcase className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p>No cases yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentCases.map((c) => (
                  <div 
                    key={c.case_id} 
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                    onClick={() => navigate(`/cases/${c.case_id}`)}
                  >
                    <div>
                      <p className="font-medium text-slate-900">{c.client_name}</p>
                      <p className="text-sm text-slate-500">{c.lender_name || 'No lender'} • {formatCurrency(c.loan_amount)}</p>
                    </div>
                    <Badge className={getStatusColor(c.status)}>
                      {formatStatus(c.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Tasks */}
        <Card className="border-slate-200">
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
              <div className="space-y-3">
                {upcomingTasks.map((task) => (
                  <div 
                    key={task.task_id} 
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${
                        task.priority === 'high' ? 'bg-red-500' : 
                        task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                      }`} />
                      <div>
                        <p className="font-medium text-slate-900">{task.title}</p>
                        <p className="text-sm text-slate-500">{task.client_name || 'No client'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">{task.due_date}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
