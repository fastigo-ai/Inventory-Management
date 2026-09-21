"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Download, Loader2, AlertCircle, CheckCircle2, SkipForward, XCircle } from "lucide-react";
import { toast } from "sonner";
import { importReceivedTransfers } from "@/features/store/api/store.api";

interface BulkImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ImportResult {
  successCount: number;
  skippedCount: number;
  errors: string[];
}

export function BulkImportModal({ open, onOpenChange, onSuccess }: BulkImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importFailed, setImportFailed] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setUploadProgress(0);
      setImportResult(null);
      setImportFailed(false);
    }
  };

  const handleDownloadSample = () => {
    const headers = [
      "Sr. No", "Date of Received", "Name of Vendor", "Final Temp Code",
      "Item Name", "Description of Material", "Unit", "Received Qty",
      "MIN BOOK No.", "MIN No.", "MIN Date", "Challan No", "Challan Date",
      "From", "To", "Transport", "Truck No", "GR No", "Date",
      "Driver Name", "Mobile No.", "Remark"
    ];
    const sampleData = [
      "1", "2023-10-25", "Acme Corp", "ITM001", "Copper Wire",
      "Copper Wire 2.5mm", "Coil", "50", "MB-001", "MIN-1001",
      "2023-10-24", "CH-9081", "2023-10-23", "Central Warehouse",
      "Site A", "Fast Logistics", "MH12AB1234", "GR-456", "2023-10-24",
      "Ramesh", "9876543210", "Received in good condition"
    ];
    const csvContent = [headers.join(","), sampleData.join(",")].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "inward_register_transfers_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpload = async () => {
    if (!file) { toast.error("Please select a CSV file first"); return; }

    setLoading(true);
    setUploadProgress(0);
    setImportResult(null);
    setImportFailed(false);

    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev < 35) return prev + 7;
        if (prev < 70) return prev + 4;
        if (prev < 95) return prev + 1;
        return prev;
      });
    }, 250);

    try {
      const result = await importReceivedTransfers(file);
      clearInterval(progressInterval);
      setUploadProgress(100);

      const { successCount = 0, skippedCount = 0, errors: importErrors = [] } = result?.data || {};
      setImportResult({ successCount, skippedCount, errors: importErrors });

      setTimeout(() => {
        setLoading(false);
        if (successCount > 0) onSuccess();
      }, 300);

    } catch (error: any) {
      clearInterval(progressInterval);
      setUploadProgress(0);
      setLoading(false);
      setImportFailed(true);
      console.error("Import error:", error);

      const serverErrors: string[] = error.response?.data?.data?.errors || [];
      const serverMessage: string = error.response?.data?.message || "Failed to import data";
      setImportResult({
        successCount: 0,
        skippedCount: 0,
        errors: serverErrors.length > 0 ? serverErrors : [serverMessage],
      });
    }
  };

  const handleClose = () => {
    setFile(null);
    setImportResult(null);
    setImportFailed(false);
    setUploadProgress(0);
    onOpenChange(false);
  };

  const hardErrors = importResult?.errors.filter(e => !e.startsWith('Skipped')) ?? [];
  const skippedWarnings = importResult?.errors.filter(e => e.startsWith('Skipped')) ?? [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Received Transfers</DialogTitle>
          <DialogDescription>
            Upload a CSV file containing received store transfers. Download the sample CSV to see the required format.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-5 py-4">
          {/* Download Sample */}
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-medium text-slate-800">1. Download Sample</h4>
            <p className="text-xs text-slate-500 mb-1">
              Use this template to format your data correctly. Do not change the column headers.
            </p>
            <Button 
              variant="outline" 
              className="w-full justify-start text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:text-blue-700"
              onClick={handleDownloadSample}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Sample CSV
            </Button>
          </div>

          {/* Upload Area */}
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-medium text-slate-800">2. Upload Data</h4>
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors">
              <Upload className="w-8 h-8 text-slate-400 mb-3" />
              <p className="text-sm font-medium text-slate-700 mb-1">
                {file ? file.name : "Click to select or drag and drop"}
              </p>
              <p className="text-xs text-slate-500 mb-4">CSV files only</p>
              
              <div className="relative">
                <Button variant="secondary" size="sm" type="button" disabled={loading}>
                  Select File
                </Button>
                <input
                  type="file"
                  accept=".csv"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleFileChange}
                  disabled={loading}
                />
              </div>

              {loading && (
                <div className="w-full max-w-[85%] mt-4 pt-3 border-t border-slate-200">
                  <div className="flex justify-between text-xs text-slate-600 mb-1">
                    <span>
                      {uploadProgress < 35 ? 'Uploading file...' :
                       uploadProgress < 70 ? 'Validating data & headers...' :
                       uploadProgress < 100 ? 'Saving transfers to database...' : 'Completed!'}
                    </span>
                    <span className="font-semibold text-slate-700">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-[#0076f2] h-2 rounded-full transition-all duration-300 ease-out" 
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* â”€â”€ Result Panel â”€â”€ */}
          {importResult && !loading && (
            <div className="rounded-xl border overflow-hidden text-sm">
              
              {/* Summary bar */}
              <div className={`flex items-center gap-3 px-4 py-3 ${importFailed ? 'bg-red-50 border-b border-red-100' : 'bg-green-50 border-b border-green-100'}`}>
                {importFailed ? (
                  <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                )}
                <div>
                  {importFailed ? (
                    <p className="font-semibold text-red-700">Import Failed â€” No data was saved</p>
                  ) : (
                    <p className="font-semibold text-green-700">
                      {importResult.successCount} transfer(s) imported successfully
                      {importResult.skippedCount > 0 && `, ${importResult.skippedCount} skipped`}
                    </p>
                  )}
                </div>
              </div>

              {/* Hard Errors â€” items not found, bad rows etc. */}
              {hardErrors.length > 0 && (
                <div className="px-4 py-3 bg-white">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-red-600 mb-2">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {hardErrors.length} Error{hardErrors.length !== 1 ? 's' : ''} â€” fix these rows in your CSV and re-import:
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg bg-red-50 border border-red-100 p-2">
                    {hardErrors.map((err, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-red-800 py-1.5 border-b border-red-100 last:border-0">
                        <span className="font-mono font-bold text-red-400 flex-shrink-0 pt-0.5">#{i + 1}</span>
                        <span>{err}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skipped Warnings â€” duplicates */}
              {skippedWarnings.length > 0 && (
                <div className="px-4 py-3 bg-white border-t border-slate-100">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 mb-2">
                    <SkipForward className="w-3.5 h-3.5" />
                    {skippedWarnings.length} Skipped (already exist in database):
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-1 rounded-lg bg-amber-50 border border-amber-100 p-2">
                    {skippedWarnings.map((warn, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-amber-800 py-1 border-b border-amber-100 last:border-0">
                        <span className="font-mono text-amber-400 flex-shrink-0 pt-0.5">#{i + 1}</span>
                        <span>{warn.replace('Skipped (already exists): Transfer ', '')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Button */}
          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700" 
            disabled={!file || loading}
            onClick={handleUpload}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : importResult ? "Re-import" : "Import Data"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
