import React, { useState, useEffect } from 'react';
import { dashboardAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
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
  TrendingUp,
  Users,
  Percent,
  Target,
  Building2,
  PoundSterling,
  BarChart3,
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
  AreaChart,
  Area,
} from 'recharts';
import { toast } from 'sonner';

const Analytics = () => {
  const [stats, setStats] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [leadAnalytics, setLeadAnalytics] = useState(null);
  const [retention, setRetention] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, revenueData, leadData, retentionData] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getRevenue(),
        dashboardAPI.getLeadAnalytics(),
        dashboardAPI.getRetention(),
      ]);
      setStats(statsData);
      setRevenue(revenueData);
      setLeadAnalytics(leadData);
      setRetention(retentionData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load analytics data');
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
    }).format(value);
  };

  const formatLeadSource = (source) => {
    return source?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';
  };

  const COLORS = ['#DC2626', '#2563EB', '#16A34A', '#D97706', '#7C3AED', '#EC4899', '#14B8A6'];

  const leadSourceData = leadAnalytics?.by_lead_source?.map(item => ({
    name: formatLeadSource(item._id),
    leads: item.total || 0,
    converted: item.completed || 0,
    revenue: item.total_commission || 0,
    conversionRate: item.conversion_rate || 0,
    avgLoan: item.avg_loan || 0,
  })) || [];

  const referralData = leadAnalytics?.by_referral_partner?.map(item => ({
    name: item._id || 'Unknown',
    count: item.count || 0,
    revenue: item.total_commission || 0,
  })) || [];

  const revenueByLender = revenue?.by_lender?.map(item => ({
    name: item._id || 'Unknown',
    value: item.total || 0,
    count: item.count || 0,
  })) || [];

  const revenueBySource = revenue?.by_lead_source?.map(item => ({
    name: formatLeadSource(item._id),
    value: item.total || 0,
    count: item.count || 0,
  })) || [];

  const retentionByMonth = retention?.expiring_by_month?.map(item => ({
    month: item._id || 'N/A',
    count: item.count || 0,
    value: item.value || 0,
  })) || [];

  const pipelineData = stats?.status_counts ? 
    Object.entries(stats.status_counts).map(([key, value]) => ({
      name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: value
    })) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin h-8 w-8 border-4 border-red-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fadeIn" data-testid="analytics-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
          Analytics & Reports
        </h1>
        <p className="text-slate-500 mt-1">Comprehensive business intelligence and insights</p>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats?.total_clients || 0}</p>
                <p className="text-sm text-slate-500">Total Clients</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <Percent className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats?.conversion_rate || 0}%</p>
                <p className="text-sm text-slate-500">Conversion Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <PoundSterling className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats?.avg_loan_size)}</p>
                <p className="text-sm text-slate-500">Avg Loan Size</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <Target className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats?.completed_cases || 0}</p>
                <p className="text-sm text-slate-500">Completed Cases</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(retention?.retention_pipeline_value)}</p>
                <p className="text-sm text-slate-500">Retention Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="leads" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="leads">Lead Analytics</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="retention">Retention</TabsTrigger>
        </TabsList>

        {/* Lead Analytics Tab */}
        <TabsContent value="leads" className="mt-6 space-y-6">
          {/* Lead Source Performance */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Lead Source Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-slate-500 border-b">
                      <th className="pb-3 font-medium">Lead Source</th>
                      <th className="pb-3 font-medium text-right">Leads</th>
                      <th className="pb-3 font-medium text-right">Converted</th>
                      <th className="pb-3 font-medium text-right">Conversion Rate</th>
                      <th className="pb-3 font-medium text-right">Revenue</th>
                      <th className="pb-3 font-medium text-right">Avg Loan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leadSourceData.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="py-3 font-medium">{item.name}</td>
                        <td className="py-3 text-right">{item.leads}</td>
                        <td className="py-3 text-right">{item.converted}</td>
                        <td className="py-3 text-right">
                          <Badge className={item.conversionRate >= 50 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                            {item.conversionRate}%
                          </Badge>
                        </td>
                        <td className="py-3 text-right font-medium">{formatCurrency(item.revenue)}</td>
                        <td className="py-3 text-right">{formatCurrency(item.avgLoan)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Lead Source Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle>Conversion by Lead Source</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={leadSourceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                      <Legend />
                      <Bar dataKey="leads" fill="#2563EB" radius={[4, 4, 0, 0]} name="Total Leads" />
                      <Bar dataKey="converted" fill="#16A34A" radius={[4, 4, 0, 0]} name="Converted" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Referral Partners */}
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle>Top Referral Partners</CardTitle>
              </CardHeader>
              <CardContent>
                {referralData.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Users className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                    <p>No referral data available</p>
                  </div>
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={referralData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => `£${v/1000}k`} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" width={100} />
                        <Tooltip 
                          formatter={(value) => formatCurrency(value)}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                        />
                        <Bar dataKey="revenue" fill="#DC2626" radius={[0, 4, 4, 0]} name="Revenue" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle>Revenue by Lender</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={revenueByLender}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                      >
                        {revenueByLender.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle>Revenue by Lead Source</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueBySource} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => `£${v/1000}k`} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" width={80} />
                      <Tooltip 
                        formatter={(value) => formatCurrency(value)}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                      />
                      <Bar dataKey="value" fill="#2563EB" radius={[0, 4, 4, 0]} name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Pipeline Tab */}
        <TabsContent value="pipeline" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle>Pipeline Stage Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
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

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle>Completion vs Lost Ratio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-8">
                      <div>
                        <p className="text-5xl font-bold text-green-600">{stats?.completed_cases || 0}</p>
                        <p className="text-slate-500 mt-2">Completed</p>
                      </div>
                      <div className="text-4xl text-slate-300">vs</div>
                      <div>
                        <p className="text-5xl font-bold text-red-600">{stats?.lost_cases || 0}</p>
                        <p className="text-slate-500 mt-2">Lost</p>
                      </div>
                    </div>
                    <div className="mt-8">
                      <p className="text-3xl font-bold text-slate-900">{stats?.conversion_rate || 0}%</p>
                      <p className="text-slate-500">Overall Conversion Rate</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Retention Tab */}
        <TabsContent value="retention" className="mt-6 space-y-6">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Products Expiring by Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={retentionByMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => `£${v/1000}k`} />
                    <Tooltip 
                      formatter={(value, name) => name === 'value' ? formatCurrency(value) : value}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                    />
                    <Legend />
                    <Area yAxisId="left" type="monotone" dataKey="count" stroke="#2563EB" fill="#2563EB" fillOpacity={0.3} name="Cases Expiring" />
                    <Area yAxisId="right" type="monotone" dataKey="value" stroke="#DC2626" fill="#DC2626" fillOpacity={0.3} name="Loan Value" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Expiring This Month */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Products Expiring This Month</CardTitle>
            </CardHeader>
            <CardContent>
              {retention?.expiring_this_month?.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <BarChart3 className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                  <p>No products expiring this month</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {retention?.expiring_this_month?.map((item) => (
                    <div key={item.case_id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                      <div>
                        <p className="font-medium">{item.client_name}</p>
                        <p className="text-sm text-slate-500">
                          {item.lender_name} • Expires: {item.product_expiry_date}
                        </p>
                      </div>
                      <p className="font-bold text-slate-900">{formatCurrency(item.loan_amount)}</p>
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
