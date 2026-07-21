"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getPurchaseInvoicePrefillData, createInwardEntry, queryInwardEntries, updateInwardEntry } from "@/features/store/api/store.api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Send } from "lucide-react";

export default function InwardRegistrationForm() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [existingId, setExistingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<any>({
    poNumber: '',
    billingFrom: '',
    vendorName: '',
    invoiceNumber: '',
    unit: '',
    invoiceQty: 0,
    rate: 0,
    amount: 0,
    tempCode: '',
    hsnCode: '',
    challanNumber: '',
    transportName: '',
    truckNumber: '',
    gst: '',
    diRefNo: '',
    circle: '',
    package: '',
    serialNumber: '',
    packingList: [
      { packType: 'DRUM', quantity: 0 },
      { packType: 'PACKAGE', quantity: 0 },
      { packType: 'PACKET', quantity: 0 },
      { packType: 'BOX', quantity: 0 },
      { packType: 'BAG', quantity: 0 },
      { packType: 'OTHER', label: '', quantity: 0 },
    ]
  });

  useEffect(() => {
    if (invoiceId) {
      loadData();
    }
  }, [invoiceId]);

  const loadData = async () => {
    try {
      // 1. Check if an entry exists
      const entriesRes = await queryInwardEntries({ purchaseInvoiceId: invoiceId });
      const existingDraft = entriesRes.data?.[0];

      // 2. Load Prefill data
      const prefillRes = await getPurchaseInvoicePrefillData(invoiceId);
      const prefill = prefillRes.data;

      if (existingDraft) {
        setExistingId(existingDraft._id);
        
        // Merge packing list properly
        const mergedPacking = [...formData.packingList];
        existingDraft.packingList?.forEach((pl: any) => {
          const idx = mergedPacking.findIndex(p => p.packType === pl.packType);
          if (idx !== -1) {
            mergedPacking[idx].quantity = pl.quantity;
            if (pl.packType === 'OTHER') mergedPacking[idx].label = pl.label;
          }
        });

        setFormData({
          ...prefill, // Always prioritize fresh DI/PO fetches for read-only fields
          invoiceNumber: existingDraft.invoiceNumber || prefill.matchedInvoiceNumber || '',
          tempCode: existingDraft.tempCode || '',
          challanNumber: existingDraft.challanNumber || '',
          transportName: existingDraft.transportName || '',
          truckNumber: existingDraft.truckNumber || '',
          diRefNo: existingDraft.diRefNo || prefill.diRefNo || '',
          packingList: mergedPacking
        });
      } else {
        setFormData((prev: any) => ({
          ...prev,
          ...prefill,
          invoiceNumber: prefill.matchedInvoiceNumber || '',
          diRefNo: prefill.diRefNo || ''
        }));
      }

    } catch (error) {
      console.error(error);
      alert("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  const handlePackChange = (index: number, field: string, value: any) => {
    const newList = [...formData.packingList];
    newList[index][field] = field === 'quantity' ? Number(value) : value;
    setFormData({ ...formData, packingList: newList });
  };

  const handleSubmit = async (status: 'DRAFT' | 'SUBMITTED') => {
    try {
      // Filter out zero quantities for packing list
      const finalPackingList = formData.packingList.filter((p: any) => p.quantity > 0);

      const payload = {
        ...formData,
        purchaseInvoiceId: invoiceId,
        status,
        packingList: finalPackingList
      };

      if (existingId) {
        await updateInwardEntry(existingId, payload);
      } else {
        await createInwardEntry(payload);
      }

      router.push('/store/inventory');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save entry');
    }
  };

  const totalPackages = formData.packingList.reduce((acc: number, curr: any) => acc + (curr.quantity || 0), 0);

  if (loading) return <div className="p-8">Loading form...</div>;

  return (
    <div className="flex-1 bg-slate-50 min-h-screen">
      <div className="max-w-[1000px] mx-auto p-6 space-y-6 pb-24">
        
        <div className="flex items-center space-x-3 mb-2">
          <Button variant="ghost" onClick={() => router.back()} className="h-8 px-2 text-slate-500">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <h1 className="text-2xl font-bold text-slate-800">Inward Registration (GRN)</h1>
        </div>

        {/* Section A — PO & DI Reference */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-sm font-bold text-slate-700 uppercase mb-4 border-b pb-2">A. PO & DI Reference</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">PO Number</label>
              <div className="text-sm font-medium text-slate-800 bg-slate-100 p-2 rounded">{formData.poNumber || '-'}</div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Billing From</label>
              <div className="text-sm font-medium text-slate-800 bg-slate-100 p-2 rounded">{formData.billingFrom || '-'}</div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Circle</label>
              <div className="text-sm font-medium text-slate-800 bg-slate-100 p-2 rounded">{formData.circle || '-'}</div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Package</label>
              <div className="text-sm font-medium text-slate-800 bg-slate-100 p-2 rounded">{formData.package || '-'}</div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Serial Number</label>
              <div className="text-sm font-medium text-slate-800 bg-slate-100 p-2 rounded">{formData.serialNumber || '-'}</div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">DI Ref No</label>
              <Input 
                value={formData.diRefNo} 
                onChange={e => setFormData({...formData, diRefNo: e.target.value})} 
                disabled={!!formData.diRefNo && formData.diRefNo === formData.diRefNo /* if it came prefilled, this logic might need tweaking but for now we'll allow edit if user wants, or we can check prefill */}
                className="h-9"
              />
            </div>
          </div>
        </div>

        {/* Section B — Vendor & Invoice */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-sm font-bold text-slate-700 uppercase mb-4 border-b pb-2">B. Vendor & Invoice</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Vendor Name</label>
              <div className="text-sm font-medium text-slate-800 bg-slate-100 p-2 rounded">{formData.vendorName || '-'}</div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Invoice Number <span className="text-red-500">*</span></label>
              <Input 
                value={formData.invoiceNumber} 
                onChange={e => setFormData({...formData, invoiceNumber: e.target.value})} 
                className="h-9"
                placeholder="Enter or confirm invoice number"
              />
              <p className="text-xs text-slate-400 mt-1">Matched with system if left identical to fetched invoice.</p>
            </div>
          </div>
        </div>

        {/* Section C — Item & Value */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-sm font-bold text-slate-700 uppercase mb-4 border-b pb-2">C. Item & Value</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Unit</label>
              <div className="text-sm font-medium text-slate-800 bg-slate-100 p-2 rounded">{formData.unit || '-'}</div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Invoice Qty</label>
              <div className="text-sm font-medium text-slate-800 bg-slate-100 p-2 rounded">{formData.invoiceQty || '0'}</div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Rate</label>
              <div className="text-sm font-medium text-slate-800 bg-slate-100 p-2 rounded">₹{formData.rate || '0'}</div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Amount</label>
              <div className="text-sm font-medium text-slate-800 bg-slate-100 p-2 rounded">₹{formData.amount || '0'}</div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">HSN Code</label>
              <div className="text-sm font-medium text-slate-800 bg-slate-100 p-2 rounded">{formData.hsnCode || '-'}</div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">GST</label>
              <div className="text-sm font-medium text-slate-800 bg-slate-100 p-2 rounded">{formData.gst || '-'}</div>
            </div>
          </div>
        </div>

        {/* Section D — Transport & Handling */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-sm font-bold text-slate-700 uppercase mb-4 border-b pb-2">D. Transport & Handling</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Temp Code</label>
              <Input 
                value={formData.tempCode} 
                onChange={e => setFormData({...formData, tempCode: e.target.value})} 
                className="h-9"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Challan Number</label>
              <Input 
                value={formData.challanNumber} 
                onChange={e => setFormData({...formData, challanNumber: e.target.value})} 
                className="h-9"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Transport Name</label>
              <Input 
                value={formData.transportName} 
                onChange={e => setFormData({...formData, transportName: e.target.value})} 
                className="h-9"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Truck Number</label>
              <Input 
                value={formData.truckNumber} 
                onChange={e => setFormData({...formData, truckNumber: e.target.value})} 
                className="h-9 uppercase"
                placeholder="HP12A1234"
              />
            </div>
          </div>
        </div>

        {/* Section E — Packing List */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-sm font-bold text-slate-700 uppercase mb-4 border-b pb-2">E. Packing List</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
            {formData.packingList.map((pack: any, index: number) => (
              <div key={pack.packType} className="flex items-center space-x-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {pack.packType === 'OTHER' ? 'Others' : `No. of ${pack.packType}S`}
                  </label>
                  {pack.packType === 'OTHER' && (
                    <Input 
                      placeholder="Specify type..." 
                      className="h-8 mb-2 text-xs"
                      value={pack.label || ''}
                      onChange={e => handlePackChange(index, 'label', e.target.value)}
                    />
                  )}
                </div>
                <div className="w-20">
                  <Input 
                    type="number"
                    min="0"
                    className="h-9 text-center font-medium"
                    value={pack.quantity || 0}
                    onChange={e => handlePackChange(index, 'quantity', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-end pt-4 border-t border-slate-100">
            <div className="text-sm font-semibold text-slate-600">
              Total Packages Count: <span className="text-lg text-blue-600 ml-2">{totalPackages}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] flex items-center justify-end px-8 z-50 space-x-4 ml-64">
        <Button variant="outline" onClick={() => handleSubmit('DRAFT')} className="text-slate-600">
          <Save className="w-4 h-4 mr-2" /> Save Draft
        </Button>
        <Button onClick={() => handleSubmit('SUBMITTED')} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Send className="w-4 h-4 mr-2" /> Submit Entry
        </Button>
      </div>
    </div>
  );
}
