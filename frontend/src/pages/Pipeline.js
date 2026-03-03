import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { casesAPI, usersAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Search,
  Filter,
  X,
  ArrowRight,
  GripVertical,
  User,
  Building2,
  PoundSterling,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';

const CASE_STATUSES = [
  { key: 'new_lead', label: 'New Lead', color: 'bg-blue-500' },
  { key: 'fact_find_complete', label: 'Fact Find Complete', color: 'bg-purple-500' },
  { key: 'application_submitted', label: 'Application Submitted', color: 'bg-yellow-500' },
  { key: 'valuation_booked', label: 'Valuation Booked', color: 'bg-orange-500' },
  { key: 'offer_issued', label: 'Offer Issued', color: 'bg-indigo-500' },
  { key: 'completed', label: 'Completed', color: 'bg-green-500' },
  { key: 'lost_case', label: 'Lost Case', color: 'bg-red-500' },
];

const Pipeline = () => {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    advisor_id: '',
    product_type: '',
    lender_name: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [draggedCase, setDraggedCase] = useState(null);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [casesData, usersData] = await Promise.all([
        casesAPI.getAll(filters),
        usersAPI.getAll(),
      ]);
      setCases(casesData.cases || []);
      setUsers(usersData || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load pipeline data');
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e, caseItem) => {
    setDraggedCase(caseItem);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, status) => {
    e.preventDefault();
    if (!draggedCase || draggedCase.status === status) {
      setDraggedCase(null);
      return;
    }

    try {
      await casesAPI.update(draggedCase.case_id, { status });
      toast.success(`Case moved to ${status.replace(/_/g, ' ')}`);
      loadData();
    } catch (error) {
      toast.error('Failed to update case status');
    }
    setDraggedCase(null);
  };

  const formatCurrency = (value) => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getCasesByStatus = (status) => {
    return cases.filter((c) => c.status === status);
  };

  const getColumnTotal = (status) => {
    const columnCases = getCasesByStatus(status);
    return columnCases.reduce((sum, c) => sum + (c.loan_amount || 0), 0);
  };

  const clearFilters = () => {
    setFilters({ advisor_id: '', product_type: '', lender_name: '' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin h-8 w-8 border-4 border-red-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fadeIn" data-testid="pipeline-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Pipeline
          </h1>
          <p className="text-slate-500 mt-1">Drag and drop cases to update their status</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          data-testid="toggle-filters-btn"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Advisor</label>
                <Select
                  value={filters.advisor_id}
                  onValueChange={(value) => setFilters({ ...filters, advisor_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All advisors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All advisors</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.user_id} value={user.user_id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Product Type</label>
                <Select
                  value={filters.product_type}
                  onValueChange={(value) => setFilters({ ...filters, product_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All products" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All products</SelectItem>
                    <SelectItem value="mortgage">Mortgage</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Lender</label>
                <Input
                  value={filters.lender_name}
                  onChange={(e) => setFilters({ ...filters, lender_name: e.target.value })}
                  placeholder="Search lender..."
                />
              </div>
              <div className="flex items-end">
                <Button variant="ghost" onClick={clearFilters} className="text-slate-500">
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {CASE_STATUSES.map((status) => (
            <div
              key={status.key}
              className="w-[300px] flex-shrink-0"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, status.key)}
              data-testid={`column-${status.key}`}
            >
              <div className={`kanban-column ${
                status.key === 'completed' ? 'bg-green-50/50 border-green-200' :
                status.key === 'lost_case' ? 'bg-red-50/50 border-red-200' : ''
              }`}>
                {/* Column Header */}
                <div className="kanban-column-header flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${status.color}`} />
                    <span>{status.label}</span>
                    <Badge variant="secondary" className="ml-1">
                      {getCasesByStatus(status.key).length}
                    </Badge>
                  </div>
                </div>

                {/* Column Total */}
                <div className="px-4 py-2 text-sm text-slate-500 border-b border-slate-200/60">
                  Total: {formatCurrency(getColumnTotal(status.key))}
                </div>

                {/* Column Content */}
                <div className="kanban-column-content">
                  {getCasesByStatus(status.key).length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <p className="text-sm">No cases</p>
                    </div>
                  ) : (
                    getCasesByStatus(status.key).map((caseItem) => (
                      <div
                        key={caseItem.case_id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, caseItem)}
                        className={`kanban-card ${
                          draggedCase?.case_id === caseItem.case_id ? 'opacity-50' : ''
                        }`}
                        onClick={() => navigate(`/cases/${caseItem.case_id}`)}
                        data-testid={`case-card-${caseItem.case_id}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-slate-300 cursor-grab" />
                            <span className="font-medium text-slate-900 truncate max-w-[180px]">
                              {caseItem.client_name}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {caseItem.product_type === 'mortgage' ? 'M' : 'I'}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          {caseItem.lender_name && (
                            <div className="flex items-center gap-2 text-slate-600">
                              <Building2 className="h-3 w-3" />
                              <span className="truncate">{caseItem.lender_name}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-slate-600">
                            <PoundSterling className="h-3 w-3" />
                            <span>{formatCurrency(caseItem.loan_amount)}</span>
                          </div>
                          {caseItem.expected_completion_date && (
                            <div className="flex items-center gap-2 text-slate-500">
                              <Calendar className="h-3 w-3" />
                              <span>{caseItem.expected_completion_date}</span>
                            </div>
                          )}
                          {caseItem.advisor_name && (
                            <div className="flex items-center gap-2 text-slate-500">
                              <User className="h-3 w-3" />
                              <span>{caseItem.advisor_name}</span>
                            </div>
                          )}
                        </div>

                        {caseItem.gross_commission > 0 && (
                          <div className="mt-3 pt-2 border-t border-slate-100">
                            <p className="text-xs text-slate-500">
                              Commission: <span className="font-medium text-slate-700">{formatCurrency(caseItem.gross_commission)}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Pipeline;
