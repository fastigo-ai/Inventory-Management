import { useState } from "react";
import { importContractorWorkOrders } from "../api/contractorWorkOrder.api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, UploadCloud, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";

interface ImportWOModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportWOModal({ isOpen, onClose, onSuccess }: ImportWOModalProps) {
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

  const handleUpload = () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);
    setResult(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const data = results.data;
          const res = await importContractorWorkOrders(data);
          
          if (res.data?.created > 0) {
            toast.success(`Imported successfully! ${res.data.created} Work Orders added.`);
            onSuccess();
            
            if (!res.data.errors || res.data.errors.length === 0) {
               onClose();
               setIsUploading(false);
               return;
            }
          }
          setResult({ successCount: res.data?.created || 0, errors: res.data?.errors || [] });
        } catch (err: any) {
          setError(err.response?.data?.message || err.message || "Failed to import work orders");
        } finally {
          setIsUploading(false);
        }
      },
      error: (err) => {
        setError("Failed to parse CSV file: " + err.message);
        setIsUploading(false);
      }
    });
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError(null);
  };

  const downloadSampleCsv = () => {
    const headers = [
      "workOrderNumber", "package", "circle", "contractorCompanyName", 
      "division", "subDivision", "location", "remarks", "status",
      "itemTempCode", "itemActivity", "loaSrNo", "description", "unit",
      "circleLoaQty", "circleBomQty", "totalPackageLoaQty", "alreadyIssuedQty", 
      "woQty", "contractorErectionRate", "amount", "gstType", "gstAmount", "totalAmount"
    ].join(",");
    
    // Sample Data (1 WO with 2 items)
    const row1 = "WO-SAMPLE-001,Package 1(S/N),Solan,Acme Corp,Div1,SubDiv1,Shimla HQ,Sample import,Draft,TC-001,,LOA-001,Sample Item 1,Nos,10,10,20,0,10,500,5000,Intra,900,5900";
    const row2 = "WO-SAMPLE-001,Package 1(S/N),Solan,Acme Corp,Div1,SubDiv1,Shimla HQ,Sample import,Draft,,Augmentation of DT 100 KVA to 250KVA,LOA-002,Sample Item 2,Nos,5,5,10,0,5,1200,6000,Intra,1080,7080";
      
    const csvContent = `${headers}\n${row1}\n${row2}\n`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "contractor_workorders_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        reset();
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-[600px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl">Import Contractor Work Orders</DialogTitle>
          <DialogDescription>
            Upload a CSV file containing your work orders. Use the flat structure where each row represents one item within a Work Order.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-between items-center bg-blue-50/50 p-3 rounded-lg border border-blue-100/50">
          <div className="text-sm text-blue-800">
            Need the exact format?
          </div>
          <Button variant="outline" size="sm" onClick={downloadSampleCsv} className="h-8 text-xs bg-white text-blue-700 border-blue-200 hover:bg-blue-50">
            Download Sample CSV
          </Button>
        </div>

        <div className="py-2">
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
                    <p className="text-sm text-green-700">{result.successCount} Work Orders added</p>
                  </div>
                </div>
              )}

              {result.errors && result.errors.length > 0 && (
                <div className="border border-red-200 rounded-lg overflow-hidden">
                  <div className="bg-red-50 px-4 py-2 border-b border-red-200">
                    <h4 className="font-medium text-red-900 text-sm">Failed Work Orders ({result.errors.length})</h4>
                  </div>
                  <div className="max-h-[150px] overflow-y-auto bg-white p-4">
                    <ul className="space-y-2 text-xs text-red-700">
                      {result.errors.map((err: any, i: number) => (
                        <li key={i}>
                          <strong>WO: {err.workOrderNumber}</strong> - {err.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 mt-2">
          {result ? (
            <Button variant="outline" onClick={() => { reset(); onClose(); }}>Close</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => { reset(); onClose(); }} disabled={isUploading}>Cancel</Button>
              <Button 
                onClick={handleUpload} 
                disabled={!file || isUploading}
                className="bg-[#0076f2] hover:bg-[#0060c5] text-white min-w-[120px]"
              >
                {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {isUploading ? "Importing..." : "Import Work Orders"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
