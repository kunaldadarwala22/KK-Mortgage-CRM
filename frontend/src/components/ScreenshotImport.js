import React, { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Camera, Upload, X, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { extractAPI } from '../lib/api';

export const ScreenshotImport = ({ type, onExtracted }) => {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [previews, setPreviews] = useState([]);
  const fileRef = useRef(null);

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter(f => f.type === 'image/jpeg' || f.type === 'image/png');
    if (validFiles.length === 0) {
      toast.error('Please upload JPG or PNG images only');
      return;
    }

    // Show previews
    const prevs = validFiles.map(f => ({ name: f.name, url: URL.createObjectURL(f) }));
    setPreviews(prevs);
    setProcessing(true);
    setProgress({ current: 0, total: validFiles.length });

    // Simulate per-file progress while single API call processes
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev.current < prev.total) return { ...prev, current: prev.current + 1 };
        return prev;
      });
    }, 800);

    try {
      const formData = new FormData();
      validFiles.forEach(f => formData.append('files', f));

      const extractFn = type === 'client' ? extractAPI.extractClient : extractAPI.extractCase;
      const result = await extractFn(formData);

      clearInterval(progressInterval);
      setProgress({ current: validFiles.length, total: validFiles.length });

      if (result.extracted_data && Object.keys(result.extracted_data).length > 0) {
        // Filter out null values
        const cleanData = {};
        Object.entries(result.extracted_data).forEach(([key, val]) => {
          if (val !== null && val !== undefined && val !== '') {
            cleanData[key] = val;
          }
        });
        onExtracted(cleanData);
        toast.success(`Data extracted from ${result.screenshots_processed} screenshot${result.screenshots_processed > 1 ? 's' : ''}`);
      } else {
        toast.error('Unable to extract data from uploaded screenshots.');
      }
    } catch (err) {
      clearInterval(progressInterval);
      console.error('Extraction error:', err);
      toast.error('Unable to extract data from uploaded screenshots.');
    } finally {
      // Cleanup previews (delete references)
      prevs.forEach(p => URL.revokeObjectURL(p.url));
      setTimeout(() => {
        setProcessing(false);
        setPreviews([]);
        setProgress({ current: 0, total: 0 });
      }, 1500);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png"
        multiple
        className="hidden"
        onChange={handleFiles}
        data-testid="screenshot-file-input"
      />

      {!processing ? (
        <Button
          type="button"
          variant="outline"
          className="gap-2 border-dashed border-2 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
          onClick={() => fileRef.current?.click()}
          data-testid="import-screenshots-btn"
        >
          <Camera className="h-4 w-4" />
          Import from Screenshots
        </Button>
      ) : (
        <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4 space-y-3" data-testid="screenshot-processing">
          {/* Preview thumbnails */}
          {previews.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {previews.map((p, i) => (
                <div key={i} className="relative w-12 h-12 rounded border border-slate-200 overflow-hidden">
                  <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                  {progress.current > i && (
                    <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Progress */}
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-red-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-700">Processing screenshots...</p>
              <p className="text-xs text-red-500">
                Screenshot {Math.min(progress.current + 1, progress.total)} of {progress.total} analysed
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-red-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 rounded-full transition-all duration-500"
              style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
