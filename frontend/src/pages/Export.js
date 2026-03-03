import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Download,
  FileSpreadsheet,
  Users,
  Briefcase,
  CheckSquare,
  FileText,
  UserCog,
  Loader2,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Export = () => {
  const [exporting, setExporting] = useState(false);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/export/excel`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get the blob from response
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'KK_Mortgage_CRM_Export.xlsx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename=(.+)/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Export completed successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const exportItems = [
    { icon: Users, label: 'Clients', description: 'All client records with personal and financial details' },
    { icon: Briefcase, label: 'Cases', description: 'All mortgage and insurance cases with status and commission' },
    { icon: CheckSquare, label: 'Tasks', description: 'All tasks with due dates and completion status' },
    { icon: FileText, label: 'Documents', description: 'Document metadata (file references, not actual files)' },
    { icon: UserCog, label: 'Users', description: 'All system users and their roles' },
  ];

  return (
    <div className="p-6 space-y-6 animate-fadeIn" data-testid="export-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
          Export Data
        </h1>
        <p className="text-slate-500 mt-1">Download all your CRM data in Excel format</p>
      </div>

      {/* Export Card */}
      <Card className="border-slate-200 max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
              <FileSpreadsheet className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <CardTitle>Export to Excel</CardTitle>
              <CardDescription>Download a complete backup of all your data</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* What's included */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-3">What's included:</h3>
            <div className="space-y-3">
              {exportItems.map((item) => (
                <div key={item.label} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="h-8 w-8 rounded bg-white flex items-center justify-center border border-slate-200">
                    <item.icon className="h-4 w-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{item.label}</p>
                    <p className="text-sm text-slate-500">{item.description}</p>
                  </div>
                  <Check className="h-5 w-5 text-green-500 ml-auto flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* Export Button */}
          <Button
            className="w-full bg-red-600 hover:bg-red-700 h-12 text-base"
            onClick={handleExportExcel}
            disabled={exporting}
            data-testid="export-excel-btn"
          >
            {exporting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Generating Export...
              </>
            ) : (
              <>
                <Download className="h-5 w-5 mr-2" />
                Download Excel File
              </>
            )}
          </Button>

          {/* Info */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> The exported file will contain multiple sheets (Clients, Cases, Tasks, Documents, Users) 
              with all data formatted for easy viewing in Excel or Google Sheets.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Format Info */}
      <Card className="border-slate-200 max-w-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Export Format Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-500">File Format</p>
              <p className="font-medium">.xlsx (Microsoft Excel)</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Compatible With</p>
              <p className="font-medium">Excel, Google Sheets, Numbers</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Data Included</p>
              <p className="font-medium">All records from database</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Sensitive Data</p>
              <p className="font-medium">Passwords excluded</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Export;
