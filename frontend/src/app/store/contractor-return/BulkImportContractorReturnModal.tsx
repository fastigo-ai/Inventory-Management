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
import { Upload, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { importContractorReturns } from "@/features/contractors/api/contractors.api";

interface BulkImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BulkImportContractorReturnModal({ open, onOpenChange, onSuccess }: BulkImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setUploadProgress(0);
    }
  };

  const handleDownloadSample = () => {
    const headers = [
      "Return Challan No.",
      "Book No.",
      "Return Challan Date",
      "Contractor Name",
      "Contractor's Firm/Farm Name",
      "Supervisor / Engineer",
      "Name of Division",
      "Name of Sub-Division",
      "Name of Sub-Station",
      "Name of Feeder",
      "Return TFS Sr No.",
      "Remarks",
      "Sr. No.",
      "Description of Material",
      "Temp Code",
      "HSN Code",
      "UNIT",
      "In Stock",
      "Return QTY."
    ];
    
    const sampleData = [
      "RET-2012",
      "B-100",
      "2026-08-12",
      "Acme Corp",
      "Acme Services",
      "John Doe",
      "North Div",
      "Sub Div A",
      "Station 1",
      "Feeder 1",
      "TFS-991",
      "Returned properly",
      "1",
      "Copper Wire",
      "TEMP001",
      "1234",
      "Nos",
      "100",
      "5"
    ];

    const csvContent = [
      headers.join(","),
      sampleData.join(",")
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "contractor_returns_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a CSV file first");
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev < 35) return prev + 7;
        if (prev < 70) return prev + 4;
        if (prev < 95) return prev + 1;
        return prev;
      });
    }, 250);

    try {
      await importContractorReturns(file);
      clearInterval(progressInterval);
      setUploadProgress(100);

      setTimeout(() => {
        toast.success("Data imported successfully");
        setFile(null);
        setLoading(false);
        onSuccess();
        onOpenChange(false);
      }, 300);
    } catch (error: any) {
      clearInterval(progressInterval);
      setUploadProgress(0);
      setLoading(false);
      console.error("Import error:", error);
      
      const responseData = error.response?.data;
      const rowErrors = responseData?.data?.errors;
      
      if (rowErrors && Array.isArray(rowErrors) && rowErrors.length > 0) {
        toast.error(`Import failed: ${rowErrors[0]} ${rowErrors.length > 1 ? `(and ${rowErrors.length - 1} more errors)` : ''}`, {
          duration: 5000,
        });
      } else {
        toast.error(responseData?.message || "Failed to import data");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle>Bulk Import Contractor Returns</DialogTitle>
          <DialogDescription>
            Upload a CSV file containing contractor returns. Download the sample CSV to see the required format.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-6 py-4">
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-medium text-slate-800">1. Download Sample</h4>
            <p className="text-xs text-slate-500 mb-2">
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
                       uploadProgress < 100 ? 'Saving returns to database...' : 'Completed!'}
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
            ) : (
              "Import Data"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
