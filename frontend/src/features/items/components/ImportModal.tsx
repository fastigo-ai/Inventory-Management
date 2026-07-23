import { useState } from "react";
import { importItemsFromCsv } from "../api/items.api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, UploadCloud, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  fields?: any[];
}

export function ImportModal({ isOpen, onClose, onSuccess, fields = [] }: ImportModalProps) {
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
      const res = await importItemsFromCsv(file);
      
      if (res.successCount > 0) {
        toast.success(`Imported successfully! ${res.successCount} items added.`);
        onSuccess();
        
        // If there are zero errors, close the modal immediately since it's perfectly successful
        if (!res.errors || res.errors.length === 0) {
           onClose();
           return; // Stop here, so we don't set result which keeps it open
        }
      }
      setResult(res);
    } catch (err: any) {
      const responseData = err.response?.data;
      if (responseData?.data?.errors) {
        // Detailed row errors were returned
        setResult({ successCount: 0, errors: responseData.data.errors });
        setError(responseData.message || "Import failed due to validation errors.");
      } else {
        // Generic error
        setError(responseData?.message || err.message || "Failed to upload file");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError(null);
  };

  const downloadSampleCsv = () => {
    // Generate headers from dynamic active fields
    const activeHeaders = fields.filter(f => f.active !== false).map(f => f.label);
    const headers = activeHeaders.length > 0 ? activeHeaders.join(',') : "Name,Description,Unit,Code";
    
    // Generate a dummy row based on headers
    const sampleRow = activeHeaders.length > 0 
      ? activeHeaders.map(label => {
          if (label.toLowerCase().includes('quantity') || label.toLowerCase().includes('rate') || label.toLowerCase().includes('price')) return '10';
          if (label.toLowerCase().includes('date')) return new Date().toISOString().split('T')[0];
          return `Sample ${label}`;
        }).join(',')
      : "Sample Item,A sample description,pcs,ITM-001";
      
    const csvContent = `${headers}\n${sampleRow}\n`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "items_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl">Import Items</DialogTitle>
          <DialogDescription>
            Upload a CSV file containing your items. Make sure the headers exactly match the field names.
            <br />
            <a href="/item_bulk_upload_sample.csv" download className="text-[#0076f2] hover:underline mt-2 inline-block font-medium">
              Download Sample CSV Template
            </a>
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <div className="flex justify-between items-center mb-4 bg-blue-50/50 p-3 rounded-md border border-blue-100">
             <div className="text-sm text-slate-700">
               <p className="font-semibold text-slate-800">Need a template?</p>
               <p className="text-xs text-slate-500 mt-0.5">Download our sample CSV file to see the exact format required based on your active fields.</p>
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
                    <p className="text-sm text-green-700">{result.successCount} items added</p>
                  </div>
                </div>
              )}

              {result.errors && result.errors.length > 0 && (
                <div className="border border-red-200 rounded-lg overflow-hidden">
                  <div className="bg-red-50 px-4 py-2 border-b border-red-200">
                    <h4 className="font-medium text-red-900 text-sm">Failed Rows ({result.errors.length})</h4>
                  </div>
                  <div className="max-h-[150px] overflow-y-auto bg-white p-4">
                    <ul className="space-y-2 text-xs text-red-700">
                      {result.errors.map((err: any, i: number) => (
                        <li key={i}>
                          <strong>Row {err.row}:</strong> {err.message}
                          {err.details && err.details.length > 0 && (
                            <ul className="ml-4 list-disc mt-1 text-slate-600">
                              {err.details.map((d: string, j: number) => <li key={j}>{d}</li>)}
                            </ul>
                          )}
                        </li>
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
