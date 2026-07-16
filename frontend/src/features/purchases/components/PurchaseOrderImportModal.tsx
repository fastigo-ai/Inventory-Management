import { useState } from "react";
import { importPurchaseOrdersFromCsv } from "../api/purchases.api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, UploadCloud, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface PurchaseOrderImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PurchaseOrderImportModal({ isOpen, onClose, onSuccess }: PurchaseOrderImportModalProps) {
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
      const res = await importPurchaseOrdersFromCsv(file);
      
      if (res.data.successCount > 0) {
        toast.success(`Imported successfully! ${res.data.successCount} purchase orders added.`);
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
    const headers = "PurchaseOrderNumber,VendorName,Date,Location,ItemName,Quantity,Rate,Status\n";
    const sampleRow1 = "PO-1001,Acme Corp,2023-10-27,Head Office,Widget A,10,15.50,Draft\n";
    const sampleRow2 = "PO-1001,Acme Corp,2023-10-27,Head Office,Widget B,5,25.00,Draft\n";
    const sampleRow3 = "PO-1002,Global Tech,2023-10-28,Warehouse 1,Gadget X,100,5.00,Sent\n";
    const csvContent = headers + sampleRow1 + sampleRow2 + sampleRow3;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "purchase_order_sample.csv");
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
          <DialogTitle className="text-xl">Import Purchase Orders</DialogTitle>
          <DialogDescription>
            Upload a CSV file containing your Purchase Orders. Note that multiple rows with the same PurchaseOrderNumber will be grouped into one order.
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

          {!result && (
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
                  <Button type="button" variant="link" className="text-xs text-red-500 mt-2 z-10 relative" onClick={(e) => { e.stopPropagation(); setFile(null); }}>
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

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="mt-4 space-y-4">
              {result.successCount > 0 && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <h4 className="font-medium text-green-900">Successfully Imported</h4>
                    <p className="text-sm text-green-700">{result.successCount} purchase orders added</p>
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
                        <li key={i}>{typeof err === 'string' ? err : err.message || JSON.stringify(err)}</li>
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
                {isUploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</> : 'Import Now'}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
