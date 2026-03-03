import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentsAPI, clientsAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
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
import {
  FileText,
  Upload,
  Trash2,
  Download,
  Filter,
  Search,
  File,
  Image,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

const DOCUMENT_TYPES = [
  { key: 'id', label: 'ID' },
  { key: 'proof_of_income', label: 'Proof of Income' },
  { key: 'bank_statements', label: 'Bank Statements' },
  { key: 'esis', label: 'ESIS' },
  { key: 'illustration', label: 'Illustration' },
  { key: 'suitability_letter', label: 'Suitability Letter' },
  { key: 'insurance_policy', label: 'Insurance Policy' },
];

const Documents = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    client_id: '',
    document_type: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [newDoc, setNewDoc] = useState({
    client_id: '',
    document_type: '',
    file: null,
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [docsData, clientsData] = await Promise.all([
        documentsAPI.getAll(filters),
        clientsAPI.getAll({ limit: 500 }),
      ]);
      setDocuments(docsData || []);
      setClients(clientsData.clients || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadDocument = async () => {
    if (!newDoc.file || !newDoc.client_id || !newDoc.document_type) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result.split(',')[1];
        await documentsAPI.create({
          client_id: newDoc.client_id,
          document_type: newDoc.document_type,
          file_name: newDoc.file.name,
          file_data: base64,
          notes: newDoc.notes,
        });
        toast.success('Document uploaded successfully');
        setShowUploadDialog(false);
        setNewDoc({ client_id: '', document_type: '', file: null, notes: '' });
        loadData();
      };
      reader.readAsDataURL(newDoc.file);
    } catch (error) {
      toast.error(error.message || 'Failed to upload document');
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

  const getClientName = (clientId) => {
    const client = clients.find(c => c.client_id === clientId);
    return client ? `${client.first_name} ${client.last_name}` : 'Unknown';
  };

  const getDocTypeBadge = (type) => {
    const colors = {
      id: 'bg-blue-100 text-blue-800',
      proof_of_income: 'bg-green-100 text-green-800',
      bank_statements: 'bg-purple-100 text-purple-800',
      esis: 'bg-orange-100 text-orange-800',
      illustration: 'bg-yellow-100 text-yellow-800',
      suitability_letter: 'bg-indigo-100 text-indigo-800',
      insurance_policy: 'bg-red-100 text-red-800',
    };
    return colors[type] || 'bg-slate-100 text-slate-800';
  };

  const formatDocType = (type) => {
    const found = DOCUMENT_TYPES.find(t => t.key === type);
    return found ? found.label : type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const clearFilters = () => {
    setFilters({ client_id: '', document_type: '' });
  };

  const getFileIcon = (fileName) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      return <Image className="h-8 w-8 text-blue-500" />;
    }
    return <File className="h-8 w-8 text-slate-400" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin h-8 w-8 border-4 border-red-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fadeIn" data-testid="documents-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Documents
          </h1>
          <p className="text-slate-500 mt-1">Manage client documents and compliance files</p>
        </div>
        <Button 
          className="bg-red-600 hover:bg-red-700"
          onClick={() => setShowUploadDialog(true)}
          data-testid="upload-document-btn"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Client</Label>
                <Select
                  value={filters.client_id}
                  onValueChange={(value) => setFilters({ ...filters, client_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All clients</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.client_id} value={client.client_id}>
                        {client.first_name} {client.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Document Type</Label>
                <Select
                  value={filters.document_type}
                  onValueChange={(value) => setFilters({ ...filters, document_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All types</SelectItem>
                    {DOCUMENT_TYPES.map((type) => (
                      <SelectItem key={type.key} value={type.key}>{type.label}</SelectItem>
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

      {/* Documents Grid */}
      {documents.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-700 mb-2">No documents found</h3>
              <p className="text-slate-500 mb-4">Upload your first document to get started.</p>
              <Button className="bg-red-600 hover:bg-red-700" onClick={() => setShowUploadDialog(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <Card key={doc.document_id} className="border-slate-200 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {getFileIcon(doc.file_name)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{doc.file_name}</p>
                    <p 
                      className="text-sm text-red-600 hover:underline cursor-pointer"
                      onClick={() => navigate(`/clients/${doc.client_id}`)}
                    >
                      {getClientName(doc.client_id)}
                    </p>
                    <Badge className={`mt-2 ${getDocTypeBadge(doc.document_type)}`}>
                      {formatDocType(doc.document_type)}
                    </Badge>
                    {doc.notes && (
                      <p className="text-sm text-slate-500 mt-2 truncate">{doc.notes}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-2">
                      Uploaded: {doc.uploaded_at?.split('T')[0]}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteDocument(doc.document_id)}
                    className="text-slate-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>Upload a document for a client.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Client *</Label>
              <Select
                value={newDoc.client_id}
                onValueChange={(value) => setNewDoc({ ...newDoc, client_id: value })}
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
                    <SelectItem key={type.key} value={type.key}>{type.label}</SelectItem>
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
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>Cancel</Button>
            <Button 
              className="bg-red-600 hover:bg-red-700"
              onClick={handleUploadDocument}
              disabled={!newDoc.client_id || !newDoc.document_type || !newDoc.file}
            >
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Documents;
