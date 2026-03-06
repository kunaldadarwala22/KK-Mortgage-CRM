import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { casesAPI, clientsAPI, tasksAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
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
import { Checkbox } from '../components/ui/checkbox';
import {
  ArrowLeft,
  Edit,
  Save,
  X,
  Plus,
  Briefcase,
  User,
  Building2,
  PoundSterling,
  Calendar,
  Percent,
  FileText,
  CheckSquare,
  Clock,
  AlertCircle,
  TrendingUp,
  Home,
  Shield,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

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

const PRODUCT_TYPES = [
  { key: 'mortgage', label: 'Mortgage', icon: Home },
  { key: 'insurance', label: 'Insurance', icon: Shield },
];

const MORTGAGE_TYPES = [
  { key: 'purchase', label: 'Purchase' },
  { key: 'remortgage', label: 'Remortgage' },
  { key: 'remortgage_additional_borrowing', label: 'Remortgage + Additional Borrowing' },
  { key: 'product_transfer', label: 'Product Transfer' },
];

const INSURANCE_TYPES = [
  { key: 'life_insurance', label: 'Life Insurance' },
  { key: 'home_insurance', label: 'Home Insurance' },
  { key: 'buildings_insurance', label: 'Buildings Insurance' },
];

const COMMISSION_STATUSES = [
  { key: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { key: 'submitted_to_lender', label: 'Submitted to Lender', color: 'bg-blue-100 text-blue-800' },
  { key: 'paid', label: 'Paid', color: 'bg-green-100 text-green-800' },
  { key: 'clawed_back', label: 'Clawed Back', color: 'bg-red-100 text-red-800' },
];

const CaseDetail = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [client, setClient] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedCase, setEditedCase] = useState(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    due_date: '',
    priority: 'medium',
  });

  useEffect(() => {
    loadData();
  }, [caseId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [caseResponse, tasksResponse] = await Promise.all([
        casesAPI.get(caseId),
        tasksAPI.getAll({ case_id: caseId }),
      ]);
      
      setCaseData(caseResponse);
      setEditedCase(caseResponse);
      setTasks(tasksResponse.tasks || []);
      
      // Load client data
      if (caseResponse.client_id) {
        const clientResponse = await clientsAPI.get(caseResponse.client_id);
        setClient(clientResponse);
      }
    } catch (error) {
      console.error('Failed to load case data:', error);
      toast.error('Failed to load case data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCase = async () => {
    try {
      const procFee = editedCase.proc_fee_total ? parseFloat(editedCase.proc_fee_total) : null;
      const commPct = editedCase.commission_percentage ? parseFloat(editedCase.commission_percentage) : null;
      const grossComm = (procFee && commPct) ? Math.round((procFee * commPct / 100) * 100) / 100 : null;

      const updateData = {
        ...editedCase,
        loan_amount: editedCase.loan_amount ? parseFloat(editedCase.loan_amount) : null,
        term_years: editedCase.term_years ? parseInt(editedCase.term_years) : null,
        fixed_rate_period: editedCase.fixed_rate_period ? parseInt(editedCase.fixed_rate_period) : null,
        interest_rate: editedCase.interest_rate ? parseFloat(editedCase.interest_rate) : null,
        proc_fee_total: procFee,
        commission_percentage: commPct,
        gross_commission: grossComm,
      };
      
      await casesAPI.update(caseId, updateData);
      setCaseData(editedCase);
      setEditing(false);
      toast.success('Case updated successfully');
      loadData();
    } catch (error) {
      toast.error(error.message || 'Failed to update case');
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await casesAPI.update(caseId, { status: newStatus });
      setCaseData({ ...caseData, status: newStatus });
      setEditedCase({ ...editedCase, status: newStatus });
      toast.success(`Status updated to ${formatStatus(newStatus)}`);
      loadData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleCommissionStatusChange = async (newStatus) => {
    try {
      await casesAPI.update(caseId, { commission_status: newStatus });
      setCaseData({ ...caseData, commission_status: newStatus });
      setEditedCase({ ...editedCase, commission_status: newStatus });
      toast.success('Commission status updated');
    } catch (error) {
      toast.error('Failed to update commission status');
    }
  };

  const handleAddTask = async () => {
    try {
      await tasksAPI.create({
        ...newTask,
        case_id: caseId,
        client_id: caseData.client_id,
      });
      toast.success('Task created successfully');
      setShowTaskDialog(false);
      setNewTask({ title: '', description: '', due_date: '', priority: 'medium' });
      loadData();
    } catch (error) {
      toast.error(error.message || 'Failed to create task');
    }
  };

  const handleToggleTask = async (task) => {
    try {
      await tasksAPI.update(task.task_id, { completed: !task.completed });
      loadData();
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const handleDeleteCase = async () => {
    try {
      await casesAPI.delete(caseId);
      toast.success('Case deleted successfully');
      navigate('/cases');
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

  const formatDate = (d) => {
    if (!d) return '-';
    const parts = d.split('T')[0].split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return d;
  };

  const getStatusColor = (status) => {
    const found = CASE_STATUSES.find(s => s.key === status);
    return found ? found.color : 'bg-slate-100 text-slate-800';
  };

  const getCommissionStatusColor = (status) => {
    const found = COMMISSION_STATUSES.find(s => s.key === status);
    return found ? found.color : 'bg-slate-100 text-slate-800';
  };

  const calculateMonthlyPayment = () => {
    if (!caseData?.loan_amount || !caseData?.interest_rate || !caseData?.term_years) return null;
    const principal = caseData.loan_amount;
    const monthlyRate = caseData.interest_rate / 100 / 12;
    const numPayments = caseData.term_years * 12;
    const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
    return payment;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin h-8 w-8 border-4 border-red-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">Case not found</p>
        <Button variant="outline" onClick={() => navigate('/cases')} className="mt-4">
          Back to Cases
        </Button>
      </div>
    );
  }

  const monthlyPayment = calculateMonthlyPayment();

  return (
    <div className="p-6 space-y-6 animate-fadeIn" data-testid="case-detail-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/cases')} data-testid="back-btn">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                {caseData.client_name || 'Case Details'}
              </h1>
              <Badge className={getStatusColor(caseData.status)}>
                {formatStatus(caseData.status)}
              </Badge>
            </div>
            <p className="text-slate-500 mt-1">
              {formatStatus(caseData.product_type)} • {caseData.lender_name || 'No lender'} • {caseData.case_id}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => { setEditing(false); setEditedCase(caseData); }}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button className="bg-red-600 hover:bg-red-700" onClick={handleSaveCase} data-testid="save-case-btn">
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setShowDeleteDialog(true)} className="text-red-600 hover:text-red-700">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <Button variant="outline" onClick={() => setEditing(true)} data-testid="edit-case-btn">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Quick Status Change */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-600">Update Status:</span>
              <div className="flex gap-2 flex-wrap">
                {CASE_STATUSES.map((status) => (
                  <Button
                    key={status.key}
                    variant={caseData.status === status.key ? "default" : "outline"}
                    size="sm"
                    className={caseData.status === status.key ? "bg-red-600 hover:bg-red-700" : ""}
                    onClick={() => handleStatusChange(status.key)}
                    data-testid={`status-btn-${status.key}`}
                  >
                    {status.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="details" data-testid="tab-details">Case Details</TabsTrigger>
          <TabsTrigger value="commission" data-testid="tab-commission">Commission</TabsTrigger>
          <TabsTrigger value="dates" data-testid="tab-dates">Dates & Timeline</TabsTrigger>
          <TabsTrigger value="tasks" data-testid="tab-tasks">Tasks ({tasks.length})</TabsTrigger>
        </TabsList>

        {/* Case Details Tab */}
        <TabsContent value="details" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Product Information */}
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-slate-500" />
                  Product Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editing ? (
                  <>
                    <div className="space-y-2">
                      <Label>Product Type</Label>
                      <Select
                        value={editedCase.product_type}
                        onValueChange={(value) => setEditedCase({ ...editedCase, product_type: value, mortgage_type: '', insurance_type: '' })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRODUCT_TYPES.map((type) => (
                            <SelectItem key={type.key} value={type.key}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {editedCase.product_type === 'mortgage' && (
                      <div className="space-y-2">
                        <Label>Mortgage Type</Label>
                        <Select
                          value={editedCase.mortgage_type || ''}
                          onValueChange={(value) => setEditedCase({ ...editedCase, mortgage_type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {MORTGAGE_TYPES.map((type) => (
                              <SelectItem key={type.key} value={type.key}>{type.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {editedCase.product_type === 'insurance' && (
                      <div className="space-y-2">
                        <Label>Insurance Type</Label>
                        <Select
                          value={editedCase.insurance_type || ''}
                          onValueChange={(value) => setEditedCase({ ...editedCase, insurance_type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {INSURANCE_TYPES.map((type) => (
                              <SelectItem key={type.key} value={type.key}>{type.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Lender Name</Label>
                      <Input
                        value={editedCase.lender_name || ''}
                        onChange={(e) => setEditedCase({ ...editedCase, lender_name: e.target.value })}
                        placeholder="Halifax, Nationwide, etc."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Case Reference Number</Label>
                      <Input
                        value={editedCase.case_reference || ''}
                        onChange={(e) => setEditedCase({ ...editedCase, case_reference: e.target.value })}
                        placeholder="REF-12345"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Account Manager</Label>
                      <Input value="Kunal Kapadia" disabled className="bg-slate-50" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-slate-500">Product Type</p>
                        <p className="font-medium">{formatStatus(caseData.product_type)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">
                          {caseData.product_type === 'mortgage' ? 'Mortgage Type' : 'Insurance Type'}
                        </p>
                        <p className="font-medium">
                          {formatStatus(caseData.mortgage_type || caseData.insurance_type)}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Lender</p>
                      <p className="font-medium flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        {caseData.lender_name || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Case Reference Number</p>
                      <p className="font-medium">{caseData.case_reference || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Account Manager</p>
                      <p className="font-medium flex items-center gap-2">
                        <User className="h-4 w-4 text-slate-400" />
                        Kunal Kapadia
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Loan Details */}
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PoundSterling className="h-5 w-5 text-slate-500" />
                  Loan Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editing ? (
                  <>
                    <div className="space-y-2">
                      <Label>Loan Amount (£)</Label>
                      <Input
                        type="number"
                        value={editedCase.loan_amount || ''}
                        onChange={(e) => setEditedCase({ ...editedCase, loan_amount: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Term (years)</Label>
                        <Input
                          type="number"
                          value={editedCase.term_years || ''}
                          onChange={(e) => setEditedCase({ ...editedCase, term_years: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Fixed Rate Period (years)</Label>
                        <Input
                          type="number"
                          value={editedCase.fixed_rate_period || ''}
                          onChange={(e) => setEditedCase({ ...editedCase, fixed_rate_period: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Interest Rate (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={editedCase.interest_rate || ''}
                        onChange={(e) => setEditedCase({ ...editedCase, interest_rate: e.target.value })}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-sm text-slate-500">Loan Amount</p>
                      <p className="text-2xl font-bold text-slate-900">{formatCurrency(caseData.loan_amount)}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-slate-500">Term</p>
                        <p className="font-medium">{caseData.term_years ? `${caseData.term_years} years` : '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Fixed Period</p>
                        <p className="font-medium">{caseData.fixed_rate_period ? `${caseData.fixed_rate_period} years` : '-'}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Interest Rate</p>
                      <p className="font-medium">{caseData.interest_rate ? `${caseData.interest_rate}%` : '-'}</p>
                    </div>
                    {monthlyPayment && (
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-700">Estimated Monthly Payment</p>
                        <p className="text-xl font-bold text-green-800">{formatCurrency(monthlyPayment)}</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Client Information */}
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-slate-500" />
                  Client Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {client ? (
                  <div className="space-y-4">
                    <div 
                      className="p-4 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => navigate(`/clients/${client.client_id}`)}
                    >
                      <p className="font-medium text-lg">{client.first_name} {client.last_name}</p>
                      <p className="text-sm text-slate-500">{client.email}</p>
                      <p className="text-sm text-slate-500">{client.phone}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-slate-500">Property Price</p>
                        <p className="font-medium">{formatCurrency(client.property_price)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">LTV</p>
                        <p className="font-medium">{client.ltv ? `${client.ltv}%` : '-'}</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => navigate(`/clients/${client.client_id}`)}
                    >
                      View Full Client Profile
                    </Button>
                  </div>
                ) : (
                  <p className="text-slate-500">No client linked</p>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-slate-500" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {editing ? (
                  <Textarea
                    value={editedCase.notes || ''}
                    onChange={(e) => setEditedCase({ ...editedCase, notes: e.target.value })}
                    placeholder="Add any notes about this case..."
                    rows={5}
                  />
                ) : (
                  <p className="text-slate-600 whitespace-pre-wrap">
                    {caseData.notes || 'No notes added'}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Commission Tab */}
        <TabsContent value="commission" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PoundSterling className="h-5 w-5 text-slate-500" />
                  Proc Fee & Commission
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editing ? (
                  <>
                    <div className="space-y-2">
                      <Label>Proc Fee (£) — Amount paid by lender</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 500"
                        value={editedCase.proc_fee_total || ''}
                        onChange={(e) => setEditedCase({ ...editedCase, proc_fee_total: e.target.value })}
                        data-testid="proc-fee-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Your Commission Percentage (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 35"
                        value={editedCase.commission_percentage || ''}
                        onChange={(e) => setEditedCase({ ...editedCase, commission_percentage: e.target.value })}
                        data-testid="commission-pct-input"
                      />
                    </div>
                    {editedCase.proc_fee_total && editedCase.commission_percentage && (
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-sm text-green-700">Your Commission (auto-calculated)</p>
                        <p className="text-2xl font-bold text-green-800">
                          {formatCurrency(Math.round((parseFloat(editedCase.proc_fee_total) * parseFloat(editedCase.commission_percentage) / 100) * 100) / 100)}
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                          {formatCurrency(editedCase.proc_fee_total)} × {editedCase.commission_percentage}%
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-sm text-slate-500">Proc Fee (from lender)</p>
                      <p className="text-2xl font-bold text-blue-600">{formatCurrency(caseData.proc_fee_total)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Your Commission Rate</p>
                      <p className="font-medium">{caseData.commission_percentage ? `${caseData.commission_percentage}%` : '-'}</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm text-green-700">Your Commission</p>
                      <p className="text-2xl font-bold text-green-800">{formatCurrency(caseData.gross_commission)}</p>
                      {caseData.proc_fee_total && caseData.commission_percentage && (
                        <p className="text-xs text-green-600 mt-1">
                          {formatCurrency(caseData.proc_fee_total)} × {caseData.commission_percentage}%
                        </p>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 lg:col-span-2">
              <CardHeader>
                <CardTitle>Commission Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-slate-600">Current Status:</span>
                  <Badge className={getCommissionStatusColor(caseData.commission_status)}>
                    {COMMISSION_STATUSES.find(s => s.key === caseData.commission_status)?.label || caseData.commission_status}
                  </Badge>
                </div>
                <div className="flex gap-2 mt-4 flex-wrap">
                  {COMMISSION_STATUSES.map((status) => (
                    <Button
                      key={status.key}
                      variant={caseData.commission_status === status.key ? "default" : "outline"}
                      size="sm"
                      className={caseData.commission_status === status.key ? "bg-red-600 hover:bg-red-700" : ""}
                      onClick={() => handleCommissionStatusChange(status.key)}
                      data-testid={`commission-status-btn-${status.key}`}
                    >
                      {status.label}
                    </Button>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <Label className="text-sm font-medium text-slate-600">Commission Paid Date</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <Input
                      type="date"
                      className="w-48"
                      max="9999-12-31"
                      defaultValue={caseData.commission_paid_date || ''}
                      onBlur={async (e) => {
                        const val = e.target.value;
                        if (val !== (caseData.commission_paid_date || '')) {
                          try {
                            await casesAPI.update(caseId, { commission_paid_date: val || null });
                            setCaseData({ ...caseData, commission_paid_date: val });
                            setEditedCase({ ...editedCase, commission_paid_date: val });
                            toast.success('Commission paid date updated');
                          } catch (err) { toast.error('Failed to update date'); }
                        }
                      }}
                      data-testid="commission-paid-date"
                    />
                    {caseData.commission_paid_date && (
                      <span className="text-sm text-green-600 font-medium">Paid: {formatDate(caseData.commission_paid_date)}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Dates Tab */}
        <TabsContent value="dates" className="mt-6">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-slate-500" />
                Important Dates
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Application Submitted</Label>
                    <Input type="date" max="9999-12-31" value={editedCase.date_application_submitted || ''} onChange={(e) => setEditedCase({ ...editedCase, date_application_submitted: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Expected Completion</Label>
                    <Input type="date" max="9999-12-31" value={editedCase.expected_completion_date || ''} onChange={(e) => setEditedCase({ ...editedCase, expected_completion_date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Product Start Date</Label>
                    <Input type="date" max="9999-12-31" value={editedCase.product_start_date || ''} onChange={(e) => setEditedCase({ ...editedCase, product_start_date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Product Review Date</Label>
                    <Input type="date" max="9999-12-31" value={editedCase.product_review_date || ''} onChange={(e) => setEditedCase({ ...editedCase, product_review_date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Product Expiry Date</Label>
                    <Input type="date" max="9999-12-31" value={editedCase.product_expiry_date || ''} onChange={(e) => setEditedCase({ ...editedCase, product_expiry_date: e.target.value })} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-500 mb-1">Application Submitted</p>
                    <p className="font-medium text-lg">{formatDate(caseData.date_application_submitted)}</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600 mb-1">Expected Completion</p>
                    <p className="font-medium text-lg">{formatDate(caseData.expected_completion_date)}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600 mb-1">Product Start Date</p>
                    <p className="font-medium text-lg">{formatDate(caseData.product_start_date)}</p>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-yellow-600 mb-1">Product Review Date</p>
                    <p className="font-medium text-lg">{formatDate(caseData.product_review_date)}</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-600 mb-1">Product Expiry Date</p>
                    <p className="font-medium text-lg">{formatDate(caseData.product_expiry_date)}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-500 mb-1">Case Created</p>
                    <p className="font-medium text-lg">{formatDate(caseData.created_at)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="mt-6">
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-slate-500" />
                Case Tasks
              </CardTitle>
              <Button className="bg-red-600 hover:bg-red-700" onClick={() => setShowTaskDialog(true)} data-testid="add-task-btn">
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <div className="text-center py-8">
                  <CheckSquare className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">No tasks for this case</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div
                      key={task.task_id}
                      className={`flex items-center justify-between p-4 border rounded-lg ${
                        task.completed ? 'bg-slate-50 border-slate-200' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={task.completed}
                          onCheckedChange={() => handleToggleTask(task)}
                        />
                        <div className={task.completed ? 'line-through text-slate-400' : ''}>
                          <p className="font-medium">{task.title}</p>
                          <p className="text-sm text-slate-500">
                            Due: {task.due_date} • {task.assigned_to_name || 'Unassigned'}
                          </p>
                        </div>
                      </div>
                      <Badge className={
                        task.priority === 'high' ? 'bg-red-100 text-red-800' :
                        task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }>
                        {task.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Task Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
            <DialogDescription>Create a new task for this case.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="Task title"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Task description..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Due Date *</Label>
                <Input
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={newTask.priority}
                  onValueChange={(value) => setNewTask({ ...newTask, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Assigned To</Label>
              <Input value="Kunal Kapadia" disabled className="bg-slate-50" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskDialog(false)}>Cancel</Button>
            <Button 
              className="bg-red-600 hover:bg-red-700"
              onClick={handleAddTask}
              disabled={!newTask.title || !newTask.due_date}
            >
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Case</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this case? This will also delete all associated tasks. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteCase}>
              Delete Case
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CaseDetail;
