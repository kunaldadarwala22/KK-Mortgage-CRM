import React, { useState, useEffect } from 'react';
import { dashboardAPI, casesAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  PoundSterling,
  TrendingUp,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowUp,
  ArrowDown,
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
  Legend,
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
  const [revenue, setRevenue] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, revenueData, forecastData, casesData] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getRevenue(),
        dashboardAPI.getForecast(),
        casesAPI.getAll({}),
      ]);
      setStats(statsData);
      setRevenue(revenueData);
      setForecast(forecastData);
      setCases(casesData.cases || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load commission data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCommissionStatus = async (caseId, newStatus) => {
    try {
      await casesAPI.update(caseId, { commission_status: newStatus });
      toast.success('Commission status updated');
      loadData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const formatCurrency = (value) => {
    if (!value) return '£0';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getFilteredCases = () => {
    if (statusFilter === 'all') return cases.filter(c => c.gross_commission > 0);
    return cases.filter(c => c.commission_status === statusFilter && c.gross_commission > 0);
  };

  const getStatusBadge = (status) => {
    const found = COMMISSION_STATUSES.find(s => s.key === status);
    return found ? found.color : 'bg-slate-100 text-slate-800';
  };

  const COLORS = ['#DC2626', '#2563EB', '#16A34A', '#D97706', '#7C3AED'];

  const productTypeData = revenue?.by_product_type?.map(item => ({
    name: item._id === 'mortgage' ? 'Mortgage' : 'Insurance',
    value: item.total || 0,
  })) || [];

  const lenderData = revenue?.by_lender?.slice(0, 5).map(item => ({
    name: item._id || 'Unknown',
    value: item.total || 0,
  })) || [];

  const monthlyData = revenue?.monthly_revenue?.map(item => ({
    month: item._id || 'N/A',
    commission: item.total || 0,
    proc_fees: item.proc_fees || 0,
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
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
          Commission & Revenue
        </h1>
        <p className="text-slate-500 mt-1">Track your earnings and forecast future revenue</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 stat-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Commission (Paid)</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {formatCurrency(stats?.total_commission)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <PoundSterling className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 stat-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Proc Fees (Paid)</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {formatCurrency(stats?.total_proc_fees)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 stat-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Mortgage Commission</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {formatCurrency(stats?.mortgage_commission)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 stat-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Insurance Commission</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {formatCurrency(stats?.insurance_commission)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Forecast Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200 bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="h-5 w-5 text-green-600" />
              <p className="text-sm font-medium text-green-700">Forecast: Next 30 Days</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(forecast?.next_30_days?.amount)}</p>
            <p className="text-sm text-slate-500">{forecast?.next_30_days?.cases || 0} cases expected</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <p className="text-sm font-medium text-blue-700">Forecast: Next 60 Days</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(forecast?.next_60_days?.amount)}</p>
            <p className="text-sm text-slate-500">{forecast?.next_60_days?.cases || 0} cases expected</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              <p className="text-sm font-medium text-purple-700">Forecast: Next 90 Days</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(forecast?.next_90_days?.amount)}</p>
            <p className="text-sm text-slate-500">{forecast?.next_90_days?.cases || 0} cases expected</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Monthly Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => `£${v/1000}k`} />
                  <Tooltip 
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Legend />
                  <Bar dataKey="commission" fill="#DC2626" radius={[4, 4, 0, 0]} name="Commission" />
                  <Bar dataKey="proc_fees" fill="#2563EB" radius={[4, 4, 0, 0]} name="Proc Fees" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* By Product Type */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Revenue by Product Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={productTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                  >
                    {productTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Lender */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Revenue by Lender (Top 5)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lenderData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => `£${v/1000}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" width={100} />
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="value" fill="#DC2626" radius={[0, 4, 4, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Commission Tracker */}
      <Card className="border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Commission Tracker</CardTitle>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {COMMISSION_STATUSES.map((status) => (
                <SelectItem key={status.key} value={status.key}>{status.label}</SelectItem>
              ))}
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
              {getFilteredCases().map((caseItem) => (
                <div
                  key={caseItem.case_id}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  data-testid={`commission-row-${caseItem.case_id}`}
                >
                  <div>
                    <p className="font-medium text-slate-900">{caseItem.client_name}</p>
                    <p className="text-sm text-slate-500">
                      {caseItem.lender_name || 'No lender'} • {caseItem.product_type}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-slate-900">{formatCurrency(caseItem.gross_commission)}</p>
                      {caseItem.proc_fee_total > 0 && (
                        <p className="text-sm text-slate-500">+ {formatCurrency(caseItem.proc_fee_total)} proc fee</p>
                      )}
                    </div>
                    <Select
                      value={caseItem.commission_status}
                      onValueChange={(value) => handleUpdateCommissionStatus(caseItem.case_id, value)}
                    >
                      <SelectTrigger className="w-[150px]">
                        <Badge className={getStatusBadge(caseItem.commission_status)}>
                          {COMMISSION_STATUSES.find(s => s.key === caseItem.commission_status)?.label || caseItem.commission_status}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        {COMMISSION_STATUSES.map((status) => (
                          <SelectItem key={status.key} value={status.key}>
                            {status.label}
                          </SelectItem>
                        ))}
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
