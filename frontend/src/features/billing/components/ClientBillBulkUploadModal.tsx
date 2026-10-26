import React, { useState } from 'react';
import { bulkImportClientBills } from '../api/client-billing.api';
import { 
  FileSpreadsheet, Upload, Download, CheckCircle2, AlertTriangle, 
  X, HelpCircle, Layers, ArrowRight, Sparkles 
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ClientBillBulkUploadModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState<'Erection' | 'Supply'>('Erection');
  const [selectedStage, setSelectedStage] = useState<'90%' | '10%' | '60%' | '30%'>('90%');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<any>(null);

  if (!isOpen) return null;

  const handleTabChange = (tab: 'Erection' | 'Supply') => {
    setActiveTab(tab);
    if (tab === 'Erection') {
      setSelectedStage('90%');
    } else {
      setSelectedStage('60%');
    }
    setError('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select an Excel or CSV file to upload.');
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
        setError(res.message || 'Failed to import bills');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'An error occurred during upload');
    } finally {
      setLoading(false);
    }
  };

  // Generate downloadable sample based on active bill type and stage
  const downloadSample = (e: React.MouseEvent) => {
    e.preventDefault();

    if (activeTab === 'Erection') {
      const headers = [
        'RA Bill No', 'Bill Type', 'Stage', 'Circle', 'Linked Supply RA Bill No', 'LOA Sr No', 'Temp Code', 
        'Item Name', 'RA Bill Qty', 'BOQ Rate', 'GST %'
      ];
      const rows = [
        ['RA-EREC-001', 'Erection', selectedStage, 'Solan', 'RA-SUP-001', 'LOA-01', 'TC-101', '11kV VCB Indoor', '5', '12500', '18'],
        ['RA-EREC-001', 'Erection', selectedStage, 'Solan', 'RA-SUP-001', 'LOA-02', 'TC-102', '100 kVA Transformer', '2', '24000', '18'],
        ['RA-EREC-002', 'Erection', selectedStage, 'Nahan', 'RA-SUP-002', 'LOA-05', 'TC-108', '11-Meter Steel Tubular Pole', '40', '3500', '18']
      ];
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Client_Bill_Erection_${selectedStage.replace('%', '')}_Sample.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const headers = [
        'RA Bill No', 'Bill Type', 'Stage', 'Circle', 'MHROV No', 'LOA Sr No', 'Temp Code', 
        'Item Name', 'DI No', 'DI Qty', 'DI Date', 'MHROV Qty', 'RA Bill Qty', 'BOQ Rate',
        'GST %', 'Amount After GST'
      ];
      const row = [
        'RA-SUP-001', 'Supply', '60%', 'Solan', 'MHR-1234', 'LOA-01', 'TC-101', 
        'Sample Transformer', 'DI-001', '10', '2026-05-10', '10', '10', '50000',
        '18', '354000'
      ];
      const csvContent = [headers.join(','), row.join(',')].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Client_Bill_Supply_60_Sample.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Bulk Import Client Bills</h3>
              <p className="text-xs text-slate-500">Import RA Bills for Erection (90% & 10%) or Supply</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab & Stage Selector */}
        {!results && (
          <div className="px-6 pt-4 pb-2 border-b border-slate-100 flex items-center justify-between">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => handleTabChange('Erection')}
                className={`text-xs font-bold px-4 py-1.5 rounded-lg transition-all ${
                  activeTab === 'Erection' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Erection Bill (90% / 10%)
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('Supply')}
                className={`text-xs font-bold px-4 py-1.5 rounded-lg transition-all ${
                  activeTab === 'Supply' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Supply Bill (60% / 30%)
              </button>
            </div>

            {/* Stage Pill selector */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[11px] font-semibold text-slate-500">Stage:</span>
              {activeTab === 'Erection' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setSelectedStage('90%')}
                    className={`px-2.5 py-1 rounded-md font-bold text-xs transition-colors border ${
                      selectedStage === '90%' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    90% Interim
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedStage('10%')}
                    className={`px-2.5 py-1 rounded-md font-bold text-xs transition-colors border ${
                      selectedStage === '10%' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    10% Handover
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setSelectedStage('60%')}
                    className={`px-2.5 py-1 rounded-md font-bold text-xs transition-colors border ${
                      selectedStage === '60%' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    60% Inward
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedStage('30%')}
                    className={`px-2.5 py-1 rounded-md font-bold text-xs transition-colors border ${
                      selectedStage === '30%' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    30% Erection Release
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6">
          {!results ? (
            <div className="space-y-4">
              {/* Erection 90% auto Supply 30% Callout */}
              {activeTab === 'Erection' && (
                <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Option 1 Linked Supply 60% Active:</span> Provide the Supply 60% bill number in the <strong>&quot;Linked Supply RA Bill No&quot;</strong> column. When this {selectedStage} bill is approved, the system directly binds to that Supply bill and <strong>automatically creates the Supply {selectedStage === '90%' ? '30%' : '10%'} draft bill</strong>.
                  </div>
                </div>
              )}

              {/* Upload Dropzone */}
              <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-8 text-center bg-slate-50/40 hover:bg-slate-50 transition-colors">
                <Upload className="mx-auto h-10 w-10 text-slate-400 mb-2" />
                <div className="flex text-sm text-slate-600 justify-center">
                  <label htmlFor="file-upload" className="relative cursor-pointer bg-white px-3 py-1 rounded-md font-semibold text-blue-600 border border-slate-200 shadow-xs hover:text-blue-700">
                    <span>Choose Excel or CSV</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".xlsx, .xls, .csv" onChange={handleFileChange} />
                  </label>
                </div>
                <p className="text-xs text-slate-400 mt-2">Supports .xlsx, .xls, and .csv formats</p>
                
                {file && (
                  <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Selected: {file.name}
                  </div>
                )}
                
                <div className="mt-5 pt-4 border-t border-slate-200/80 flex items-center justify-center">
                  <button 
                    onClick={downloadSample} 
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Sample Excel for {activeTab} {selectedStage}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-xs font-medium flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <h4 className="font-bold text-sm">Bulk Import Successful</h4>
                </div>
                <p className="text-xs text-emerald-800">
                  Successfully imported <strong>{results.success}</strong> out of <strong>{results.totalParsed}</strong> bills.
                </p>
              </div>

              {results.failed > 0 && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-xl">
                  <h5 className="font-bold text-xs mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Failed Rows / Errors ({results.failed})
                  </h5>
                  <div className="max-h-48 overflow-y-auto text-xs space-y-1 pr-2">
                    {results.errors.map((err: any, idx: number) => (
                      <div key={idx} className="bg-white p-2 rounded border border-amber-100 text-slate-700">
                        <strong className="text-slate-900">{err.raBillNo}:</strong> {err.reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3.5 flex justify-end space-x-2.5 border-t border-slate-200">
          <button
            onClick={() => {
              if (results) onSuccess();
              onClose();
            }}
            className="px-4 py-2 border border-slate-300 text-xs font-bold rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors"
          >
            {results ? 'Close & Refresh' : 'Cancel'}
          </button>
          {!results && (
            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className={`px-4 py-2 text-xs font-bold rounded-lg text-white transition-all shadow-xs ${
                !file || loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? 'Processing & Validating...' : `Import ${activeTab} ${selectedStage} Bills`}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
