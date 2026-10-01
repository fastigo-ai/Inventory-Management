'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Save, Loader2, Upload, FileSpreadsheet, Download } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { api } from '@/shared/api/axios';
import { createContractorInvoice } from '@/features/contractor-billing/api/contractor-billing.api';
import { getItems } from '@/features/items/api/items.api';

export default function LegacyBulkUpload() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [uploadType, setUploadType] = useState<'Contractor Bill' | 'Erection Bill'>('Erection Bill');
  const [fileName, setFileName] = useState('');

  // Parsed Data
  const [parsedMetadata, setParsedMetadata] = useState<any>({});
  const [parsedItems, setParsedItems] = useState<any[]>([]);
  const [masterItems, setMasterItems] = useState<any[]>([]);

  useEffect(() => {
    // Fetch Master Items for mapping
    getItems({ limit: 50000 }).then(res => {
      const items = res?.items || res?.data?.items || (Array.isArray(res) ? res : res.data) || [];
      setMasterItems(items);
    }).catch(console.error);
  }, []);



  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        // Read as 2D array to find headers reliably
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        
        let headerRowIndex = -1;
        const metadata: any = {};
        
        // Find Header Row ('Loa serial no') and parse metadata above it
        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length === 0) continue;
          
          const firstCell = String(row[0] || '').trim().toLowerCase();
          
          if (firstCell === 'loa serial no') {
            headerRowIndex = i;
            break;
          }
          
          // It's metadata
          if (row[0] && row[1] !== undefined) {
            const key = String(row[0]).trim();
            const val = String(row[1]).trim();
            if (key.toLowerCase().includes('erection bill type')) metadata.stage = val;
            if (key.toLowerCase().includes('name of package')) metadata.package = val;
            if (key.toLowerCase().includes('name of circle')) metadata.circle = val;
            if (key.toLowerCase().includes('name of work')) metadata.workName = val;
            if (key.toLowerCase().includes('name of employer')) metadata.employerName = val;
            if (key.toLowerCase().includes('billed by')) metadata.billedBy = val;
          }
        }
        
        if (headerRowIndex === -1) {
          toast.error("Could not find 'Loa serial no' header row in Excel.");
          return;
        }

        const headers = data[headerRowIndex].map(h => String(h || '').trim().toLowerCase());
        const loaIdx = headers.findIndex(h => h === 'loa serial no');
        const qtyIdx = headers.findIndex(h => h === 'erected qty');
        const gstIdx = headers.findIndex(h => h.includes('gst'));
        const nameIdx = headers.findIndex(h => h === 'item name');
        const raBillNoIdx = headers.findIndex(h => h === 'ra bill no' || h === 'ra bill');
        const unitIdx = headers.findIndex(h => h === 'unit');
        const finalAmountIdx = headers.findIndex(h => h.includes('final bill amount') || h.includes('final'));

        if (loaIdx === -1 || qtyIdx === -1) {
          toast.error("Required columns ('Loa serial no' and 'Erected qty') missing.");
          return;
        }

        const items: any[] = [];
        let missingItemsCount = 0;

        for (let i = headerRowIndex + 1; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length === 0 || !row[loaIdx]) continue;

          const loaNo = String(row[loaIdx]).trim();
          const erectedQty = Number(row[qtyIdx]) || 0;
          if (erectedQty <= 0) continue;

          // Find Item in Master DB
          const masterItem = masterItems.find(m => {
            const mLoa = String(m.dynamicData?.loaSrNo || m.dynamicData?.loaSerialNo || m.loaSrNo || m.loaSerialNo || m.sku || '').trim();
            return mLoa.toLowerCase() === loaNo.toLowerCase();
          });

          if (!masterItem) {
            missingItemsCount++;
            continue;
          }

          // Extract Erection Rate
          const dynamicData = masterItem.dynamicData || {};
          let grossRate = 0;
          if (uploadType === 'Erection Bill') {
            grossRate = (Number(dynamicData.erectionRateWithGst) || Number(dynamicData.erectionRate) || Number(dynamicData.contractorErectionRate) || 0);
          } else {
            grossRate = (Number(dynamicData.supplyRateWithGst) || Number(dynamicData.supplyRate) || Number(dynamicData.boqRate) || Number(masterItem.boqRate) || 0);
          }
          
          const baseRate = Number((grossRate > 0 && grossRate !== 1 ? grossRate / 1.18 : grossRate).toFixed(2));
          const gstRate = Number(row[gstIdx]) || 18;
          
          const baseAmount = baseRate * erectedQty;
          const gstAmount = baseAmount * (gstRate / 100);

          items.push({
            itemId: masterItem._id,
            activity: masterItem.dynamicData?.activity || masterItem.activity || 'Legacy Activity',
            description: row[nameIdx] || masterItem.dynamicData?.itemName || masterItem.dynamicData?.description || masterItem.itemName || 'Unknown Item',
            billingCategory: uploadType === 'Erection Bill' ? 'Erection' : 'Supply',
            jmcDoneQty: erectedQty,
            erectedQty: erectedQty,
            rate: baseRate,
            gstRate,
            baseAmount,
            gstAmount,
            totalAmount: baseAmount + gstAmount,
            legacyData: {
              unit: unitIdx !== -1 ? String(row[unitIdx] || '') : undefined,
              finalBillAmount: finalAmountIdx !== -1 ? Number(row[finalAmountIdx]) || 0 : undefined,
              raBillNo: raBillNoIdx !== -1 ? String(row[raBillNoIdx] || '') : undefined
            },
            _parsedLoa: loaNo // For display only
          });
        }

        if (missingItemsCount > 0) {
          toast.warning(`${missingItemsCount} items were skipped because their LOA Serial No didn't match the Master DB.`);
        }

        setParsedMetadata(metadata);
        setParsedItems(items);
        toast.success(`Successfully parsed ${items.length} items from Excel.`);

      } catch (err) {
        console.error(err);
        toast.error("Failed to parse Excel file.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDownloadTemplate = () => {
    const ws_data = [
      ['Erection Bill Type', '90%'],
      ['Name of Package', ''],
      ['Name of circle', ''],
      ['Name of work', ''],
      ['Name of employer', ''],
      ['Billed by', ''],
      ['Loa serial no', 'Item name', 'Unit', 'Erected qty', 'Gst%', 'Final Bill amount'],
      ['LOA-12345', 'Sample Item 1', 'NOS', 10, 18, 0],
      ['LOA-67890', 'Sample Item 2', 'MTR', 50, 18, 0]
    ];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Legacy_Bulk_Upload_Template.xlsx");
  };

  const handleSubmit = async () => {
    if (parsedItems.length === 0) return toast.error("No valid items parsed to submit.");
    if (!parsedMetadata.stage) return toast.error("Billing Stage is missing from Excel metadata (e.g. '90%').");

    try {
      setLoading(true);
      const payload = {
        billingCategory: uploadType,
        stage: parsedMetadata.stage,
        isLegacyBulkUpload: true, // Special flag for backend bypass
        lineItems: parsedItems,
        legacyMetadata: parsedMetadata,
        supplyBasis: 'Legacy Bulk',
        jmcDocUrl: 'https://placeholder.url/legacy-bulk-upload', // Dummy URLs since it's legacy bulk
        signedBillDocUrl: 'https://placeholder.url/legacy-bulk-upload'
      };

      await createContractorInvoice(payload);
      toast.success(`${uploadType} (Legacy Bulk) submitted successfully!`);
      router.push('/site-portal/contractor-billing');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to submit bulk bill');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-32">
      <div className="max-w-6xl mx-auto pt-8 px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()} className="h-10 w-10 bg-white shadow-sm border-slate-200 hover:bg-slate-100 transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Legacy Bulk Upload</h1>
              <p className="text-sm text-slate-500 mt-1">Upload historical erection or supply bills via spreadsheet.</p>
            </div>
          </div>
          <Button variant="secondary" onClick={handleDownloadTemplate} className="bg-white shadow-sm border border-slate-200 text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50 hover:border-indigo-200 transition-all">
            <Download className="w-4 h-4 mr-2" />
            Download Excel Template
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Configuration & Upload */}
          <div className="lg:col-span-1 space-y-6">
            
            <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
              <div className="bg-indigo-600/5 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">1</span>
                <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-900">Configuration</h2>
              </div>
              <CardContent className="p-6">
                <div className="space-y-2">
                  <Label className="text-slate-700 font-semibold text-sm">Upload Category</Label>
                  <select
                    className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors cursor-pointer"
                    value={uploadType}
                    onChange={(e: any) => { 
                      setUploadType(e.target.value); 
                      setParsedItems([]); 
                      setFileName(''); 
                      setParsedMetadata({});
                    }}
                  >
                    <option value="Erection Bill">Erection Bill (Bulk)</option>
                    <option value="Contractor Bill">Contractor Bill / Supply (Bulk)</option>
                  </select>
                  <p className="text-xs text-slate-500 pt-1 leading-relaxed">Select the category of the historical records you are uploading.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
              <div className="bg-indigo-600/5 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">2</span>
                <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-900">File Upload</h2>
              </div>
              <CardContent className="p-6">
                <Label className="block mb-3 text-sm font-semibold text-slate-700">Spreadsheet File</Label>
                <div className="mt-2 flex justify-center rounded-xl border-2 border-dashed border-slate-300 px-6 py-10 hover:bg-slate-50 hover:border-indigo-400 transition-all relative group cursor-pointer">
                  <div className="text-center">
                    <Upload className="mx-auto h-10 w-10 text-slate-400 group-hover:text-indigo-500 transition-colors" aria-hidden="true" />
                    <div className="mt-4 flex text-sm leading-6 text-slate-600 justify-center">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer rounded-md bg-transparent font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500"
                      >
                        <span>Click to upload</span>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs leading-5 text-slate-500 mt-1">XLSX, XLS up to 10MB</p>
                    
                    {fileName && (
                      <div className="mt-4 inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 py-1.5 px-3 rounded-md text-xs font-medium max-w-full">
                        <FileSpreadsheet className="w-4 h-4 shrink-0" />
                        <span className="truncate">{fileName}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Right Column: Preview & Action */}
          <div className="lg:col-span-2 space-y-6">
            
            {parsedItems.length === 0 ? (
              <Card className="border-slate-200 border-dashed shadow-sm bg-slate-50/50 flex items-center justify-center h-full min-h-[400px]">
                <div className="text-center p-8 max-w-sm">
                  <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No Data Parsed</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Upload your formatted Excel sheet to see a preview of the extracted items, quantities, and calculated amounts before finalizing.
                  </p>
                </div>
              </Card>
            ) : (
              <Card className="border-slate-200 shadow-md bg-white flex flex-col h-full max-h-[800px]">
                <CardHeader className="bg-white border-b border-slate-100 py-4 shrink-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-slate-900 text-lg font-bold flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-green-600" />
                        Parsed Overview
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Review the matched items and calculated amounts.
                      </CardDescription>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 text-sm bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 font-medium">Stage:</span>
                        <span className="font-bold text-indigo-700 bg-indigo-100/50 px-2 py-0.5 rounded">{parsedMetadata.stage || 'N/A'}</span>
                      </div>
                      <div className="w-px h-4 bg-slate-300"></div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 font-medium">Circle:</span>
                        <span className="font-bold text-slate-700">{parsedMetadata.circle || 'N/A'}</span>
                      </div>
                      <div className="w-px h-4 bg-slate-300"></div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 font-medium">Valid Items:</span>
                        <span className="font-bold text-slate-700">{parsedItems.length}</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
                  <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                      <thead className="text-[11px] text-slate-500 bg-slate-50 uppercase font-bold sticky top-0 border-b border-slate-200 shadow-sm z-10">
                        <tr>
                          <th className="px-5 py-4 tracking-wider">LOA Sl No</th>
                          <th className="px-5 py-4 tracking-wider min-w-[200px]">Description</th>
                          <th className="px-5 py-4 tracking-wider text-right">Erected Qty</th>
                          <th className="px-5 py-4 tracking-wider text-right">Base Rate</th>
                          <th className="px-5 py-4 tracking-wider text-center">GST %</th>
                          <th className="px-5 py-4 tracking-wider text-right">Base Amount</th>
                          <th className="px-5 py-4 tracking-wider text-right">Total Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedItems.map((item, idx) => (
                          <tr key={idx} className="bg-white hover:bg-slate-50 transition-colors group">
                            <td className="px-5 py-3 font-semibold text-slate-700">{item._parsedLoa}</td>
                            <td className="px-5 py-3 text-xs text-slate-600 max-w-[250px] truncate" title={item.description}>
                              {item.description}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <span className="inline-flex items-center justify-center bg-indigo-50 text-indigo-700 font-bold px-2 py-1 rounded">
                                {item.erectedQty}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right text-slate-600">₹{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td className="px-5 py-3 text-center text-slate-400">{item.gstRate}%</td>
                            <td className="px-5 py-3 text-right font-medium text-slate-700">₹{item.baseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td className="px-5 py-3 text-right font-bold text-slate-900">₹{item.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Footer / Summary Row */}
                  <div className="bg-slate-900 text-white px-5 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 rounded-b-lg">
                    <div className="text-sm font-medium text-slate-300 uppercase tracking-wider">
                      Grand Totals
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="flex flex-col items-end">
                        <span className="text-xs text-slate-400">Total Base</span>
                        <span className="font-semibold">₹{parsedItems.reduce((acc, curr) => acc + curr.baseAmount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-xs text-slate-400">Total + GST</span>
                        <span className="font-bold text-lg text-green-400">₹{parsedItems.reduce((acc, curr) => acc + curr.totalAmount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_10px_-2px_rgba(0,0,0,0.05)] z-40 lg:pl-64 transition-all">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <p className="text-sm text-slate-500 hidden sm:block">
            {parsedItems.length > 0 ? `Ready to submit ${parsedItems.length} records.` : 'Please upload a file to proceed.'}
          </p>
          <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
            <Button variant="ghost" onClick={() => router.back()} className="font-medium text-slate-600 hover:text-slate-900">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading || parsedItems.length === 0} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 font-semibold px-6 min-w-[160px]"
            >
              {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {loading ? 'Processing...' : 'Submit Bulk Upload'}
            </Button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1; 
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8; 
        }
      `}</style>
    </div>
  );
}
