"use client";

import React, { useState } from 'react';
import { Upload, X, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

interface ImportDNModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportDNModal({ isOpen, onClose, onSuccess }: ImportDNModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStats, setUploadStats] = useState<{ success: number; errors: string[] } | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setUploadStats(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a CSV file first');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/demand-notes/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData,
      });

      const res = await response.json();
      if (res.success) {
        setUploadStats({
          success: res.data.successCount || 0,
          errors: res.data.errors || []
        });
        toast.success(`Successfully imported ${res.data.successCount} demand notes`);
        onSuccess();
      } else {
        toast.error(res.message || 'Import failed');
      }
    } catch (error) {
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadSample = async () => {
    try {
      const response = await fetch('/api/demand-notes/sample-csv', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'demand_note_sample.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        toast.error('Failed to download sample CSV');
      }
    } catch (error) {
      toast.error('An error occurred while downloading the sample CSV');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            <Upload className="w-5 h-5 text-indigo-500" />
            Import Demand Notes
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {!uploadStats ? (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
                <p className="font-medium mb-1">Before you upload:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Please use the provided CSV template structure.</li>
                  <li>Ensure <strong>DemandNoteNumber</strong> is present for all rows.</li>
                  <li>Package and Circle are required fields.</li>
                </ul>
                <button 
                  onClick={handleDownloadSample}
                  className="mt-3 text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Download Sample CSV
                </button>
              </div>

              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors cursor-pointer relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center pointer-events-none">
                  <Upload className="w-10 h-10 text-slate-400 mb-3" />
                  <p className="text-sm font-medium text-slate-700">
                    {file ? file.name : "Click or drag CSV file to upload"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {file ? `${(file.size / 1024).toFixed(2)} KB` : "CSV files only"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-emerald-50 text-emerald-800 p-4 rounded-lg flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
                  <span className="text-2xl">🎉</span>
                </div>
                <h3 className="font-bold text-lg">Import Complete</h3>
                <p>Successfully imported {uploadStats.success} Demand Notes.</p>
              </div>

              {uploadStats.errors && uploadStats.errors.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-red-600 flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span> 
                    Errors ({uploadStats.errors.length})
                  </h4>
                  <div className="bg-red-50 border border-red-100 rounded-lg p-3 max-h-40 overflow-y-auto">
                    <ul className="list-disc pl-5 text-sm text-red-700 space-y-1">
                      {uploadStats.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
          {uploadStats ? (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 font-medium transition-colors"
            >
              Close
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Import CSV'
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
