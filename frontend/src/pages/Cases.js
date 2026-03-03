import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { casesAPI, clientsAPI, usersAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Search,
  Plus,
  Filter,
  X,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Briefcase,
} from 'lucide-react';
import { toast } from 'sonner';

const CASE_STATUSES = ['new_lead', 'fact_find_complete', 'application_submitted', 'valuation_booked', 'offer_issued', 'completed', 'lost_case'];
const PRODUCT_TYPES = ['mortgage', 'insurance'];
const MORTGAGE_TYPES = ['purchase', 'remortgage', 'remortgage_additional_borrowing', 'product_transfer'];
const INSURANCE_TYPES = ['life_insurance', 'home_insurance', 'buildings_insurance'];

const Cases = () => {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    product_type: '',
    advisor_id: '',
    lender_name: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCase, setNewCase] = useState({
    client_id: '',
    product_type: '',
    mortgage_type: '',
    insurance_type: '',
    lender_name: '',
    loan_amount: '',
    term_years: '',
    interest_rate: '',
    expected_completion_date: '',
    product_expiry_date: '',
    commission_percentage: '',
    gross_commission: '',
    advisor_id: '',
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState(null);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [casesData, clientsData, usersData] = await Promise.all([
        casesAPI.getAll(filters),
        clientsAPI.getAll({ limit: 500 }),
        usersAPI.getAll(),
      ]);
      setCases(casesData.cases || []);
      setClients(clientsData.clients || []);
      setUsers(usersData || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load cases');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCase = async () => {
    try {
      const caseData = {
        ...newCase,
        loan_amount: newCase.loan_amount ? parseFloat(newCase.loan_amount) : null,
        term_years: newCase.term_years ? parseInt(newCase.term_years) : null,
        interest_rate: newCase.interest_rate ? parseFloat(newCase.interest_rate) : null,
        commission_percentage: newCase.commission_percentage ? parseFloat(newCase.commission_percentage) : null,
        gross_commission: newCase.gross_commission ? parseFloat(newCase.gross_commission) : null,
      };
      await casesAPI.create(caseData);
      toast.success('Case created successfully');
      setShowAddDialog(false);
      setNewCase({
        client_id: '',
        product_type: '',
        mortgage_type: '',
        insurance_type: '',
        lender_name: '',
        loan_amount: '',
        term_years: '',
        interest_rate: '',
        expected_completion_date: '',
        product_expiry_date: '',
        commission_percentage: '',
        gross_commission: '',
        advisor_id: '',
      });
      loadData();
    } catch (error) {
      toast.error(error.message || 'Failed to create case');
    }
  };

  const handleDeleteCase = async () => {
    if (!caseToDelete) return;
    try {
      await casesAPI.delete(caseToDelete.case_id);
      toast.success('Case deleted');
      setDeleteDialogOpen(false);
      setCaseToDelete(null);
      loadData();
    } catch (error) {
      toast.error(error.message || 'Failed to delete case');
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

  const formatStatus = (status) => {
    return status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || '-';
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

  const clearFilters = () => {
    setFilters({ status: '', product_type: '', advisor_id: '', lender_name: '' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin h-8 w-8 border-4 border-red-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fadeIn" data-testid="cases-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Cases
          </h1>
          <p className="text-slate-500 mt-1">Manage mortgage and insurance cases</p>
        </div>
        <Button 
          className="bg-red-600 hover:bg-red-700"
          onClick={() => setShowAddDialog(true)}
          data-testid="add-case-btn"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Case
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Search by lender..."
                value={filters.lender_name}
                onChange={(e) => setFilters({ ...filters, lender_name: e.target.value })}
                className="max-w-xs"
              />
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters({ ...filters, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    {CASE_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>{formatStatus(status)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Product Type</Label>
                <Select
                  value={filters.product_type}
                  onValueChange={(value) => setFilters({ ...filters, product_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All products" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All products</SelectItem>
                    {PRODUCT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{formatStatus(type)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                      <SelectItem key={user.user_id} value={user.user_id}>{user.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="ghost" onClick={clearFilters} className="text-slate-500">
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cases Table */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          {cases.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-700 mb-2">No cases found</h3>
              <p className="text-slate-500 mb-4">Get started by creating your first case.</p>
              <Button className="bg-red-600 hover:bg-red-700" onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Case
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Lender</TableHead>
                  <TableHead>Loan Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Advisor</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.map((caseItem) => (
                  <TableRow 
                    key={caseItem.case_id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => navigate(`/cases/${caseItem.case_id}`)}
                  >
                    <TableCell>
                      <p className="font-medium">{caseItem.client_name}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{formatStatus(caseItem.product_type)}</Badge>
                      {caseItem.mortgage_type && (
                        <p className="text-xs text-slate-500 mt-1">{formatStatus(caseItem.mortgage_type)}</p>
                      )}
                    </TableCell>
                    <TableCell>{caseItem.lender_name || '-'}</TableCell>
                    <TableCell>{formatCurrency(caseItem.loan_amount)}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(caseItem.status)}>
                        {formatStatus(caseItem.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(caseItem.gross_commission)}</TableCell>
                    <TableCell>{caseItem.advisor_name || '-'}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/cases/${caseItem.case_id}`); }}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setCaseToDelete(caseItem); 
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

      {/* Add Case Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Case</DialogTitle>
            <DialogDescription>Create a new mortgage or insurance case.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Client *</Label>
              <Select
                value={newCase.client_id}
                onValueChange={(value) => setNewCase({ ...newCase, client_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.client_id} value={client.client_id}>
                      {client.first_name} {client.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Product Type *</Label>
              <Select
                value={newCase.product_type}
                onValueChange={(value) => setNewCase({ ...newCase, product_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{formatStatus(type)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {newCase.product_type === 'mortgage' && (
              <div className="space-y-2">
                <Label>Mortgage Type</Label>
                <Select
                  value={newCase.mortgage_type}
                  onValueChange={(value) => setNewCase({ ...newCase, mortgage_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {MORTGAGE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{formatStatus(type)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {newCase.product_type === 'insurance' && (
              <div className="space-y-2">
                <Label>Insurance Type</Label>
                <Select
                  value={newCase.insurance_type}
                  onValueChange={(value) => setNewCase({ ...newCase, insurance_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {INSURANCE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{formatStatus(type)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Lender Name</Label>
              <Input
                value={newCase.lender_name}
                onChange={(e) => setNewCase({ ...newCase, lender_name: e.target.value })}
                placeholder="Halifax, Nationwide..."
              />
            </div>
            <div className="space-y-2">
              <Label>Loan Amount (£)</Label>
              <Input
                type="number"
                value={newCase.loan_amount}
                onChange={(e) => setNewCase({ ...newCase, loan_amount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Term (years)</Label>
              <Input
                type="number"
                value={newCase.term_years}
                onChange={(e) => setNewCase({ ...newCase, term_years: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Interest Rate (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={newCase.interest_rate}
                onChange={(e) => setNewCase({ ...newCase, interest_rate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Expected Completion</Label>
              <Input
                type="date"
                value={newCase.expected_completion_date}
                onChange={(e) => setNewCase({ ...newCase, expected_completion_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Product Expiry Date</Label>
              <Input
                type="date"
                value={newCase.product_expiry_date}
                onChange={(e) => setNewCase({ ...newCase, product_expiry_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Commission %</Label>
              <Input
                type="number"
                step="0.01"
                value={newCase.commission_percentage}
                onChange={(e) => setNewCase({ ...newCase, commission_percentage: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Gross Commission (£)</Label>
              <Input
                type="number"
                value={newCase.gross_commission}
                onChange={(e) => setNewCase({ ...newCase, gross_commission: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Assigned Advisor</Label>
              <Select
                value={newCase.advisor_id}
                onValueChange={(value) => setNewCase({ ...newCase, advisor_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select advisor" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>{user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button 
              className="bg-red-600 hover:bg-red-700"
              onClick={handleAddCase}
              disabled={!newCase.client_id || !newCase.product_type}
            >
              Create Case
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Case</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this case? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteCase}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Cases;
