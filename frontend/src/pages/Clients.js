import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { clientsAPI } from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
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
  Search, Plus, MoreHorizontal, Eye, Trash2, Mail, Users, Filter, Download, X, Loader2, UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';

const LEAD_SOURCES = ['walk_in', 'cold_call', 'referral', 'online', 'other'];
const EMPLOYMENT_TYPES = ['employed', 'self_employed', 'contractor', 'retired', 'unemployed'];

const CurrencyInput = ({ value, onChange, ...props }) => {
  const [display, setDisplay] = React.useState(value || '');
  const [focused, setFocused] = React.useState(false);

  React.useEffect(() => {
    if (!focused) {
      setDisplay(value || '');
    }
  }, [value, focused]);

  const formatForDisplay = (v) => {
    const num = parseFloat(v);
    if (isNaN(num) || !v) return v;
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0 }).format(num);
  };

  return (
    <Input
      {...props}
      type={focused ? 'number' : 'text'}
      value={focused ? display : (display ? formatForDisplay(display) : '')}
      onChange={(e) => { setDisplay(e.target.value); onChange(e); }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
};

const Clients = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ lead_source: '', postcode: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newClient, setNewClient] = useState({
    first_name: '', last_name: '', email: '', phone: '', dob: '',
    current_address: '', postcode: '',
    income: '', employment_type: '',
    credit_issues: false, credit_issues_notes: '',
    lead_source: '', referral_partner_name: '', fact_find_complete: false,
    vulnerable_customer: false, advice_type: '',
    additional_applicants: [],
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);

  useEffect(() => {
    if (location.state?.openAddDialog) {
      setShowAddDialog(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => { loadClients(); }, [filters]);

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

  const handleSearch = () => loadClients();

  const handleAddClient = async () => {
    try {
      const clientData = {
        ...newClient,
        income: newClient.income ? parseFloat(newClient.income) : null,
      };
      await clientsAPI.create(clientData);
      toast.success('Client created successfully');
      setShowAddDialog(false);
      setNewClient({ first_name: '', last_name: '', email: '', phone: '', dob: '', current_address: '', postcode: '', income: '', employment_type: '', credit_issues: false, credit_issues_notes: '', lead_source: '', referral_partner_name: '', fact_find_complete: false, vulnerable_customer: false, advice_type: '', additional_applicants: [] });
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
      toast.error('Failed to export client data');
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '-';
    const parts = d.split('T')[0].split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return d;
  };
  const formatStatus = (s) => s?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || '-';

  const getRowBg = (client) => {
    if (client.case_status === 'completed') return 'bg-green-50 hover:bg-green-100';
    if (client.case_status === 'lost_case') return 'bg-red-50 hover:bg-red-100';
    if (client.expiring_soon) return 'bg-amber-50 hover:bg-amber-100';
    return 'hover:bg-slate-50';
  };

  const clearFilters = () => setFilters({ lead_source: '', postcode: '' });

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
            <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
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
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-200 inline-block" /> Expiring Soon</span>
      </div>

      {/* Client Table - Only client info, no case metrics */}
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
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Postcode</TableHead>
                    <TableHead>Income</TableHead>
                    <TableHead>Employment</TableHead>
                    <TableHead>Lead Source</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((c) => (
                    <TableRow key={c.client_id} className={`cursor-pointer transition-colors ${getRowBg(c)}`} onClick={() => navigate(`/clients/${c.client_id}`)} data-testid={`client-row-${c.client_id}`}>
                      <TableCell>
                        <p className="font-medium">{c.first_name} {c.last_name}</p>
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.email ? <span className="flex items-center gap-1"><Mail className="h-3 w-3 text-slate-400" />{c.email}</span> : '-'}
                      </TableCell>
                      <TableCell className="text-sm">{c.phone || '-'}</TableCell>
                      <TableCell>{c.postcode || '-'}</TableCell>
                      <TableCell className="font-medium">
                        {c.income ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0 }).format(c.income) : '-'}
                      </TableCell>
                      <TableCell>
                        {c.employment_type ? <Badge variant="outline" className="text-xs">{formatStatus(c.employment_type)}</Badge> : '-'}
                      </TableCell>
                      <TableCell>
                        {c.lead_source ? <Badge variant="outline" className="text-xs">{formatStatus(c.lead_source)}</Badge> : '-'}
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(c.created_at)}</TableCell>
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

      {/* Add Client Dialog - Removed: Security Address, Property Price, Loan Amount, Deposit */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>Enter the client's details below.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2"><Label>First Name *</Label><Input value={newClient.first_name} onChange={(e) => setNewClient({ ...newClient, first_name: e.target.value })} data-testid="client-first-name" /></div>
            <div className="space-y-2"><Label>Last Name *</Label><Input value={newClient.last_name} onChange={(e) => setNewClient({ ...newClient, last_name: e.target.value })} data-testid="client-last-name" /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} data-testid="client-email" /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} data-testid="client-phone" /></div>
            <div className="space-y-2"><Label>Date of Birth</Label><Input type="date" value={newClient.dob} onChange={(e) => setNewClient({ ...newClient, dob: e.target.value })} data-testid="client-dob" /></div>
            <div className="space-y-2"><Label>Postcode</Label><Input value={newClient.postcode} onChange={(e) => setNewClient({ ...newClient, postcode: e.target.value })} data-testid="client-postcode" /></div>
            <div className="col-span-2 space-y-2"><Label>Current Address</Label><Input value={newClient.current_address} onChange={(e) => setNewClient({ ...newClient, current_address: e.target.value })} data-testid="client-address" /></div>
            <div className="space-y-2"><Label>Income</Label><CurrencyInput value={newClient.income} onChange={(e) => setNewClient({ ...newClient, income: e.target.value })} data-testid="client-income" /></div>
            <div className="space-y-2">
              <Label>Employment Type</Label>
              <Select value={newClient.employment_type || 'none'} onValueChange={(v) => setNewClient({ ...newClient, employment_type: v === 'none' ? '' : v })}>
                <SelectTrigger data-testid="client-employment"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select...</SelectItem>
                  {EMPLOYMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{formatStatus(t)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Lead Source</Label>
              <Select value={newClient.lead_source || 'none'} onValueChange={(v) => setNewClient({ ...newClient, lead_source: v === 'none' ? '' : v })}>
                <SelectTrigger data-testid="client-lead-source"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select...</SelectItem>
                  {LEAD_SOURCES.map((s) => <SelectItem key={s} value={s}>{formatStatus(s)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {newClient.lead_source === 'referral' && (
              <div className="space-y-2"><Label>Referral Partner</Label><Input value={newClient.referral_partner_name} onChange={(e) => setNewClient({ ...newClient, referral_partner_name: e.target.value })} /></div>
            )}
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

            {/* Additional Applicants */}
            <div className="col-span-2 border-t border-slate-200 pt-4 mt-2">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">Additional Applicants</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setNewClient({ ...newClient, additional_applicants: [...newClient.additional_applicants, { full_name: '', dob: '', email: '', phone: '' }] })}
                  data-testid="add-applicant-in-form-btn"
                >
                  <UserPlus className="h-4 w-4 mr-2" />Add Additional Applicant
                </Button>
              </div>
              {newClient.additional_applicants.map((ap, idx) => (
                <div key={idx} className="p-3 mb-3 bg-slate-50 border border-slate-200 rounded-lg" data-testid={`new-applicant-${idx}`}>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-xs">Applicant {idx + 2}</Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-600 h-7"
                      onClick={() => {
                        const updated = [...newClient.additional_applicants];
                        updated.splice(idx, 1);
                        setNewClient({ ...newClient, additional_applicants: updated });
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />Remove
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><Label className="text-xs">Full Name *</Label><Input value={ap.full_name} onChange={(e) => { const u = [...newClient.additional_applicants]; u[idx] = { ...u[idx], full_name: e.target.value }; setNewClient({ ...newClient, additional_applicants: u }); }} data-testid={`new-applicant-name-${idx}`} /></div>
                    <div className="space-y-1"><Label className="text-xs">Date of Birth</Label><Input type="date" value={ap.dob} onChange={(e) => { const u = [...newClient.additional_applicants]; u[idx] = { ...u[idx], dob: e.target.value }; setNewClient({ ...newClient, additional_applicants: u }); }} /></div>
                    <div className="space-y-1"><Label className="text-xs">Email</Label><Input type="email" value={ap.email} onChange={(e) => { const u = [...newClient.additional_applicants]; u[idx] = { ...u[idx], email: e.target.value }; setNewClient({ ...newClient, additional_applicants: u }); }} /></div>
                    <div className="space-y-1"><Label className="text-xs">Phone</Label><Input value={ap.phone} onChange={(e) => { const u = [...newClient.additional_applicants]; u[idx] = { ...u[idx], phone: e.target.value }; setNewClient({ ...newClient, additional_applicants: u }); }} /></div>
                  </div>
                </div>
              ))}
              {newClient.additional_applicants.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-2">No additional applicants. Click the button above for joint applications.</p>
              )}
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
