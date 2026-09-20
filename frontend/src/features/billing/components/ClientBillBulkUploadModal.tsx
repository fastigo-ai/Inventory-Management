import React, { useState } from 'react';
import { bulkImportClientBills } from '../api/client-billing.api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ClientBillBulkUploadModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<any>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select an Excel file');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);

    try {
      const res = await bulkImportClientBills(file);
      if (res.success) {
        setResults(res.data);
      } else {
        setError(res.message || 'Failed to upload bills');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'An error occurred during upload');
    } finally {
      setLoading(false);
    }
  };

  const downloadSample = (e: React.MouseEvent) => {
    e.preventDefault();
    const headers = [
      'RA Bill No', 'Bill Type', 'Stage', 'MHROV No', 'LOA Sr No', 'Temp Code', 
      'Item Name', 'DI No', 'DI Qty', 'DI Date', 'MHROV Qty', 'RA Bill Qty', 'BOQ Rate',
      'GST %', 'Amount After GST'
    ];
    const row = [
      'RABILL-001', 'Supply', '60%', 'MHR-1234', 'LOA-01', 'T-123', 
      'Sample Transformer', 'DI-001', '10', '2023-10-01', '10', '10', '5000',
      '18', '35400'
    ];
    
    const csvContent = [headers.join(','), row.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Supply_60_Bulk_Import_Sample.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">Bulk Import Supply 60% Bills</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {!results ? (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="mt-4 flex text-sm text-gray-600 justify-center">
                  <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                    <span>Upload a file</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".xlsx, .xls, .csv" onChange={handleFileChange} />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500 mt-2">Excel or CSV up to 10MB</p>
                {file && <p className="text-sm font-semibold text-green-600 mt-4">Selected: {file.name}</p>}
                
                <div className="mt-6">
                  <button 
                    onClick={downloadSample} 
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500 hover:underline inline-flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Sample Excel Format
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-md text-sm">
                  {error}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 text-green-700 p-4 rounded-md">
                <h4 className="font-semibold text-lg">Import Complete</h4>
                <p>Successfully imported {results.success} out of {results.totalParsed} bills.</p>
              </div>

              {results.failed > 0 && (
                <div className="bg-yellow-50 text-yellow-800 p-4 rounded-md">
                  <h5 className="font-semibold mb-2">Errors ({results.failed})</h5>
                  <div className="max-h-60 overflow-y-auto text-sm">
                    <ul className="list-disc pl-5 space-y-1">
                      {results.errors.map((err: any, idx: number) => (
                        <li key={idx}><strong>{err.raBillNo}:</strong> {err.reason}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 border-t border-gray-200">
          <button
            onClick={() => {
              if (results) onSuccess();
              onClose();
            }}
            className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {results ? 'Done' : 'Cancel'}
          </button>
          {!results && (
            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className={`px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${
                !file || loading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
            >
              {loading ? 'Uploading...' : 'Import Bills'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
