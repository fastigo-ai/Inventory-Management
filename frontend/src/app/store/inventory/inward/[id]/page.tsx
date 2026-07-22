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
  const [submitting, setSubmitting] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<any>({
    poNumber: '',
    poDate: '',
    billingFrom: '',
    vendorName: '',
    diRefNo: '',
    circle: '',
    package: '',
    serialNumber: '',
    description: '',
    
    // Editable Header Info
    invoiceNumber: '',
    invoiceDate: '',
    challanNumber: '',
    transportName: '',
    truckNumber: '',
    grNumber: '',
    grDate: '',
    biltyNumber: '',
    receivedDate: '',
    remarks: '',

    // Item Table Data
    tempCode: '',
    hsnCode: '',
    unit: '',
    totalQty: 0,
    invoiceQty: 0,
    rate: 0,
    gst: '0',
    
    // Packing
    packType: 'BOX',
    packUnit: 'Nos',
    packQty: 0,

    // Computed Fields
    taxableAmount: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    amount: 0,
  });

  const packOptions = ['DRUM', 'PACKAGE', 'PACKET', 'BOX', 'BAG', 'OTHER'];

  useEffect(() => {
    if (invoiceId) {
      loadData();
    }
  }, [invoiceId]);

  const loadData = async () => {
    try {
      // 1. Check if an entry exists
      const entriesRes = await queryInwardEntries({ purchaseInvoiceId: invoiceId, status: 'DRAFT' });
      const existingDraft = entriesRes.data?.[0];

      // 2. Load Prefill data
      const prefillRes = await getPurchaseInvoicePrefillData(invoiceId);
      const prefill = prefillRes.data;

      if (existingDraft) {
        setExistingId(existingDraft._id);
        
        let primaryPackType = 'BOX';
        let primaryPackQty = 0;
        
        if (existingDraft.packingList && existingDraft.packingList.length > 0) {
          const mainPack = existingDraft.packingList.find((p:any) => p.quantity > 0) || existingDraft.packingList[0];
          primaryPackType = mainPack.packType;
          primaryPackQty = mainPack.quantity;
        }

        setFormData({
          ...prefill,
          description: prefill.itemName || '',
          invoiceNumber: existingDraft.invoiceNumber || prefill.matchedInvoiceNumber || '',
          invoiceDate: existingDraft.invoiceDate ? existingDraft.invoiceDate.split('T')[0] : (prefill.invoiceDate ? prefill.invoiceDate.split('T')[0] : ''),
          challanNumber: existingDraft.challanNumber || '',
          transportName: existingDraft.transportName || '',
          truckNumber: existingDraft.truckNumber || '',
          grNumber: existingDraft.grNumber || '',
          grDate: existingDraft.grDate ? existingDraft.grDate.split('T')[0] : '',
          biltyNumber: existingDraft.biltyNumber || '',
          receivedDate: existingDraft.receivedDate ? existingDraft.receivedDate.split('T')[0] : '',
          remarks: existingDraft.remarks || '',
          
          tempCode: existingDraft.tempCode || prefill.serialNumber || '',
          hsnCode: existingDraft.hsnCode || prefill.hsnCode || '',
          unit: existingDraft.unit || prefill.unit || '',
          totalQty: existingDraft.totalQty || prefill.totalQty || prefill.invoiceQty || 0,
          invoiceQty: existingDraft.invoiceQty || prefill.invoiceQty || 0,
          rate: existingDraft.rate || prefill.rate || 0,
          gst: existingDraft.gst || prefill.gst || '0',
          
          packType: primaryPackType,
          packUnit: existingDraft.packUnit || 'Nos',
          packQty: primaryPackQty,

          taxableAmount: existingDraft.taxableAmount || prefill.taxableAmount || 0,
          cgst: existingDraft.cgst || prefill.cgst || 0,
          sgst: existingDraft.sgst || prefill.sgst || 0,
          igst: existingDraft.igst || prefill.igst || 0,
          amount: existingDraft.amount || prefill.amount || 0,
        });
      } else {
        setFormData((prev: any) => ({
          ...prev,
          ...prefill,
          description: prefill.itemName || '',
          invoiceNumber: prefill.matchedInvoiceNumber || '',
          invoiceDate: prefill.invoiceDate ? prefill.invoiceDate.split('T')[0] : '',
          tempCode: prefill.serialNumber || '',
          hsnCode: prefill.hsnCode || '',
          unit: prefill.unit || '',
          totalQty: prefill.totalQty || prefill.invoiceQty || 0,
          invoiceQty: prefill.invoiceQty || 0,
          rate: prefill.rate || 0,
          gst: prefill.gst || '0',
          taxableAmount: prefill.taxableAmount || 0,
          cgst: prefill.cgst || 0,
          sgst: prefill.sgst || 0,
          igst: prefill.igst || 0,
          amount: prefill.amount || 0,
        }));
      }
    } catch (error) {
      console.error(error);
      alert("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  // Real-time calculations when Item row inputs change
  const handleItemChange = (field: string, value: any) => {
    setFormData((prev: any) => {
      const updated = { ...prev, [field]: value };
      
      const qty = Number(updated.invoiceQty) || 0;
      const rate = Number(updated.rate) || 0;
      const gstPercent = parseFloat(updated.gst) || 0;
      
      const taxableAmount = qty * rate;
      const totalGst = (taxableAmount * gstPercent) / 100;
      
      // Split GST implicitly assuming intra-state if no IGST logic is strictly enforced.
      // We will just do half and half for CGST/SGST if IGST is not specifically chosen, 
      // but to keep it simple we'll put it in CGST/SGST by default.
      updated.taxableAmount = taxableAmount;
      updated.cgst = totalGst / 2;
      updated.sgst = totalGst / 2;
      updated.igst = 0; 
      updated.amount = taxableAmount + totalGst;

      return updated;
    });
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (status: 'DRAFT' | 'SUBMITTED') => {
    try {
      setSubmitting(true);
      
      const payload = {
        ...formData,
        purchaseInvoiceId: invoiceId,
        status,
        packingList: [
          { packType: formData.packType, quantity: Number(formData.packQty) }
        ]
      };

      if (existingId) {
        await updateInwardEntry(existingId, payload);
      } else {
        await createInwardEntry(payload);
      }
      router.push('/store/inventory');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save entry');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (val: string) => val ? new Date(val).toLocaleDateString() : '-';

  if (loading) return <div className="p-8 text-center text-slate-500">Loading registration form...</div>;

  return (
    <div className="flex-1 bg-slate-50 min-h-screen pb-32">
      <div className="max-w-[1400px] mx-auto p-6 space-y-6">
        
        {/* Top Actions & Title */}
        <div className="flex items-center space-x-3 mb-2">
          <Button variant="ghost" onClick={() => router.back()} className="h-8 px-2 text-slate-500">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <h1 className="text-2xl font-bold text-slate-800">Inward Registration (GRN)</h1>
        </div>

        {/* Unified Header Summary (Read-Only Context) */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <span className="block text-xs font-semibold text-slate-400 uppercase">PO Number</span>
              <span className="text-sm font-medium text-slate-800">{formData.poNumber || '-'}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-slate-400 uppercase">PO Date</span>
              <span className="text-sm font-medium text-slate-800">{formatDate(formData.poDate)}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-slate-400 uppercase">Party Name</span>
              <span className="text-sm font-medium text-slate-800">{formData.billingFrom || '-'}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-slate-400 uppercase">Vendor Name</span>
              <span className="text-sm font-medium text-slate-800">{formData.vendorName || '-'}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-slate-400 uppercase">DI Ref No</span>
              <span className="text-sm font-medium text-slate-800">{formData.diRefNo || '-'}</span>
            </div>
          </div>
        </div>

        {/* Common Input Header Details */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-sm font-bold text-slate-700 uppercase mb-4 pb-2 border-b">Document & Transport Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-semibold text-blue-600 mb-1">Invoice Number <span className="text-red-500">*</span></label>
              <Input 
                value={formData.invoiceNumber} 
                onChange={e => handleInputChange('invoiceNumber', e.target.value)} 
                className="h-9 border-blue-200 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-600 mb-1">Invoice Date</label>
              <Input 
                type="date"
                value={formData.invoiceDate} 
                onChange={e => handleInputChange('invoiceDate', e.target.value)} 
                className="h-9 border-blue-200 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-600 mb-1">Challan No.</label>
              <Input 
                value={formData.challanNumber} 
                onChange={e => handleInputChange('challanNumber', e.target.value)} 
                className="h-9 border-blue-200 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-600 mb-1">Transport Name</label>
              <Input 
                value={formData.transportName} 
                onChange={e => handleInputChange('transportName', e.target.value)} 
                className="h-9 border-blue-200 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-600 mb-1">Truck Number</label>
              <Input 
                value={formData.truckNumber} 
                onChange={e => handleInputChange('truckNumber', e.target.value)} 
                className="h-9 border-blue-200 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-600 mb-1">GR Number</label>
              <Input 
                value={formData.grNumber} 
                onChange={e => handleInputChange('grNumber', e.target.value)} 
                className="h-9 border-blue-200 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-600 mb-1">GR Date</label>
              <Input 
                type="date"
                value={formData.grDate} 
                onChange={e => handleInputChange('grDate', e.target.value)} 
                className="h-9 border-blue-200 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-600 mb-1">Bilty Number</label>
              <Input 
                value={formData.biltyNumber} 
                onChange={e => handleInputChange('biltyNumber', e.target.value)} 
                className="h-9 border-blue-200 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-600 mb-1">Received Date</label>
              <Input 
                type="date"
                value={formData.receivedDate} 
                onChange={e => handleInputChange('receivedDate', e.target.value)} 
                className="h-9 border-blue-200 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-600 mb-1">Remarks</label>
              <Input 
                value={formData.remarks} 
                onChange={e => handleInputChange('remarks', e.target.value)} 
                className="h-9 border-blue-200 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Tabular Items Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-700 uppercase">Material Items</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap min-w-[1800px]">
              <thead className="bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="px-4 py-3 border-r">Sr. No</th>
                  <th className="px-4 py-3 border-r min-w-[200px]">Material Description</th>
                  <th className="px-4 py-3 border-r">HSN Code</th>
                  <th className="px-4 py-3 border-r">Unit</th>
                  <th className="px-4 py-3 border-r">Total Qty (Req)</th>
                  <th className="px-4 py-3 border-r bg-blue-50">Pack Type</th>
                  <th className="px-4 py-3 border-r bg-blue-50">Pack Unit</th>
                  <th className="px-4 py-3 border-r bg-blue-50">Pack Qty</th>
                  <th className="px-4 py-3 border-r bg-blue-50">Received Qty</th>
                  <th className="px-4 py-3 border-r bg-blue-50">Rate (₹)</th>
                  <th className="px-4 py-3 border-r bg-blue-50">GST %</th>
                  <th className="px-4 py-3 border-r bg-slate-50 text-slate-500">Taxable Amt (₹)</th>
                  <th className="px-4 py-3 border-r bg-slate-50 text-slate-500">CGST (₹)</th>
                  <th className="px-4 py-3 border-r bg-slate-50 text-slate-500">SGST (₹)</th>
                  <th className="px-4 py-3 bg-slate-50 text-slate-500 font-bold">Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 border-r border-slate-100 text-center font-medium">1</td>
                  <td className="px-4 py-3 border-r border-slate-100 whitespace-normal">
                    <div className="font-medium text-slate-800">{formData.description || formData.tempCode || '-'}</div>
                    <div className="text-xs text-slate-400 mt-0.5">SN: {formData.serialNumber || '-'}</div>
                  </td>
                  <td className="px-4 py-3 border-r border-slate-100">
                    <Input 
                      value={formData.hsnCode} 
                      onChange={e => handleItemChange('hsnCode', e.target.value)} 
                      className="h-8 w-24 text-sm"
                    />
                  </td>
                  <td className="px-4 py-3 border-r border-slate-100">
                    <Input 
                      value={formData.unit} 
                      onChange={e => handleItemChange('unit', e.target.value)} 
                      className="h-8 w-16 text-sm"
                    />
                  </td>
                  <td className="px-4 py-3 border-r border-slate-100 text-center text-slate-600 font-medium">
                    {formData.totalQty}
                  </td>
                  
                  {/* Pack Details */}
                  <td className="px-4 py-3 border-r border-slate-100">
                    <select 
                      className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                      value={formData.packType}
                      onChange={e => handleItemChange('packType', e.target.value)}
                    >
                      {packOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 border-r border-slate-100">
                    <Input 
                      value={formData.packUnit} 
                      onChange={e => handleItemChange('packUnit', e.target.value)} 
                      className="h-8 w-16 text-sm"
                    />
                  </td>
                  <td className="px-4 py-3 border-r border-slate-100">
                    <Input 
                      type="number"
                      value={formData.packQty || ''} 
                      onChange={e => handleItemChange('packQty', e.target.value)} 
                      className="h-8 w-20 text-sm"
                    />
                  </td>

                  {/* Quantity & Rate */}
                  <td className="px-4 py-3 border-r border-slate-100">
                    <Input 
                      type="number"
                      value={formData.invoiceQty || ''} 
                      onChange={e => handleItemChange('invoiceQty', e.target.value)} 
                      className="h-8 w-24 text-sm font-semibold text-blue-700 bg-blue-50/50"
                    />
                  </td>
                  <td className="px-4 py-3 border-r border-slate-100">
                    <Input 
                      type="number"
                      value={formData.rate || ''} 
                      onChange={e => handleItemChange('rate', e.target.value)} 
                      className="h-8 w-24 text-sm"
                    />
                  </td>
                  <td className="px-4 py-3 border-r border-slate-100">
                    <Input 
                      type="number"
                      value={formData.gst || ''} 
                      onChange={e => handleItemChange('gst', e.target.value)} 
                      className="h-8 w-16 text-sm"
                    />
                  </td>

                  {/* Read Only Calcs */}
                  <td className="px-4 py-3 border-r border-slate-100 bg-slate-50/50 font-medium text-slate-600 text-right">
                    {formData.taxableAmount.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 border-r border-slate-100 bg-slate-50/50 text-slate-500 text-right">
                    {formData.cgst.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 border-r border-slate-100 bg-slate-50/50 text-slate-500 text-right">
                    {formData.sgst.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 bg-slate-50/80 font-bold text-slate-800 text-right">
                    {formData.amount.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Floating Action Footer */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="text-sm font-medium text-slate-500">
            {existingId ? "Editing Draft Registration" : "New Inward Registration"}
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => handleSubmit('DRAFT')}
              disabled={submitting}
              className="border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <Save className="w-4 h-4 mr-2" />
              Save as Draft
            </Button>
            <Button 
              onClick={() => handleSubmit('SUBMITTED')}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Send className="w-4 h-4 mr-2" />
              Submit GRN
            </Button>
          </div>
        </div>
      </div>

    </div>
  );
}
