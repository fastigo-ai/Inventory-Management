import { useState, useRef } from "react";
import { importPurchaseInvoicesFromCsv } from "../api/purchases.api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { UploadCloud, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface PurchaseInvoiceImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const IMPORT_STAGES = [
  { progress: 5,  label: "Reading CSV file..." },
  { progress: 15, label: "Parsing rows..." },
  { progress: 30, label: "Validating data..." },
  { progress: 50, label: "Checking DI allocations..." },
  { progress: 65, label: "Saving invoices..." },
  { progress: 80, label: "Creating store receipts..." },
  { progress: 90, label: "Finalising import..." },
];

export function PurchaseInvoiceImportModal({ isOpen, onClose, onSuccess }: PurchaseInvoiceImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stageLabel, setStageLabel] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const stageIndexRef = useRef(0);

  const startProgressSimulation = () => {
    stageIndexRef.current = 0;
    setProgress(IMPORT_STAGES[0].progress);
    setStageLabel(IMPORT_STAGES[0].label);

    const tick = () => {
      const idx = stageIndexRef.current;
      if (idx >= IMPORT_STAGES.length - 1) return;
      const next = idx + 1;
      stageIndexRef.current = next;
      setProgress(IMPORT_STAGES[next].progress);
      setStageLabel(IMPORT_STAGES[next].label);
      timerRef.current = setTimeout(tick, 900 + Math.random() * 1100);
    };

    timerRef.current = setTimeout(tick, 700);
  };

  const stopProgressSimulation = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setResult(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);
    setResult(null);
    startProgressSimulation();

    try {
      const res = await importPurchaseInvoicesFromCsv(file);
      stopProgressSimulation();
      setProgress(100);
      setStageLabel("Import complete!");

      setTimeout(() => {
        setIsUploading(false);
        if (res.data.successCount > 0) {
          toast.success(`Imported successfully! ${res.data.successCount} purchase invoices saved.`);
          onSuccess();
          if (!res.data.errors || res.data.errors.length === 0) {
            onClose();
            return;
          }
        }
        setResult(res.data);
      }, 600);
    } catch (err: any) {
      stopProgressSimulation();
      setIsUploading(false);
      setProgress(0);
      const responseData = err.response?.data;
      if (responseData?.data?.errors) {
        setResult({ successCount: 0, errors: responseData.data.errors });
        setError(responseData.message || "Import failed due to validation errors.");
      } else {
        setError(responseData?.message || err.message || "Failed to upload file");
      }
    }
  };

  const downloadSampleCsv = () => {
    const headers = "Vendor Name,Purchase Order#,Received Date,Billing From,Purchase Invoice#,DI No,DI Date,PACKAGE,CIRCLE,Subcircle,Temp Code,Item Name,Description,LOA Serial No,HSN Code,Inv Qty,Unit,Rate,GST Type,CGST %,SGST %,IGST %\n";
    const sampleRow1 = "Fastigo Tech,PO-00001,2026-07-20,HQ,PINV-10001,DI-001,2026-07-15,PKG-1,North,North-Sub,FBR-001,Optical Fiber,Fiber Cable,LOA-1234,8544,10,Mtrs,5000,Intra State,9,9,0\n";
    const sampleRow2 = "Fastigo Tech,PO-00001,2026-07-20,HQ,PINV-10001,DI-001,2026-07-15,PKG-1,North,North-Sub,RTR-900,Router,WiFi Router,LOA-1234,8517,5,Nos,12000,Intra State,9,9,0\n";
    const blob = new Blob([headers + sampleRow1 + sampleRow2], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "purchase_invoice_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const circumference = 2 * Math.PI * 28;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isUploading && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl">Import Purchase Invoices</DialogTitle>
          <DialogDescription>
            Upload a CSV file. Multiple rows with the same PurchaseInvoiceNumber will be grouped into one invoice.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-4">
          {/* Template download */}
          <div className="flex justify-between items-center bg-blue-50/50 p-3 rounded-md border border-blue-100">
            <div className="text-sm text-slate-700">
              <p className="font-semibold text-slate-800">Need a template?</p>
              <p className="text-xs text-slate-500 mt-0.5">Download our sample CSV to see the exact format.</p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadSampleCsv} className="bg-white hover:bg-slate-50 text-[#0076f2] border-[#0076f2]/20">
              Download Sample CSV
            </Button>
          </div>

          {/* Loading progress */}
          {isUploading && (
            <div className="rounded-xl border border-blue-100 bg-gradient-to-b from-blue-50 to-white p-6 flex flex-col items-center gap-4">
              <div className="relative w-20 h-20">
                <svg className="absolute inset-0 w-20 h-20 -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="#e2e8f0" strokeWidth="5" />
                  <circle
                    cx="32" cy="32" r="28"
                    fill="none"
                    stroke="#0076f2"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - progress / 100)}
                    style={{ transition: "stroke-dashoffset 0.7s ease" }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-[#0076f2]">{progress}%</span>
                </div>
              </div>

              <div className="w-full">
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span className="font-medium">{stageLabel}</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-[#0076f2]"
                    style={{ width: `${progress}%`, transition: "width 0.7s ease" }}
                  />
                </div>
              </div>

              <p className="text-xs text-slate-400 text-center">
                Processing your file — please keep this window open.
              </p>
            </div>
          )}

          {/* File drop zone */}
          {!isUploading && !result && (
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 flex flex-col items-center justify-center bg-slate-50 relative">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {file ? (
                <div className="flex flex-col items-center">
                  <FileText className="w-10 h-10 text-[#0076f2] mb-3" />
                  <p className="text-sm font-medium text-slate-700">{file.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                  <Button
                    type="button"
                    variant="link"
                    className="text-xs text-red-500 mt-2 z-10 relative"
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <UploadCloud className="w-10 h-10 text-slate-400 mb-3" />
                  <p className="text-sm font-semibold text-slate-700">Click or drag CSV to upload</p>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && !isUploading && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Result */}
          {result && !isUploading && (
            <div className="space-y-3">
              {result.successCount > 0 && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 shrink-0" />
                  <div>
                    <h4 className="font-medium text-green-900">Successfully Imported</h4>
                    <p className="text-sm text-green-700">{result.successCount} purchase invoices saved</p>
                  </div>
                </div>
              )}
              {result.errors && result.errors.length > 0 && (
                <div className="border border-red-200 rounded-lg overflow-hidden">
                  <div className="bg-red-50 px-4 py-2 border-b border-red-200">
                    <h4 className="font-medium text-red-900 text-sm">Errors ({result.errors.length})</h4>
                  </div>
                  <div className="max-h-[150px] overflow-y-auto bg-white p-4">
                    <ul className="space-y-2 text-xs text-red-700">
                      {result.errors.map((err: any, i: number) => (
                        <li key={i}>{typeof err === "string" ? err : err.message || JSON.stringify(err)}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-2">
          {result ? (
            <Button onClick={onClose} variant="outline" className="w-full">Close</Button>
          ) : (
            <>
              <Button onClick={onClose} variant="outline" disabled={isUploading}>Cancel</Button>
              <Button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="bg-[#0076f2] hover:bg-[#0060c5] text-white"
              >
                {isUploading ? "Importing..." : "Import Now"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
