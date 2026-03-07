import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { casesAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Search, Plus, Eye, Briefcase, Home, Shield, Filter, X, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { LenderAutocomplete } from '../components/LenderAutocomplete';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CASE_STATUSES = [
  { key: 'new_lead', label: 'New Lead', color: 'bg-blue-100 text-blue-800' },
  { key: 'fact_find_complete', label: 'Fact Find Complete', color: 'bg-purple-100 text-purple-800' },
  { key: 'application_submitted', label: 'Application Submitted', color: 'bg-yellow-100 text-yellow-800' },
  { key: 'valuation_booked', label: 'Valuation Booked', color: 'bg-orange-100 text-orange-800' },
  { key: 'offer_issued', label: 'Offer Issued', color: 'bg-indigo-100 text-indigo-800' },
  { key: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' },
  { key: 'lost_case', label: 'Lost Case', color: 'bg-red-100 text-red-800' },
  { key: 'review_due', label: 'Review Due', color: 'bg-amber-100 text-amber-800' },
  { key: 'for_review', label: 'For Review', color: 'bg-amber-100 text-amber-800' },
];

const MORTGAGE_TYPES = [
  { key: 'purchase', label: 'Purchase' },
  { key: 'remortgage', label: 'Remortgage' },
  { key: 'remortgage_additional_borrowing', label: 'Remortgage + Additional Borrowing' },
  { key: 'product_transfer', label: 'Product Transfer' },
];

const INSURANCE_TYPES = [
  { key: 'life_insurance', label: 'Life Insurance' },
  { key: 'buildings_insurance', label: 'Buildings Insurance' },
  { key: 'home_insurance', label: 'Home Insurance' },
];

const INSURANCE_COVER_TYPES = [
  { key: 'level_term', label: 'Level Term' },
  { key: 'decreasing_term', label: 'Decreasing Term' },
  { key: 'increasing_term', label: 'Increasing Term' },
  { key: 'whole_of_life', label: 'Whole of Life' },
];

const REPAYMENT_TYPES = [
  { key: 'interest_only', label: 'Interest Only' },
  { key: 'repayment', label: 'Repayment' },
];

const PROPERTY_TYPES = [
  { key: 'residential', label: 'Residential' },
  { key: 'buy_to_let', label: 'Buy To Let' },
];

const INTEREST_RATE_TYPES = [
  { key: 'fixed', label: 'Fixed' },
  { key: 'variable', label: 'Variable' },
  { key: 'discounted', label: 'Discounted' },
  { key: 'tracker', label: 'Tracker' },
  { key: 'capped', label: 'Capped' },
];

const formatStatus = (s) => s?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || '-';
const formatCurrency = (v) => v ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0 }).format(v) : '-';
const formatDate = (d) => {
  if (!d) return '-';
  const parts = d.split('T')[0].split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return d;
};
const getStatusColor = (s) => CASE_STATUSES.find(st => st.key === s)?.color || 'bg-slate-100 text-slate-800';

