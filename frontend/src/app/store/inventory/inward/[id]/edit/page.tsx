"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getInwardEntryById, updateInwardEntry } from "@/features/store/api/store.api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Send } from "lucide-react";

export default function EditInwardRegistrationForm() {
  const params = useParams();
  const router = useRouter();
  const entryId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(entryId);

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
    async function loadData() {
      try {
        const res = await getInwardEntryById(entryId);
        const entry = res.data;
        if (entry) {
          setExistingId(entry._id);
          
          let primaryPackType = 'BOX';
          let primaryPackQty = 0;
          
          if (entry.packingList && entry.packingList.length > 0) {
            const mainPack = entry.packingList.find((p:any) => p.quantity > 0) || entry.packingList[0];
            primaryPackType = mainPack.packType;
            primaryPackQty = mainPack.quantity;
          }

          const cgstRate = entry.cgst || 0;
          const sgstRate = entry.sgst || 0;
          const igstRate = entry.igst || 0;
          const totalQty = entry.totalQty || entry.invoiceQty || 0;
          const rate = entry.rate || 0;
          const taxableAmount = totalQty * rate;
          const cgstAmount = (taxableAmount * cgstRate) / 100;
          const sgstAmount = (taxableAmount * sgstRate) / 100;
          const igstAmount = (taxableAmount * igstRate) / 100;
          const amount = taxableAmount + cgstAmount + sgstAmount + igstAmount;

          setFormData({
            ...entry,
            description: entry.itemDescription || entry.itemName || (entry.itemId?.dynamicData?.name) || '',
            unit: entry.unit || (entry.itemId?.dynamicData?.unit) || '',
            serialNumber: entry.serialNumber || (entry.itemId?.dynamicData?.sku) || '',
            invoiceDate: entry.invoiceDate ? entry.invoiceDate.split('T')[0] : '',
            grDate: entry.grDate ? entry.grDate.split('T')[0] : '',
            receivedDate: entry.receivedDate ? entry.receivedDate.split('T')[0] : new Date().toISOString().split('T')[0],
            packType: primaryPackType,
            packQty: primaryPackQty,
            cgstRate,
            sgstRate,
            igstRate,
            gst: (cgstRate + sgstRate + igstRate).toString(),
            taxableAmount,
            cgst: cgstAmount,
            sgst: sgstAmount,
            igst: igstAmount,
            amount,
          });
        }
      } catch (err) {
        console.error(err);
        alert("Failed to load prefill data");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [entryId]);

  // Real-time calculations when Item row inputs change
  const handleItemChange = (field: string, value: any) => {
    setFormData((prev: any) => {
      const updated = { ...prev, [field]: value };
      
      const qty = Number(updated.invoiceQty) || 0;
      const rate = Number(updated.rate) || 0;
      
      const taxableAmount = qty * rate;
      
      updated.taxableAmount = taxableAmount;
      updated.cgst = (taxableAmount * (updated.cgstRate || 0)) / 100;
      updated.sgst = (taxableAmount * (updated.sgstRate || 0)) / 100;
      updated.igst = (taxableAmount * (updated.igstRate || 0)) / 100; 
      updated.amount = taxableAmount + updated.cgst + updated.sgst + updated.igst;

      return updated;
    });
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (status: 'DRAFT' | 'SUBMITTED' = 'SUBMITTED') => {
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        status,
        invoiceDate: formData.invoiceDate || undefined,
        grDate: formData.grDate || undefined,
        receivedDate: formData.receivedDate || undefined,
        poDate: formData.poDate || undefined,
        packingList: [{
          packType: formData.packType,
          quantity: Number(formData.packQty) || 0,
          packUnit: formData.packUnit
        }]
      };

      if (!existingId) {
        alert("Error: Entry ID not found");
        return;
      }
      
      await updateInwardEntry(existingId, payload);
      alert(`Entry ${status === 'DRAFT' ? 'saved as draft' : 'submitted'} successfully!`);
      router.push("/store/receipts");
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.message || "Failed to update entry");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAuditReasonChange = (e: any) => {
    setFormData({ ...formData, auditReason: e.target.value });
  };

  const formatDate = (val: string) => val ? new Date(val).toLocaleDateString() : '-';

  if (loading) return <div className="p-8 text-center text-slate-500">Loading...</div>;

  return (
    <div className="flex-1 bg-slate-50 min-h-screen">
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/store/receipts")} className="text-slate-500 rounded-full hover:bg-slate-100">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Edit Inward Entry</h1>
            <p className="text-xs text-slate-500 mt-0.5">Edit GRN details below</p>
          </div>
        </div>
      </div>
      
      <div className="max-w-[1400px] mx-auto p-6 space-y-6">
        
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
              <span className="block text-xs font-semibold text-slate-400 uppercase">Vendor Name</span>
              <span className="text-sm font-medium text-slate-800">{formData.vendorName || '-'}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-slate-400 uppercase">Billing From</span>
              <span className="text-sm font-medium text-slate-800">{formData.billingFrom || '-'}</span>
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
                value={formData.invoiceNumber || ''} 
                onChange={e => handleInputChange('invoiceNumber', e.target.value)} 
                className="h-9 border-blue-200 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-600 mb-1">Invoice Date</label>
              <Input 
                type="date"
                value={formData.invoiceDate || ''} 
                onChange={e => handleInputChange('invoiceDate', e.target.value)} 
                className="h-9 border-blue-200 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-600 mb-1">Transport Name</label>
              <Input 
                value={formData.transportName || ''} 
                onChange={e => handleInputChange('transportName', e.target.value)} 
                className="h-9 border-blue-200 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-600 mb-1">Truck Number</label>
              <Input 
                value={formData.truckNumber || ''} 
                onChange={e => handleInputChange('truckNumber', e.target.value)} 
                className="h-9 border-blue-200 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-600 mb-1">GR Number</label>
              <Input 
                value={formData.grNumber || ''} 
                onChange={e => handleInputChange('grNumber', e.target.value)} 
                className="h-9 border-blue-200 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-600 mb-1">GR Date</label>
              <Input 
                type="date"
                value={formData.grDate || ''} 
                onChange={e => handleInputChange('grDate', e.target.value)} 
                className="h-9 border-blue-200 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-600 mb-1">Bilty Number</label>
              <Input 
                value={formData.biltyNumber || ''} 
                onChange={e => handleInputChange('biltyNumber', e.target.value)} 
                className="h-9 border-blue-200 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-600 mb-1">Received Date</label>
              <Input 
                type="date"
                value={formData.receivedDate || ''} 
                onChange={e => handleInputChange('receivedDate', e.target.value)} 
                className="h-9 border-blue-200 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-600 mb-1">Remarks</label>
              <Input 
                value={formData.remarks || ''} 
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
                  <th className="px-4 py-3 border-r">LOA Serial No</th>
                  <th className="px-4 py-3 border-r">Temp Code</th>
                  <th className="px-4 py-3 border-r">HSN Code</th>
                  <th className="px-4 py-3 border-r">Unit</th>
                  <th className="px-4 py-3 border-r">Challan Qty</th>
                  <th className="px-4 py-3 border-r">Received Qty</th>
                  <th className="px-4 py-3 border-r text-red-600 bg-red-50/50">Rejected Qty</th>
                  <th className="px-4 py-3 border-r bg-blue-50">Accepted Qty</th>
                  <th className="px-4 py-3 border-r bg-blue-50">Pack Type</th>
                  <th className="px-4 py-3 border-r bg-blue-50">Pack Unit</th>
                  <th className="px-4 py-3 border-r bg-blue-50">Pack Qty</th>
                  <th className="px-4 py-3 border-r bg-blue-50">Rate (₹)</th>
                  <th className="px-4 py-3 border-r bg-blue-50">GST %</th>
                  <th className="px-4 py-3 border-r bg-slate-50 text-slate-500">Taxable Amt (₹)</th>
                  <th className="px-4 py-3 border-r bg-slate-50 text-slate-500">CGST (₹)</th>
                  <th className="px-4 py-3 border-r bg-slate-50 text-slate-500">SGST (₹)</th>
                  <th className="px-4 py-3 border-r bg-slate-50 text-slate-500">IGST (₹)</th>
                  <th className="px-4 py-3 bg-slate-50 text-slate-500 font-bold">Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 border-r border-slate-100 text-center font-medium">1</td>
                  <td className="px-4 py-3 border-r border-slate-100 whitespace-normal">
                    <div className="font-medium text-slate-800">{formData.description || '-'}</div>
                  </td>
                  <td className="px-4 py-3 border-r border-slate-100 font-medium text-slate-700">
                    {formData.serialNumber || '-'}
                  </td>
                  <td className="px-4 py-3 border-r border-slate-100 font-medium text-slate-700">
                    {formData.tempCode || '-'}
                  </td>
                  <td className="px-4 py-3 border-r border-slate-100">
                    <Input 
                      value={formData.hsnCode || ''} 
                      onChange={e => handleItemChange('hsnCode', e.target.value)}
                      className="h-8 w-24 text-sm"
                    />
                  </td>
                  <td className="px-4 py-3 border-r border-slate-100">
                    <Input 
                      value={formData.unit || ''} 
                      onChange={e => handleItemChange('unit', e.target.value)} 
                      className="h-8 w-16 text-sm"
                    />
                  </td>
                  <td className="px-4 py-3 border-r border-slate-100">
                    <Input 
                      type="number"
                      value={formData.challanQty ?? ''} 
                      onChange={e => handleItemChange('challanQty', e.target.value)} 
                      className="h-8 w-20 text-sm"
                    />
                  </td>
                  <td className="px-4 py-3 border-r border-slate-100 text-center text-slate-600 font-medium">
                    {formData.totalQty}
                  </td>
                  <td className="px-4 py-3 border-r border-slate-100">
                    <Input 
                      type="number"
                      value={formData.rejectedQty ?? ''} 
                      onChange={e => handleItemChange('rejectedQty', e.target.value)} 
                      className="h-8 w-24 text-sm text-red-600 font-semibold border-red-200 focus:border-red-500 bg-red-50/30"
                    />
                  </td>
                  
                  {/* Accepted Qty (was invoiceQty) */}
                  <td className="px-4 py-3 border-r border-slate-100">
                    <Input 
                      type="number"
                      value={formData.invoiceQty ?? ''} 
                      onChange={e => handleItemChange('invoiceQty', e.target.value)} 
                      className="h-8 w-24 text-sm font-semibold text-blue-700 bg-blue-50/50"
                    />
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
                      value={formData.packUnit || ''} 
                      onChange={e => handleItemChange('packUnit', e.target.value)} 
                      className="h-8 w-16 text-sm"
                    />
                  </td>
                  <td className="px-4 py-3 border-r border-slate-100">
                    <Input 
                      type="number"
                      value={formData.packQty ?? ''} 
                      onChange={e => handleItemChange('packQty', e.target.value)} 
                      className="h-8 w-20 text-sm"
                    />
                  </td>

                  {/* Rate */}
                  <td className="px-4 py-3 border-r border-slate-100">
                    <Input 
                      type="number"
                      value={formData.rate ?? ''} 
                      onChange={e => handleItemChange('rate', e.target.value)}
                      className="h-8 w-24 text-sm"
                    />
                  </td>
                  <td className="px-4 py-3 border-r border-slate-100">
                    <Input 
                      type="text"
                      value={formData.gst || ''} 
                      onChange={e => {
                        handleItemChange('gst', e.target.value);
                        // Also roughly estimate rates if it's a number
                        const val = parseFloat(e.target.value) || 0;
                        handleItemChange('igstRate', val);
                        if (val > 0) {
                          handleItemChange('cgstRate', val / 2);
                          handleItemChange('sgstRate', val / 2);
                        }
                      }}
                      className="h-8 w-16 text-sm"
                    />
                  </td>

                  {/* Read Only Calcs */}
                  <td className="px-4 py-3 border-r border-slate-100 bg-slate-50/50 font-medium text-slate-600 text-right">
                    {(formData.taxableAmount || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 border-r border-slate-100 bg-slate-50/50 text-slate-500 text-right">
                    {(formData.cgst || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 border-r border-slate-100 bg-slate-50/50 text-slate-500 text-right">
                    {(formData.sgst || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 border-r border-slate-100 bg-slate-50/50 text-slate-500 text-right">
                    {(formData.igst || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 bg-slate-50/80 font-bold text-slate-800 text-right">
                    {(formData.amount || 0).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {formData.status === 'APPROVED' || formData.status === 'VERIFIED' ? (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 mt-6">
            <h2 className="text-sm font-semibold text-red-600 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Admin Override Reason</h2>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Reason for editing approved GRN <span className="text-red-500">*</span></label>
              <Input value={formData.auditReason || ''} onChange={handleAuditReasonChange} placeholder="Enter reason for audit logs" className="h-9" />
            </div>
          </div>
        ) : null}

        {/* Actions */}
        <div className="mt-8 flex justify-end gap-3 pb-8">
          <Button variant="outline" onClick={() => router.push("/store/receipts")} className="min-w-[120px]">
            Cancel
          </Button>
          <Button 
            onClick={() => handleSubmit('SUBMITTED')} 
            disabled={submitting}
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px] flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {submitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
