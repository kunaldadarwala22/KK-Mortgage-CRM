import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clientsAPI, usersAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import {
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Users,
  Filter,
  Download,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

const LEAD_SOURCES = ['walk_in', 'cold_call', 'referral', 'online', 'other'];
const EMPLOYMENT_TYPES = ['employed', 'self_employed', 'contractor', 'retired', 'unemployed'];
const ADVICE_TYPES = ['advised', 'execution_only'];

const Clients = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    advisor_id: '',
    lead_source: '',
    postcode: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newClient, setNewClient] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    dob: '',
    current_address: '',
    postcode: '',
    income: '',
    employment_type: '',
    deposit: '',
    property_price: '',
    loan_amount: '',
    credit_issues: false,
    credit_issues_notes: '',
    lead_source: '',
    referral_partner_name: '',
    fact_find_complete: false,
    vulnerable_customer: false,
    advice_type: '',
    advisor_id: '',
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);

  useEffect(() => {
    loadClients();
    loadUsers();
  }, [filters]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const params = { ...filters };
      if (search) params.search = search;
      const data = await clientsAPI.getAll(params);
      setClients(data.clients || []);
    } catch (error) {
      console.error('Failed to load clients:', error);
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await usersAPI.getAll();
      setUsers(data || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadClients();
  };

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
      setNewClient({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        dob: '',
        current_address: '',
        postcode: '',
        income: '',
        employment_type: '',
        deposit: '',
        property_price: '',
        loan_amount: '',
        credit_issues: false,
        credit_issues_notes: '',
        lead_source: '',
        referral_partner_name: '',
        fact_find_complete: false,
        vulnerable_customer: false,
        advice_type: '',
        advisor_id: '',
      });
      loadClients();
    } catch (error) {
      toast.error(error.message || 'Failed to create client');
    }
  };

  const handleDeleteClient = async () => {
    if (!clientToDelete) return;
    try {
      await clientsAPI.delete(clientToDelete.client_id);
      toast.success('Client deleted successfully');
      setDeleteDialogOpen(false);
      setClientToDelete(null);
      loadClients();
    } catch (error) {
      toast.error(error.message || 'Failed to delete client');
    }
  };

  const formatCurrency = (value) => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getLeadSourceBadge = (source) => {
    const colors = {
      walk_in: 'bg-blue-100 text-blue-800',
      cold_call: 'bg-purple-100 text-purple-800',
      referral: 'bg-green-100 text-green-800',
      online: 'bg-orange-100 text-orange-800',
      other: 'bg-slate-100 text-slate-800',
    };
    return colors[source] || 'bg-slate-100 text-slate-800';
  };

  const formatLeadSource = (source) => {
    return source?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || '-';
  };

  const clearFilters = () => {
    setFilters({ advisor_id: '', lead_source: '', postcode: '' });
    setSearch('');
  };

  return (
    <div className="p-6 space-y-6 animate-fadeIn" data-testid="clients-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Clients
          </h1>
          <p className="text-slate-500 mt-1">Manage your client database</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="bg-red-600 hover:bg-red-700" data-testid="add-client-btn">
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
              <DialogDescription>Enter the client's details below.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input
                  value={newClient.first_name}
                  onChange={(e) => setNewClient({ ...newClient, first_name: e.target.value })}
                  placeholder="John"
                  data-testid="client-first-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input
                  value={newClient.last_name}
                  onChange={(e) => setNewClient({ ...newClient, last_name: e.target.value })}
                  placeholder="Smith"
                  data-testid="client-last-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  placeholder="john@example.com"
                  data-testid="client-email"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  placeholder="07700 900000"
                  data-testid="client-phone"
                />
              </div>
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={newClient.dob}
                  onChange={(e) => setNewClient({ ...newClient, dob: e.target.value })}
                  data-testid="client-dob"
                />
              </div>
              <div className="space-y-2">
                <Label>Postcode</Label>
                <Input
                  value={newClient.postcode}
                  onChange={(e) => setNewClient({ ...newClient, postcode: e.target.value })}
                  placeholder="SW1A 1AA"
                  data-testid="client-postcode"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Current Address</Label>
                <Textarea
                  value={newClient.current_address}
                  onChange={(e) => setNewClient({ ...newClient, current_address: e.target.value })}
                  placeholder="123 Main Street, London"
                  data-testid="client-address"
                />
              </div>
              <div className="space-y-2">
                <Label>Income (£)</Label>
                <Input
                  type="number"
                  value={newClient.income}
                  onChange={(e) => setNewClient({ ...newClient, income: e.target.value })}
                  placeholder="50000"
                  data-testid="client-income"
                />
              </div>
              <div className="space-y-2">
                <Label>Employment Type</Label>
                <Select
                  value={newClient.employment_type}
                  onValueChange={(value) => setNewClient({ ...newClient, employment_type: value })}
                >
                  <SelectTrigger data-testid="client-employment-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYMENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Property Price (£)</Label>
                <Input
                  type="number"
                  value={newClient.property_price}
                  onChange={(e) => setNewClient({ ...newClient, property_price: e.target.value })}
                  placeholder="350000"
                  data-testid="client-property-price"
                />
              </div>
              <div className="space-y-2">
                <Label>Loan Amount (£)</Label>
                <Input
                  type="number"
                  value={newClient.loan_amount}
                  onChange={(e) => setNewClient({ ...newClient, loan_amount: e.target.value })}
                  placeholder="280000"
                  data-testid="client-loan-amount"
                />
              </div>
              <div className="space-y-2">
                <Label>Deposit (£)</Label>
                <Input
                  type="number"
                  value={newClient.deposit}
                  onChange={(e) => setNewClient({ ...newClient, deposit: e.target.value })}
                  placeholder="70000"
                  data-testid="client-deposit"
                />
              </div>
              <div className="space-y-2">
                <Label>Lead Source</Label>
                <Select
                  value={newClient.lead_source}
                  onValueChange={(value) => setNewClient({ ...newClient, lead_source: value })}
                >
                  <SelectTrigger data-testid="client-lead-source">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCES.map((source) => (
                      <SelectItem key={source} value={source}>
                        {formatLeadSource(source)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {newClient.lead_source === 'referral' && (
                <div className="space-y-2">
                  <Label>Referral Partner Name</Label>
                  <Input
                    value={newClient.referral_partner_name}
                    onChange={(e) => setNewClient({ ...newClient, referral_partner_name: e.target.value })}
                    placeholder="Partner name"
                    data-testid="client-referral-partner"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Assigned Advisor</Label>
                <Select
                  value={newClient.advisor_id}
                  onValueChange={(value) => setNewClient({ ...newClient, advisor_id: value })}
                >
                  <SelectTrigger data-testid="client-advisor">
                    <SelectValue placeholder="Select advisor" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.user_id} value={user.user_id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="credit_issues"
                    checked={newClient.credit_issues}
                    onCheckedChange={(checked) => setNewClient({ ...newClient, credit_issues: checked })}
                  />
                  <Label htmlFor="credit_issues">Credit Issues</Label>
                </div>
                {newClient.credit_issues && (
                  <Textarea
                    value={newClient.credit_issues_notes}
                    onChange={(e) => setNewClient({ ...newClient, credit_issues_notes: e.target.value })}
                    placeholder="Describe credit issues..."
                    data-testid="client-credit-notes"
                  />
                )}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="vulnerable"
                    checked={newClient.vulnerable_customer}
                    onCheckedChange={(checked) => setNewClient({ ...newClient, vulnerable_customer: checked })}
                  />
                  <Label htmlFor="vulnerable">Vulnerable Customer</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button 
                className="bg-red-600 hover:bg-red-700"
                onClick={handleAddClient}
                disabled={!newClient.first_name || !newClient.last_name}
                data-testid="save-client-btn"
              >
                Save Client
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="search"
                  placeholder="Search clients by name, email, phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                  data-testid="client-search"
                />
              </div>
              <Button type="submit" variant="secondary">Search</Button>
            </form>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                data-testid="toggle-filters-btn"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Advisor</Label>
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
                <Label>Lead Source</Label>
                <Select
                  value={filters.lead_source}
                  onValueChange={(value) => setFilters({ ...filters, lead_source: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All sources</SelectItem>
                    {LEAD_SOURCES.map((source) => (
                      <SelectItem key={source} value={source}>
                        {formatLeadSource(source)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Postcode</Label>
                <Input
                  value={filters.postcode}
                  onChange={(e) => setFilters({ ...filters, postcode: e.target.value })}
                  placeholder="SW1A"
                />
              </div>
              <div className="col-span-3">
                <Button variant="ghost" onClick={clearFilters} className="text-slate-500">
                  <X className="h-4 w-4 mr-1" />
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin h-8 w-8 border-4 border-red-600 border-t-transparent rounded-full" />
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-700 mb-2">No clients found</h3>
              <p className="text-slate-500 mb-4">Get started by adding your first client.</p>
              <Button className="bg-red-600 hover:bg-red-700" onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Client
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Loan Amount</TableHead>
                  <TableHead>Lead Source</TableHead>
                  <TableHead>Advisor</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow 
                    key={client.client_id} 
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => navigate(`/clients/${client.client_id}`)}
                    data-testid={`client-row-${client.client_id}`}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-900">
                          {client.first_name} {client.last_name}
                        </p>
                        {client.vulnerable_customer && (
                          <Badge variant="outline" className="mt-1 text-orange-600 border-orange-300">
                            Vulnerable
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {client.email && (
                          <div className="flex items-center gap-1 text-sm text-slate-500">
                            <Mail className="h-3 w-3" />
                            {client.email}
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center gap-1 text-sm text-slate-500">
                            <Phone className="h-3 w-3" />
                            {client.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {client.postcode && (
                        <div className="flex items-center gap-1 text-sm text-slate-500">
                          <MapPin className="h-3 w-3" />
                          {client.postcode}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{formatCurrency(client.loan_amount)}</p>
                      {client.ltv && (
                        <p className="text-sm text-slate-500">LTV: {client.ltv}%</p>
                      )}
                    </TableCell>
                    <TableCell>
                      {client.lead_source && (
                        <Badge className={getLeadSourceBadge(client.lead_source)}>
                          {formatLeadSource(client.lead_source)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-slate-600">{client.advisor_name || '-'}</p>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/clients/${client.client_id}`); }}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/clients/${client.client_id}/edit`); }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setClientToDelete(client); 
                              setDeleteDialogOpen(true); 
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {clientToDelete?.first_name} {clientToDelete?.last_name}? 
              This will also delete all associated cases, documents, and tasks. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteClient}
              data-testid="confirm-delete-btn"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Clients;
