import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { clientsAPI, casesAPI, documentsAPI, tasksAPI, usersAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
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
import {
  ArrowLeft,
  Edit,
  Save,
  X,
  Plus,
  FileText,
  Briefcase,
  CheckSquare,
  Phone,
  Mail,
  MapPin,
  Calendar,
  PoundSterling,
  User,
  Building2,
  AlertTriangle,
  Upload,
  Trash2,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';

const DOCUMENT_TYPES = ['id', 'proof_of_income', 'bank_statements', 'esis', 'illustration', 'suitability_letter', 'insurance_policy'];
const PRODUCT_TYPES = ['mortgage', 'insurance'];
const MORTGAGE_TYPES = ['purchase', 'remortgage', 'remortgage_additional_borrowing', 'product_transfer'];
const INSURANCE_TYPES = ['life_insurance', 'home_insurance', 'buildings_insurance'];
const COMMISSION_STATUSES = ['pending', 'submitted_to_lender', 'paid', 'clawed_back'];
const CASE_STATUSES = ['new_lead', 'fact_find_complete', 'application_submitted', 'valuation_booked', 'offer_issued', 'completed', 'lost_case'];

const ClientDetail = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [cases, setCases] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedClient, setEditedClient] = useState(null);
  
  // Dialog states
  const [showCaseDialog, setShowCaseDialog] = useState(false);
  const [showDocDialog, setShowDocDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  
  // New case form
  const [newCase, setNewCase] = useState({
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
    proc_fee_type: 'percentage',
    proc_fee_value: '',
    advisor_id: '',
  });
  
  // New document form
  const [newDoc, setNewDoc] = useState({
    document_type: '',
    file: null,
    notes: '',
  });
  
  // New task form
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    due_date: '',
    priority: 'medium',
    assigned_to: '',
  });

  useEffect(() => {
    loadData();
  }, [clientId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [clientData, casesData, docsData, tasksData, usersData] = await Promise.all([
        clientsAPI.get(clientId),
        casesAPI.getAll({ client_id: clientId }),
        documentsAPI.getAll({ client_id: clientId }),
        tasksAPI.getAll({ client_id: clientId }),
        usersAPI.getAll(),
      ]);
      
      setClient(clientData);
      setEditedClient(clientData);
      setCases(casesData.cases || []);
      setDocuments(docsData || []);
      setTasks(tasksData.tasks || []);
      setUsers(usersData || []);
    } catch (error) {
      console.error('Failed to load client data:', error);
      toast.error('Failed to load client data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClient = async () => {
    try {
      await clientsAPI.update(clientId, editedClient);
      setClient(editedClient);
      setEditing(false);
      toast.success('Client updated successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to update client');
    }
  };

  const handleAddCase = async () => {
    try {
      const caseData = {
        client_id: clientId,
        ...newCase,
        loan_amount: newCase.loan_amount ? parseFloat(newCase.loan_amount) : null,
        term_years: newCase.term_years ? parseInt(newCase.term_years) : null,
        interest_rate: newCase.interest_rate ? parseFloat(newCase.interest_rate) : null,
        commission_percentage: newCase.commission_percentage ? parseFloat(newCase.commission_percentage) : null,
        gross_commission: newCase.gross_commission ? parseFloat(newCase.gross_commission) : null,
        proc_fee_value: newCase.proc_fee_value ? parseFloat(newCase.proc_fee_value) : null,
      };
      await casesAPI.create(caseData);
      toast.success('Case created successfully');
      setShowCaseDialog(false);
      setNewCase({
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
        proc_fee_type: 'percentage',
        proc_fee_value: '',
        advisor_id: '',
      });
      loadData();
    } catch (error) {
      toast.error(error.message || 'Failed to create case');
    }
  };

  const handleAddDocument = async () => {
    if (!newDoc.file) {
      toast.error('Please select a file');
      return;
    }
    
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result.split(',')[1];
        await documentsAPI.create({
          client_id: clientId,
          document_type: newDoc.document_type,
          file_name: newDoc.file.name,
          file_data: base64,
          notes: newDoc.notes,
        });
        toast.success('Document uploaded successfully');
        setShowDocDialog(false);
        setNewDoc({ document_type: '', file: null, notes: '' });
        loadData();
      };
      reader.readAsDataURL(newDoc.file);
    } catch (error) {
      toast.error(error.message || 'Failed to upload document');
    }
  };

  const handleAddTask = async () => {
    try {
      await tasksAPI.create({
        client_id: clientId,
        ...newTask,
      });
      toast.success('Task created successfully');
      setShowTaskDialog(false);
      setNewTask({ title: '', description: '', due_date: '', priority: 'medium', assigned_to: '' });
      loadData();
    } catch (error) {
      toast.error(error.message || 'Failed to create task');
    }
  };

  const handleDeleteDocument = async (docId) => {
    try {
      await documentsAPI.delete(docId);
      toast.success('Document deleted');
      loadData();
    } catch (error) {
      toast.error(error.message || 'Failed to delete document');
    }
  };

  const handleToggleTask = async (task) => {
    try {
      await tasksAPI.update(task.task_id, { completed: !task.completed });
      loadData();
    } catch (error) {
      toast.error(error.message || 'Failed to update task');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin h-8 w-8 border-4 border-red-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">Client not found</p>
        <Button variant="outline" onClick={() => navigate('/clients')} className="mt-4">
          Back to Clients
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fadeIn" data-testid="client-detail-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/clients')} data-testid="back-btn">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
              {client.first_name} {client.last_name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              {client.vulnerable_customer && (
                <Badge className="bg-orange-100 text-orange-800">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Vulnerable Customer
                </Badge>
              )}
              {client.fact_find_complete && (
                <Badge className="bg-green-100 text-green-800">Fact Find Complete</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => { setEditing(false); setEditedClient(client); }}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button className="bg-red-600 hover:bg-red-700" onClick={handleSaveClient} data-testid="save-client-btn">
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setEditing(true)} data-testid="edit-client-btn">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="details" data-testid="tab-details">Details</TabsTrigger>
          <TabsTrigger value="cases" data-testid="tab-cases">Cases ({cases.length})</TabsTrigger>
          <TabsTrigger value="documents" data-testid="tab-documents">Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="tasks" data-testid="tab-tasks">Tasks ({tasks.length})</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personal Information */}
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-slate-500" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editing ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>First Name</Label>
                        <Input
                          value={editedClient.first_name || ''}
                          onChange={(e) => setEditedClient({ ...editedClient, first_name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Last Name</Label>
                        <Input
                          value={editedClient.last_name || ''}
                          onChange={(e) => setEditedClient({ ...editedClient, last_name: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={editedClient.email || ''}
                        onChange={(e) => setEditedClient({ ...editedClient, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        value={editedClient.phone || ''}
                        onChange={(e) => setEditedClient({ ...editedClient, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Date of Birth</Label>
                      <Input
                        type="date"
                        value={editedClient.dob || ''}
                        onChange={(e) => setEditedClient({ ...editedClient, dob: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Postcode</Label>
                      <Input
                        value={editedClient.postcode || ''}
                        onChange={(e) => setEditedClient({ ...editedClient, postcode: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Current Address</Label>
                      <Textarea
                        value={editedClient.current_address || ''}
                        onChange={(e) => setEditedClient({ ...editedClient, current_address: e.target.value })}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-slate-500">Full Name</p>
                        <p className="font-medium">{client.first_name} {client.last_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Date of Birth</p>
                        <p className="font-medium">{client.dob || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-slate-400" />
                      <span>{client.email || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <span>{client.phone || '-'}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                      <div>
                        <p>{client.current_address || '-'}</p>
                        <p className="text-sm text-slate-500">{client.postcode}</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Financial Information */}
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PoundSterling className="h-5 w-5 text-slate-500" />
                  Financial Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editing ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Income (£)</Label>
                        <Input
                          type="number"
                          value={editedClient.income || ''}
                          onChange={(e) => setEditedClient({ ...editedClient, income: parseFloat(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Employment Type</Label>
                        <Select
                          value={editedClient.employment_type || ''}
                          onValueChange={(value) => setEditedClient({ ...editedClient, employment_type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="employed">Employed</SelectItem>
                            <SelectItem value="self_employed">Self Employed</SelectItem>
                            <SelectItem value="contractor">Contractor</SelectItem>
                            <SelectItem value="retired">Retired</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Property Price (£)</Label>
                        <Input
                          type="number"
                          value={editedClient.property_price || ''}
                          onChange={(e) => setEditedClient({ ...editedClient, property_price: parseFloat(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Loan Amount (£)</Label>
                        <Input
                          type="number"
                          value={editedClient.loan_amount || ''}
                          onChange={(e) => setEditedClient({ ...editedClient, loan_amount: parseFloat(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Deposit (£)</Label>
                      <Input
                        type="number"
                        value={editedClient.deposit || ''}
                        onChange={(e) => setEditedClient({ ...editedClient, deposit: parseFloat(e.target.value) })}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-slate-500">Income</p>
                        <p className="font-medium">{formatCurrency(client.income)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Employment</p>
                        <p className="font-medium">{formatStatus(client.employment_type)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-slate-500">Property Price</p>
                        <p className="font-medium">{formatCurrency(client.property_price)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Loan Amount</p>
                        <p className="font-medium">{formatCurrency(client.loan_amount)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-slate-500">Deposit</p>
                        <p className="font-medium">{formatCurrency(client.deposit)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">LTV</p>
                        <p className="font-medium">{client.ltv ? `${client.ltv}%` : '-'}</p>
                      </div>
                    </div>
                    {client.credit_issues && (
                      <div className="p-3 bg-red-50 rounded-lg">
                        <p className="text-sm font-medium text-red-800">Credit Issues</p>
                        <p className="text-sm text-red-600">{client.credit_issues_notes || 'No details'}</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Compliance Information */}
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-slate-500" />
                  Compliance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editing ? (
                  <>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="fact_find"
                        checked={editedClient.fact_find_complete}
                        onCheckedChange={(checked) => setEditedClient({ ...editedClient, fact_find_complete: checked })}
                      />
                      <Label htmlFor="fact_find">Fact Find Complete</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="vulnerable"
                        checked={editedClient.vulnerable_customer}
                        onCheckedChange={(checked) => setEditedClient({ ...editedClient, vulnerable_customer: checked })}
                      />
                      <Label htmlFor="vulnerable">Vulnerable Customer</Label>
                    </div>
                    <div className="space-y-2">
                      <Label>Advice Type</Label>
                      <Select
                        value={editedClient.advice_type || ''}
                        onValueChange={(value) => setEditedClient({ ...editedClient, advice_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="advised">Advised</SelectItem>
                          <SelectItem value="execution_only">Execution Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>GDPR Consent Date</Label>
                      <Input
                        type="date"
                        value={editedClient.gdpr_consent_date || ''}
                        onChange={(e) => setEditedClient({ ...editedClient, gdpr_consent_date: e.target.value })}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${client.fact_find_complete ? 'bg-green-500' : 'bg-slate-300'}`} />
                      <span>Fact Find Complete</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${client.vulnerable_customer ? 'bg-orange-500' : 'bg-slate-300'}`} />
                      <span>Vulnerable Customer</span>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Advice Type</p>
                      <p className="font-medium">{formatStatus(client.advice_type)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">GDPR Consent Date</p>
                      <p className="font-medium">{client.gdpr_consent_date || '-'}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Lead Source */}
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-slate-500" />
                  Lead Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-slate-500">Lead Source</p>
                  <p className="font-medium">{formatStatus(client.lead_source)}</p>
                </div>
                {client.referral_partner_name && (
                  <div>
                    <p className="text-sm text-slate-500">Referral Partner</p>
                    <p className="font-medium">{client.referral_partner_name}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-slate-500">Assigned Advisor</p>
                  <p className="font-medium">{client.advisor_name || '-'}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Cases Tab */}
        <TabsContent value="cases" className="mt-6">
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Cases</CardTitle>
              <Button className="bg-red-600 hover:bg-red-700" onClick={() => setShowCaseDialog(true)} data-testid="add-case-btn">
                <Plus className="h-4 w-4 mr-2" />
                Add Case
              </Button>
            </CardHeader>
            <CardContent>
              {cases.length === 0 ? (
                <div className="text-center py-8">
                  <Briefcase className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">No cases yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cases.map((c) => (
                    <div
                      key={c.case_id}
                      className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/cases/${c.case_id}`)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge className={getStatusColor(c.status)}>
                          {formatStatus(c.status)}
                        </Badge>
                        <Badge variant="outline">
                          {formatStatus(c.product_type)}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500">Lender</p>
                          <p className="font-medium">{c.lender_name || '-'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Loan Amount</p>
                          <p className="font-medium">{formatCurrency(c.loan_amount)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Commission</p>
                          <p className="font-medium">{formatCurrency(c.gross_commission)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Expected Completion</p>
                          <p className="font-medium">{c.expected_completion_date || '-'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-6">
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Documents</CardTitle>
              <Button className="bg-red-600 hover:bg-red-700" onClick={() => setShowDocDialog(true)} data-testid="add-document-btn">
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">No documents uploaded</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div
                      key={doc.document_id}
                      className="flex items-center justify-between p-4 border border-slate-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-slate-400" />
                        <div>
                          <p className="font-medium">{doc.file_name}</p>
                          <p className="text-sm text-slate-500">
                            {formatStatus(doc.document_type)} • {doc.uploaded_at?.split('T')[0]}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteDocument(doc.document_id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="mt-6">
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tasks</CardTitle>
              <Button className="bg-red-600 hover:bg-red-700" onClick={() => setShowTaskDialog(true)} data-testid="add-task-btn">
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <div className="text-center py-8">
                  <CheckSquare className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">No tasks</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div
                      key={task.task_id}
                      className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
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

      {/* Add Case Dialog */}
      <Dialog open={showCaseDialog} onOpenChange={setShowCaseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Case</DialogTitle>
            <DialogDescription>Create a new case for this client.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
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
              <Label>Commission % </Label>
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
            <Button variant="outline" onClick={() => setShowCaseDialog(false)}>Cancel</Button>
            <Button 
              className="bg-red-600 hover:bg-red-700"
              onClick={handleAddCase}
              disabled={!newCase.product_type}
            >
              Create Case
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Document Dialog */}
      <Dialog open={showDocDialog} onOpenChange={setShowDocDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>Upload a document for this client.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Document Type *</Label>
              <Select
                value={newDoc.document_type}
                onValueChange={(value) => setNewDoc({ ...newDoc, document_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{formatStatus(type)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>File *</Label>
              <Input
                type="file"
                onChange={(e) => setNewDoc({ ...newDoc, file: e.target.files[0] })}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={newDoc.notes}
                onChange={(e) => setNewDoc({ ...newDoc, notes: e.target.value })}
                placeholder="Any additional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDocDialog(false)}>Cancel</Button>
            <Button 
              className="bg-red-600 hover:bg-red-700"
              onClick={handleAddDocument}
              disabled={!newDoc.document_type || !newDoc.file}
            >
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Task Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
            <DialogDescription>Create a new task for this client.</DialogDescription>
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
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select
                value={newTask.assigned_to}
                onValueChange={(value) => setNewTask({ ...newTask, assigned_to: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
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
    </div>
  );
};

export default ClientDetail;