// Currency input: show raw number when focused, formatted £ when blurred
const CurrencyInput = ({ value, onChange, ...props }) => {
  const [display, setDisplay] = React.useState(value || '');
  const [focused, setFocused] = React.useState(false);

  React.useEffect(() => {
    if (!focused) setDisplay(value || '');
  }, [value, focused]);

  const fmtDisplay = (v) => {
    const num = parseFloat(v);
    if (isNaN(num) || !v) return v;
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0 }).format(num);
  };

  return (
    <Input
      {...props}
      type={focused ? 'number' : 'text'}
      value={focused ? display : (display ? fmtDisplay(display) : '')}
      onChange={(e) => { setDisplay(e.target.value); onChange(e); }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
};

// Clean empty strings to null for Pydantic compatibility
const cleanData = (obj) => {
  const cleaned = {};
  for (const [k, v] of Object.entries(obj)) {
    cleaned[k] = (v === '' || v === undefined) ? null : v;
  }
  return cleaned;
};

const Cases = () => {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ status: '', product_type: '', commission_status: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('mortgage');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState(null);

  // New case form
  const [newCase, setNewCase] = useState({ product_type: 'mortgage', client_id: '', mortgage_type: '', insurance_type: '', status: 'new_lead' });
  const [clientSearch, setClientSearch] = useState('');
  const [clientResults, setClientResults] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const clientSearchRef = useRef(null);

  useEffect(() => { loadCases(); }, [filters]); // eslint-disable-line

  const loadCases = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.product_type) params.product_type = filters.product_type;
      if (filters.commission_status) params.commission_status = filters.commission_status;
      if (search) params.search = search;
      const data = await casesAPI.getAll(params);
      setCases(data.cases || []);
    } catch (err) {
      toast.error('Failed to load cases');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => loadCases();

  // Client search for new case form
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/clients/search?q=${encodeURIComponent(clientSearch)}`, {
          headers: { 'Authorization': `Bearer ${token}` },
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setClientResults(data);
          if (clientSearch.length > 0) setClientDropdownOpen(true);
        }
      } catch (err) { console.error(err); }
    }, 300);
    return () => clearTimeout(timer);
  }, [clientSearch]);

  useEffect(() => {
    const handleClick = (e) => {
      if (clientSearchRef.current && !clientSearchRef.current.contains(e.target)) setClientDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    setNewCase({ ...newCase, client_id: client.client_id });
    setClientSearch(`${client.first_name} ${client.last_name}`);
    setClientDropdownOpen(false);
  };

  const handleCreateCase = async () => {
    try {
      const caseData = cleanData({ ...newCase });
      // Parse numeric fields
      ['loan_amount', 'property_value', 'interest_rate', 'monthly_premium', 'sum_assured', 'proc_fee_total', 'commission_percentage', 'proc_fee_value', 'client_fee'].forEach(f => {
        if (caseData[f] !== null && caseData[f] !== undefined) caseData[f] = parseFloat(caseData[f]);
        else caseData[f] = null;
      });
      ['term_years', 'fixed_rate_period', 'initial_product_term'].forEach(f => {
        if (caseData[f] !== null && caseData[f] !== undefined) caseData[f] = parseInt(caseData[f]);
        else caseData[f] = null;
      });
      // Auto-calculate commission
      if (caseData.proc_fee_total && caseData.commission_percentage) {
        caseData.gross_commission = Math.round((caseData.proc_fee_total * caseData.commission_percentage / 100) * 100) / 100;
      }
      // Clean NaN values
      for (const k of Object.keys(caseData)) {
        if (typeof caseData[k] === 'number' && isNaN(caseData[k])) caseData[k] = null;
      }

      await casesAPI.create(caseData);
      toast.success('Case created successfully');
      setShowAddDialog(false);
      resetNewCase();
      loadCases();
    } catch (err) {
      toast.error(err.message || 'Failed to create case');
    }
  };

  const handleDeleteCase = async () => {
    if (!caseToDelete) return;
    try {
      await casesAPI.delete(caseToDelete.case_id);
      toast.success('Case deleted');
      setDeleteDialogOpen(false);
      setCaseToDelete(null);
      loadCases();
    } catch (err) {
      toast.error(err.message || 'Failed to delete case');
    }
  };

  const resetNewCase = () => {
    setNewCase({ product_type: 'mortgage', client_id: '', mortgage_type: '', insurance_type: '', status: 'new_lead' });
    setClientSearch('');
    setSelectedClient(null);
  };

  const mortgageCases = cases.filter(c => c.product_type === 'mortgage');
  const insuranceCases = cases.filter(c => c.product_type === 'insurance');

  const clearFilters = () => setFilters({ status: '', product_type: '', commission_status: '' });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin h-8 w-8 border-4 border-red-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fadeIn" data-testid="cases-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>Cases</h1>
          <p className="text-slate-500 mt-1">Manage mortgage and insurance cases</p>
        </div>
        <Button className="bg-red-600 hover:bg-red-700" onClick={() => setShowAddDialog(true)} data-testid="add-case-btn">
          <Plus className="h-4 w-4 mr-2" />New Case
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 flex gap-2">
              <Input placeholder="Search by client name..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} className="flex-1" data-testid="case-search-input" />
              <Button onClick={handleSearch}><Search className="h-4 w-4 mr-2" />Search</Button>
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)}><Filter className="h-4 w-4 mr-2" />Filters</Button>
            </div>
          </div>
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filters.status || 'all'} onValueChange={(v) => setFilters({ ...filters, status: v === 'all' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {CASE_STATUSES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Commission Status</Label>
                <Select value={filters.commission_status || 'all'} onValueChange={(v) => setFilters({ ...filters, commission_status: v === 'all' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="submitted_to_lender">Submitted</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="clawed_back">Clawed Back</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="ghost" onClick={clearFilters} className="text-slate-500"><X className="h-4 w-4 mr-1" />Clear</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs: Mortgage / Insurance */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="mortgage" className="flex items-center gap-2" data-testid="mortgage-tab">
            <Home className="h-4 w-4" />Mortgage ({mortgageCases.length})
          </TabsTrigger>
          <TabsTrigger value="insurance" className="flex items-center gap-2" data-testid="insurance-tab">
            <Shield className="h-4 w-4" />Insurance ({insuranceCases.length})
          </TabsTrigger>
        </TabsList>

        {/* Mortgage Cases */}
        <TabsContent value="mortgage">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg"><Home className="h-5 w-5 text-red-600" />Mortgage Cases</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {mortgageCases.length === 0 ? (
                <div className="text-center py-12 text-slate-500">No mortgage cases found</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Lender</TableHead>
                        <TableHead>Loan Amount</TableHead>
                        <TableHead>Property Value</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Commission</TableHead>
                        <TableHead>Expiry</TableHead>
                        <TableHead className="w-[80px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mortgageCases.map((c) => (
                        <TableRow key={c.case_id} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate(`/cases/${c.case_id}`)} data-testid={`case-row-${c.case_id}`}>
                          <TableCell className="font-medium">{c.client_name || '-'}</TableCell>
                          <TableCell>{formatStatus(c.mortgage_type)}</TableCell>
                          <TableCell>{c.lender_name || '-'}</TableCell>
                          <TableCell>{formatCurrency(c.loan_amount)}</TableCell>
                          <TableCell>{formatCurrency(c.property_value)}</TableCell>
                          <TableCell><Badge className={getStatusColor(c.status)}>{formatStatus(c.status)}</Badge></TableCell>
                          <TableCell>{formatCurrency(c.gross_commission)}</TableCell>
                          <TableCell className="text-sm">{formatDate(c.product_expiry_date)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" onClick={() => navigate(`/cases/${c.case_id}`)} data-testid={`view-case-${c.case_id}`}><Eye className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => { setCaseToDelete(c); setDeleteDialogOpen(true); }} data-testid={`delete-case-${c.case_id}`}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insurance Cases */}
        <TabsContent value="insurance">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg"><Shield className="h-5 w-5 text-blue-600" />Insurance Cases</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {insuranceCases.length === 0 ? (
                <div className="text-center py-12 text-slate-500">No insurance cases found</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Insurance Type</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Cover Type</TableHead>
                        <TableHead>Monthly Premium</TableHead>
                        <TableHead>Sum Assured</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Commission</TableHead>
                        <TableHead className="w-[80px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {insuranceCases.map((c) => (
                        <TableRow key={c.case_id} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate(`/cases/${c.case_id}`)} data-testid={`case-row-${c.case_id}`}>
                          <TableCell className="font-medium">{c.client_name || '-'}</TableCell>
                          <TableCell>{formatStatus(c.insurance_type)}</TableCell>
                          <TableCell>{c.insurance_provider || c.lender_name || '-'}</TableCell>
                          <TableCell>{formatStatus(c.insurance_cover_type)}</TableCell>
                          <TableCell>{formatCurrency(c.monthly_premium)}</TableCell>
                          <TableCell>{formatCurrency(c.sum_assured)}</TableCell>
                          <TableCell><Badge className={getStatusColor(c.status)}>{formatStatus(c.status)}</Badge></TableCell>
                          <TableCell>{formatCurrency(c.gross_commission)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" onClick={() => navigate(`/cases/${c.case_id}`)}><Eye className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => { setCaseToDelete(c); setDeleteDialogOpen(true); }} data-testid={`delete-case-ins-${c.case_id}`}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Case Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Case</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this case ({caseToDelete?.case_id})? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteCase} data-testid="confirm-delete-case-btn">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Case Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetNewCase(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Case</DialogTitle>
            <DialogDescription>Add a new mortgage or insurance case.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Client Search */}
            <div className="space-y-2" ref={clientSearchRef}>
              <Label>Client *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search client by name or email..."
                  className="pl-10"
                  value={clientSearch}
                  onChange={(e) => { setClientSearch(e.target.value); setSelectedClient(null); setNewCase({ ...newCase, client_id: '' }); }}
                  onFocus={() => { if (clientResults.length) setClientDropdownOpen(true); }}
                  data-testid="case-client-search"
                />
                {clientDropdownOpen && clientResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {clientResults.map((c) => (
                      <button key={c.client_id} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm" data-testid={`client-option-${c.client_id}`} onClick={() => handleSelectClient(c)}>
                        <span className="font-medium">{c.first_name} {c.last_name}</span>
                        {c.email && <span className="text-slate-500 ml-2">({c.email})</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedClient && <p className="text-sm text-green-600">Selected: {selectedClient.first_name} {selectedClient.last_name}</p>}
            </div>

            {/* Product Type Toggle */}
            <div className="space-y-2">
              <Label>Case Type *</Label>
              <div className="flex gap-2">
                <Button type="button" variant={newCase.product_type === 'mortgage' ? 'default' : 'outline'} className={newCase.product_type === 'mortgage' ? 'bg-red-600 hover:bg-red-700' : ''} onClick={() => setNewCase({ ...newCase, product_type: 'mortgage' })} data-testid="case-type-mortgage"><Home className="h-4 w-4 mr-2" />Mortgage</Button>
                <Button type="button" variant={newCase.product_type === 'insurance' ? 'default' : 'outline'} className={newCase.product_type === 'insurance' ? 'bg-blue-600 hover:bg-blue-700' : ''} onClick={() => setNewCase({ ...newCase, product_type: 'insurance' })} data-testid="case-type-insurance"><Shield className="h-4 w-4 mr-2" />Insurance</Button>
              </div>
            </div>

            {/* Mortgage Fields */}
            {newCase.product_type === 'mortgage' && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border">
                <h3 className="col-span-2 font-semibold text-slate-700 flex items-center gap-2"><Home className="h-4 w-4" />Mortgage Details</h3>
                <div className="space-y-2">
                  <Label>Mortgage Type</Label>
                  <Select value={newCase.mortgage_type || 'none'} onValueChange={(v) => setNewCase({ ...newCase, mortgage_type: v === 'none' ? '' : v })}>
                    <SelectTrigger data-testid="case-mortgage-type"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent><SelectItem value="none">Select...</SelectItem>{MORTGAGE_TYPES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Lender Name</Label><LenderAutocomplete value={newCase.lender_name || ''} onChange={(e) => setNewCase({ ...newCase, lender_name: e.target.value })} data-testid="case-lender" /></div>
                <div className="space-y-2"><Label>Loan Amount (£)</Label><CurrencyInput value={newCase.loan_amount || ''} onChange={(e) => setNewCase({ ...newCase, loan_amount: e.target.value })} data-testid="case-loan-amount" /></div>
                <div className="space-y-2"><Label>Property Value (£)</Label><CurrencyInput value={newCase.property_value || ''} onChange={(e) => setNewCase({ ...newCase, property_value: e.target.value })} data-testid="case-property-value" /></div>
                <div className="space-y-2"><Label>Interest Rate (%)</Label><Input type="number" step="0.01" value={newCase.interest_rate || ''} onChange={(e) => setNewCase({ ...newCase, interest_rate: e.target.value })} data-testid="case-interest-rate" /></div>
                <div className="space-y-2">
                  <Label>Interest Rate Type</Label>
                  <Select value={newCase.interest_rate_type || 'none'} onValueChange={(v) => setNewCase({ ...newCase, interest_rate_type: v === 'none' ? '' : v })}>
                    <SelectTrigger data-testid="case-interest-rate-type"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent><SelectItem value="none">Select...</SelectItem>{INTEREST_RATE_TYPES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Initial Product Term (Years)</Label><Input type="number" value={newCase.initial_product_term || ''} onChange={(e) => setNewCase({ ...newCase, initial_product_term: e.target.value })} data-testid="case-initial-product-term" /></div>
                <div className="space-y-2"><Label>Term (Years)</Label><Input type="number" value={newCase.term_years || ''} onChange={(e) => setNewCase({ ...newCase, term_years: e.target.value })} data-testid="case-term" /></div>
                <div className="space-y-2"><Label>Deposit Source</Label><Input value={newCase.deposit_source || ''} onChange={(e) => setNewCase({ ...newCase, deposit_source: e.target.value })} data-testid="case-deposit-source" /></div>
                <div className="space-y-2">
                  <Label>Repayment Type</Label>
                  <Select value={newCase.repayment_type || 'none'} onValueChange={(v) => setNewCase({ ...newCase, repayment_type: v === 'none' ? '' : v })}>
                    <SelectTrigger data-testid="case-repayment-type"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent><SelectItem value="none">Select...</SelectItem>{REPAYMENT_TYPES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Property Type</Label>
                  <Select value={newCase.property_type || 'none'} onValueChange={(v) => setNewCase({ ...newCase, property_type: v === 'none' ? '' : v })}>
                    <SelectTrigger data-testid="case-property-type"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent><SelectItem value="none">Select...</SelectItem>{PROPERTY_TYPES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Case Reference Number</Label><Input value={newCase.case_reference || ''} onChange={(e) => setNewCase({ ...newCase, case_reference: e.target.value })} data-testid="case-reference" /></div>
                <div className="col-span-2 grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Security Property Address</Label><Input value={newCase.security_address || ''} onChange={(e) => setNewCase({ ...newCase, security_address: e.target.value })} placeholder="Property address" data-testid="case-security-address" /></div>
                  <div className="space-y-2"><Label>Security Post Code</Label><Input value={newCase.security_postcode || ''} onChange={(e) => setNewCase({ ...newCase, security_postcode: e.target.value })} placeholder="e.g. SW1A 1AA" data-testid="case-security-postcode" /></div>
                </div>
              </div>
            )}

            {/* Insurance Fields */}
            {newCase.product_type === 'insurance' && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="col-span-2 font-semibold text-slate-700 flex items-center gap-2"><Shield className="h-4 w-4" />Insurance Details</h3>
                <div className="space-y-2">
                  <Label>Insurance Type</Label>
                  <Select value={newCase.insurance_type || 'none'} onValueChange={(v) => setNewCase({ ...newCase, insurance_type: v === 'none' ? '' : v })}>
                    <SelectTrigger data-testid="case-insurance-type"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent><SelectItem value="none">Select...</SelectItem>{INSURANCE_TYPES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Term (Years)</Label><Input type="number" value={newCase.term_years || ''} onChange={(e) => setNewCase({ ...newCase, term_years: e.target.value })} data-testid="case-insurance-term" /></div>
                <div className="space-y-2"><Label>Provider</Label><Input value={newCase.insurance_provider || ''} onChange={(e) => setNewCase({ ...newCase, insurance_provider: e.target.value })} data-testid="case-insurance-provider" /></div>
                <div className="space-y-2">
                  <Label>Type of Cover</Label>
                  <Select value={newCase.insurance_cover_type || 'none'} onValueChange={(v) => setNewCase({ ...newCase, insurance_cover_type: v === 'none' ? '' : v })}>
                    <SelectTrigger data-testid="case-cover-type"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent><SelectItem value="none">Select...</SelectItem>{INSURANCE_COVER_TYPES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Reference Number</Label><Input value={newCase.insurance_reference || ''} onChange={(e) => setNewCase({ ...newCase, insurance_reference: e.target.value })} data-testid="case-insurance-ref" /></div>
                <div className="space-y-2"><Label>Monthly Premium (£)</Label><CurrencyInput value={newCase.monthly_premium || ''} onChange={(e) => setNewCase({ ...newCase, monthly_premium: e.target.value })} data-testid="case-monthly-premium" /></div>
                <div className="space-y-2">
                  <Label>Guaranteed or Reviewable</Label>
                  <Select value={newCase.guaranteed_or_reviewable || 'none'} onValueChange={(v) => setNewCase({ ...newCase, guaranteed_or_reviewable: v === 'none' ? '' : v })}>
                    <SelectTrigger data-testid="case-guaranteed"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent><SelectItem value="none">Select...</SelectItem><SelectItem value="guaranteed">Guaranteed</SelectItem><SelectItem value="reviewable">Reviewable</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Sum Assured (£)</Label><CurrencyInput value={newCase.sum_assured || ''} onChange={(e) => setNewCase({ ...newCase, sum_assured: e.target.value })} data-testid="case-sum-assured" /></div>
                <div className="space-y-2">
                  <Label>In Trust</Label>
                  <Select value={newCase.in_trust === true ? 'yes' : newCase.in_trust === false ? 'no' : 'none'} onValueChange={(v) => setNewCase({ ...newCase, in_trust: v === 'yes' ? true : v === 'no' ? false : null })}>
                    <SelectTrigger data-testid="case-in-trust"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent><SelectItem value="none">Select...</SelectItem><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Application Date</Label><Input type="date" max="9999-12-31" value={newCase.date_application_submitted || ''} onChange={(e) => setNewCase({ ...newCase, date_application_submitted: e.target.value })} /></div>
              <div className="space-y-2"><Label>Expected Completion</Label><Input type="date" max="9999-12-31" value={newCase.expected_completion_date || ''} onChange={(e) => setNewCase({ ...newCase, expected_completion_date: e.target.value })} /></div>
              <div className="space-y-2"><Label>Product Start Date</Label><Input type="date" max="9999-12-31" value={newCase.product_start_date || ''} onChange={(e) => setNewCase({ ...newCase, product_start_date: e.target.value })} /></div>
              <div className="space-y-2"><Label>Product Expiry Date</Label><Input type="date" max="9999-12-31" value={newCase.product_expiry_date || ''} onChange={(e) => setNewCase({ ...newCase, product_expiry_date: e.target.value })} /></div>
            </div>

            {/* Commission */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="col-span-2 font-semibold text-slate-700">Commission</h3>
              <div className="space-y-2"><Label>Proc Fee Total (£)</Label><CurrencyInput value={newCase.proc_fee_total || ''} onChange={(e) => setNewCase({ ...newCase, proc_fee_total: e.target.value })} data-testid="case-proc-fee" /></div>
              <div className="space-y-2"><Label>Commission Percentage (%)</Label><Input type="number" step="0.01" value={newCase.commission_percentage || ''} onChange={(e) => setNewCase({ ...newCase, commission_percentage: e.target.value })} data-testid="case-commission-pct" /></div>
              {newCase.proc_fee_total && newCase.commission_percentage && (
                <div className="col-span-2 text-sm text-green-700 font-medium">
                  Calculated Commission: {formatCurrency(Math.round((parseFloat(newCase.proc_fee_total) * parseFloat(newCase.commission_percentage) / 100) * 100) / 100)}
                </div>
              )}
              <div className="space-y-2"><Label>Client Fee (£)</Label><CurrencyInput value={newCase.client_fee || ''} onChange={(e) => setNewCase({ ...newCase, client_fee: e.target.value })} data-testid="case-client-fee" /></div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={newCase.status || 'new_lead'} onValueChange={(v) => setNewCase({ ...newCase, status: v })}>
                <SelectTrigger data-testid="case-status"><SelectValue /></SelectTrigger>
                <SelectContent>{CASE_STATUSES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetNewCase(); }}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleCreateCase} disabled={!newCase.client_id || !newCase.product_type} data-testid="save-case-btn">Create Case</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Cases;
