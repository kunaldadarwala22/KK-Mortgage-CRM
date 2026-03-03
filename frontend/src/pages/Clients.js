import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clientsAPI, usersAPI } from '../lib/api';
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import {
  Search, Plus, MoreHorizontal, Eye, Trash2, Phone, Mail, MapPin, Users, Filter, Download, X, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

const LEAD_SOURCES = ['walk_in', 'cold_call', 'referral', 'online', 'other'];
const EMPLOYMENT_TYPES = ['employed', 'self_employed', 'contractor', 'retired', 'unemployed'];

const Clients = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ advisor_id: '', lead_source: '', postcode: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newClient, setNewClient] = useState({
    first_name: '', last_name: '', email: '', phone: '', dob: '',
    current_address: '', postcode: '', security_property_address: '',
    income: '', employment_type: '', deposit: '', property_price: '',
    loan_amount: '', credit_issues: false, credit_issues_notes: '',
    lead_source: '', referral_partner_name: '', fact_find_complete: false,
    vulnerable_customer: false, advice_type: '', advisor_id: '',
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);

  useEffect(() => { loadClients(); loadUsers(); }, [filters]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const params = { ...filters };
      if (search) params.search = search;
      const data = await clientsAPI.getAll(params);
      setClients(data.clients || []);
    } catch (err) {
      console.error('Failed to load clients:', err);
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await usersAPI.getAll();
      setUsers(data || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const handleSearch = () => loadClients();

  const handleAddClient = async () => {
    try {
      const clientData = {
        ...newClient,
        income: newClient.income ? parseFloat(newClient.income) : null,
        deposit: newClient.deposit ? parseFloat(newClient.deposit) : null,
        property_price: newClient.property_price ? parseFloat(newClient.property_price) : null,
        loan_amount: newClient.loan_amount ? parseFloat(newClient.loan_amount) : null,
      };
      await clientsAPI.create(clientData);
      toast.success('Client created successfully');
      setShowAddDialog(false);
      setNewClient({ first_name: '', last_name: '', email: '', phone: '', dob: '', current_address: '', postcode: '', security_property_address: '', income: '', employment_type: '', deposit: '', property_price: '', loan_amount: '', credit_issues: false, credit_issues_notes: '', lead_source: '', referral_partner_name: '', fact_find_complete: false, vulnerable_customer: false, advice_type: '', advisor_id: '' });
      loadClients();
    } catch (err) {
      toast.error(err.message || 'Failed to create client');
    }
  };

  const handleDeleteClient = async () => {
    if (!clientToDelete) return;
    try {
      await clientsAPI.delete(clientToDelete.client_id);
      toast.success('Client deleted');
      setDeleteDialogOpen(false);
      setClientToDelete(null);
      loadClients();
    } catch (err) {
      toast.error(err.message || 'Failed to delete client');
    }
  };

  const handleExportClients = async () => {
    setExporting(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/export/clients`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      let filename = 'KK_Mortgage_Clients_Export.xlsx';
      const cd = response.headers.get('content-disposition');
      if (cd) { const match = cd.match(/filename=(.+)/); if (match) filename = match[1]; }
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Client data exported successfully!');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export client data');
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (v) => v ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0 }).format(v) : '-';
  const formatStatus = (s) => s?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || '-';
  const getStatusColor = (s) => ({
    new_lead: 'bg-blue-100 text-blue-800', fact_find_complete: 'bg-purple-100 text-purple-800',
    application_submitted: 'bg-yellow-100 text-yellow-800', valuation_booked: 'bg-orange-100 text-orange-800',
    offer_issued: 'bg-indigo-100 text-indigo-800', completed: 'bg-green-100 text-green-800',
    lost_case: 'bg-red-100 text-red-800',
  }[s] || 'bg-slate-100 text-slate-800');

  const getRowBg = (client) => {
    if (client.case_status === 'completed') return 'bg-green-50 hover:bg-green-100';
    if (client.case_status === 'lost_case') return 'bg-red-50 hover:bg-red-100';
    if (client.expiring_soon) return 'bg-amber-50 hover:bg-amber-100';
    return 'hover:bg-slate-50';
  };

  const clearFilters = () => setFilters({ advisor_id: '', lead_source: '', postcode: '' });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin h-8 w-8 border-4 border-red-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fadeIn" data-testid="clients-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>Clients</h1>
          <p className="text-slate-500 mt-1">Manage your client database</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportClients} disabled={exporting} data-testid="export-clients-btn">
            {exporting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Exporting...</> : <><Download className="h-4 w-4 mr-2" />Export to Excel</>}
          </Button>
          <Button className="bg-red-600 hover:bg-red-700" onClick={() => setShowAddDialog(true)} data-testid="add-client-btn">
            <Plus className="h-4 w-4 mr-2" />Add Client
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 flex gap-2">
              <Input placeholder="Search clients by name, email, phone..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} className="flex-1" data-testid="client-search-input" />
              <Button onClick={handleSearch}><Search className="h-4 w-4 mr-2" />Search</Button>
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)}><Filter className="h-4 w-4 mr-2" />Filters</Button>
            </div>
          </div>
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Advisor</Label>
                <Select value={filters.advisor_id || 'all'} onValueChange={(v) => setFilters({ ...filters, advisor_id: v === 'all' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="All advisors" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Advisors</SelectItem>
                    {users.map((u) => <SelectItem key={u.user_id} value={u.user_id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Lead Source</Label>
                <Select value={filters.lead_source || 'all'} onValueChange={(v) => setFilters({ ...filters, lead_source: v === 'all' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="All sources" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    {LEAD_SOURCES.map((s) => <SelectItem key={s} value={s}>{formatStatus(s)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Postcode</Label>
                <Input placeholder="e.g. SW1A" value={filters.postcode} onChange={(e) => setFilters({ ...filters, postcode: e.target.value })} />
              </div>
              <div className="flex items-end">
                <Button variant="ghost" onClick={clearFilters} className="text-slate-500"><X className="h-4 w-4 mr-1" />Clear</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Row Legend */}
      <div className="flex gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-200 inline-block" /> Completed</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 inline-block" /> Lost Case</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-200 inline-block" /> Expiring Soon (90 days)</span>
      </div>

      {/* Client Table */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          {clients.length === 0 ? (
            <div className="text-center py-12" data-testid="no-clients-message">
              <Users className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-700 mb-2">No clients found</h3>
              <p className="text-slate-500 mb-4">Get started by adding your first client.</p>
              <Button className="bg-red-600 hover:bg-red-700" onClick={() => setShowAddDialog(true)}><Plus className="h-4 w-4 mr-2" />Add Client</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client Name</TableHead>
                    <TableHead>Security Address</TableHead>
                    <TableHead>Postcode</TableHead>
                    <TableHead>Loan Amount</TableHead>
                    <TableHead>Property Value</TableHead>
                    <TableHead>LTV</TableHead>
                    <TableHead>Case Status</TableHead>
                    <TableHead>Commission Status</TableHead>
                    <TableHead>Completion Date</TableHead>
                    <TableHead>Lead Source</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((c) => (
                    <TableRow key={c.client_id} className={`cursor-pointer transition-colors ${getRowBg(c)}`} onClick={() => navigate(`/clients/${c.client_id}`)} data-testid={`client-row-${c.client_id}`}>
                      <TableCell>
                        <p className="font-medium">{c.first_name} {c.last_name}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          {c.email && <span className="flex items-center gap-0.5"><Mail className="h-3 w-3" />{c.email}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{c.security_property_address || c.current_address ? (c.security_property_address || c.current_address).split(',')[0] : '-'}</TableCell>
                      <TableCell>{c.postcode || '-'}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(c.case_loan_amount || c.loan_amount)}</TableCell>
                      <TableCell>{formatCurrency(c.property_price)}</TableCell>
                      <TableCell>
                        {c.ltv ? (
                          <Badge className={c.ltv > 90 ? 'bg-red-100 text-red-800' : c.ltv > 75 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}>
                            {c.ltv}%
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {c.case_status ? <Badge className={getStatusColor(c.case_status)}>{formatStatus(c.case_status)}</Badge> : '-'}
                      </TableCell>
                      <TableCell>
                        {c.commission_status ? <Badge className={getStatusColor(c.commission_status)}>{formatStatus(c.commission_status)}</Badge> : '-'}
                      </TableCell>
                      <TableCell className="text-sm">{c.expected_completion_date || '-'}</TableCell>
                      <TableCell>
                        {c.lead_source ? <Badge variant="outline" className="text-xs">{formatStatus(c.lead_source)}</Badge> : '-'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/clients/${c.client_id}`); }}>
                              <Eye className="h-4 w-4 mr-2" />View
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); setClientToDelete(c); setDeleteDialogOpen(true); }}>
                              <Trash2 className="h-4 w-4 mr-2" />Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Client Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>Enter the client's details below.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2"><Label>First Name *</Label><Input value={newClient.first_name} onChange={(e) => setNewClient({ ...newClient, first_name: e.target.value })} data-testid="client-first-name" /></div>
            <div className="space-y-2"><Label>Last Name *</Label><Input value={newClient.last_name} onChange={(e) => setNewClient({ ...newClient, last_name: e.target.value })} data-testid="client-last-name" /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} /></div>
            <div className="space-y-2"><Label>Date of Birth</Label><Input type="date" value={newClient.dob} onChange={(e) => setNewClient({ ...newClient, dob: e.target.value })} /></div>
            <div className="space-y-2"><Label>Postcode</Label><Input value={newClient.postcode} onChange={(e) => setNewClient({ ...newClient, postcode: e.target.value })} /></div>
            <div className="col-span-2 space-y-2"><Label>Current Address</Label><Input value={newClient.current_address} onChange={(e) => setNewClient({ ...newClient, current_address: e.target.value })} /></div>
            <div className="col-span-2 space-y-2"><Label>Security Property Address</Label><Input value={newClient.security_property_address} onChange={(e) => setNewClient({ ...newClient, security_property_address: e.target.value })} /></div>
            <div className="space-y-2"><Label>Income</Label><Input type="number" value={newClient.income} onChange={(e) => setNewClient({ ...newClient, income: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Employment Type</Label>
              <Select value={newClient.employment_type || 'none'} onValueChange={(v) => setNewClient({ ...newClient, employment_type: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select...</SelectItem>
                  {EMPLOYMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{formatStatus(t)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Property Price</Label><Input type="number" value={newClient.property_price} onChange={(e) => setNewClient({ ...newClient, property_price: e.target.value })} /></div>
            <div className="space-y-2"><Label>Loan Amount</Label><Input type="number" value={newClient.loan_amount} onChange={(e) => setNewClient({ ...newClient, loan_amount: e.target.value })} /></div>
            <div className="space-y-2"><Label>Deposit</Label><Input type="number" value={newClient.deposit} onChange={(e) => setNewClient({ ...newClient, deposit: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Lead Source</Label>
              <Select value={newClient.lead_source || 'none'} onValueChange={(v) => setNewClient({ ...newClient, lead_source: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select...</SelectItem>
                  {LEAD_SOURCES.map((s) => <SelectItem key={s} value={s}>{formatStatus(s)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {newClient.lead_source === 'referral' && (
              <div className="space-y-2"><Label>Referral Partner</Label><Input value={newClient.referral_partner_name} onChange={(e) => setNewClient({ ...newClient, referral_partner_name: e.target.value })} /></div>
            )}
            <div className="space-y-2">
              <Label>Advisor</Label>
              <Select value={newClient.advisor_id || 'none'} onValueChange={(v) => setNewClient({ ...newClient, advisor_id: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select...</SelectItem>
                  {users.map((u) => <SelectItem key={u.user_id} value={u.user_id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex items-center space-x-2">
              <Checkbox id="credit" checked={newClient.credit_issues} onCheckedChange={(c) => setNewClient({ ...newClient, credit_issues: c })} />
              <Label htmlFor="credit">Credit Issues</Label>
            </div>
            {newClient.credit_issues && (
              <div className="col-span-2 space-y-2"><Label>Credit Issue Notes</Label><Textarea value={newClient.credit_issues_notes} onChange={(e) => setNewClient({ ...newClient, credit_issues_notes: e.target.value })} data-testid="client-credit-notes" /></div>
            )}
            <div className="flex items-center space-x-2">
              <Checkbox id="vulnerable" checked={newClient.vulnerable_customer} onCheckedChange={(c) => setNewClient({ ...newClient, vulnerable_customer: c })} />
              <Label htmlFor="vulnerable">Vulnerable Customer</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleAddClient} disabled={!newClient.first_name || !newClient.last_name} data-testid="save-client-btn">Save Client</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {clientToDelete?.first_name} {clientToDelete?.last_name}? This will also delete all associated cases, documents, and tasks.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteClient} data-testid="confirm-delete-btn">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Clients;
