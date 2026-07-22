import { useState } from "react";
import { importDIsFromCsv } from "../api/di.api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, UploadCloud, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface DIImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DIImportModal({ isOpen, onClose, onSuccess }: DIImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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

    try {
      const res = await importDIsFromCsv(file);
      
      if (res.data.successCount > 0) {
        toast.success(`Imported successfully! ${res.data.successCount} DI registrations added.`);
        onSuccess();
        
        if (!res.data.errors || res.data.errors.length === 0) {
           onClose();
           return;
        }
      }
      setResult(res.data);
    } catch (err: any) {
      const responseData = err.response?.data;
      if (responseData?.data?.errors) {
        setResult({ successCount: 0, errors: responseData.data.errors });
        setError(responseData.message || "Import failed due to validation errors.");
      } else {
        setError(responseData?.message || err.message || "Failed to upload file");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const downloadSampleCsv = () => {
    const headers = "DINumber,PurchaseOrderNumber,Date,Circle,Package,Notes,ItemName,TempCode,LoaSerialNo,Quantity\n";
    const sampleRow1 = "DI-20001,PO-10001,2026-07-21,Mumbai,Hardware Pack 1,Ready for dispatch,Optical Fiber,FBR-001,SN-1234,2\n";
    const sampleRow2 = "DI-20001,PO-10001,2026-07-21,Mumbai,Hardware Pack 1,Ready for dispatch,Router,RTR-900,SN-9988,5\n";
    const csvContent = headers + sampleRow1 + sampleRow2;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "di_registration_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl">Import DI Registrations</DialogTitle>
          <DialogDescription>
            Upload a CSV file containing your DI Registrations. Note that multiple rows with the same DINumber will be grouped into one DI Registration.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <div className="flex justify-between items-center mb-4 bg-blue-50/50 p-3 rounded-md border border-blue-100">
             <div className="text-sm text-slate-700">
               <p className="font-semibold text-slate-800">Need a template?</p>
               <p className="text-xs text-slate-500 mt-0.5">Download our sample CSV file to see the exact format required.</p>
             </div>
             <Button variant="outline" size="sm" onClick={downloadSampleCsv} className="bg-white hover:bg-slate-50 text-[#0076f2] border-[#0076f2]/20">
               Download Sample CSV
             </Button>
          </div>

          {!file ? (
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-10 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors relative">
              <input
                type="file"
                accept=".csv"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileChange}
              />
              <UploadCloud className="w-10 h-10 text-slate-400 mb-3" />
              <p className="text-sm font-medium text-slate-700">Click or drag CSV file to upload</p>
              <p className="text-xs text-slate-500 mt-1">Maximum file size 5MB</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg p-4 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="bg-blue-100 p-2 rounded text-blue-600 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={reset} className="text-slate-500 hover:text-slate-700 shrink-0">
                Remove
              </Button>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-md flex gap-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {result && result.errors && result.errors.length > 0 && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-md">
              <div className="flex items-center gap-2 text-amber-700 font-medium mb-2 text-sm">
                <AlertCircle className="w-4 h-4" />
                Import Issues ({result.errors.length})
              </div>
              <ul className="text-xs text-amber-600 list-disc list-inside space-y-1 max-h-32 overflow-y-auto">
                {result.errors.map((err: string, i: number) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {result && result.successCount > 0 && result.errors?.length > 0 && (
            <div className="mt-4 p-3 bg-green-50 border border-green-100 rounded-md flex items-center gap-2 text-sm text-green-700">
              <CheckCircle className="w-4 h-4" />
              Successfully imported {result.successCount} DI registrations.
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={!file || isUploading}
            className="bg-[#0076f2] hover:bg-blue-600"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              'Import DIs'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
