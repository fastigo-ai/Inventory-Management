"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getInwardEntriesByInvoice, bulkUpdateInwardEntries } from "@/features/store/api/store.api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Send, CheckCircle2, Package, Truck } from "lucide-react";

const packOptions = ['DRUM', 'PACKAGE', 'PACKET', 'BOX', 'BAG', 'OTHER'];

export default function BulkInwardGRNPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const invoiceId = params.id as string;

  // Scoping params passed from receipts list (circle + subcircle + package)
  const circleScope = searchParams.get('circle') || undefined;
  const subcircleScope = searchParams.get('subcircle') || undefined;
  const packageScope = searchParams.get('package') || undefined;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invoice, setInvoice] = useState<any>(null);

  // Common fields (same for all items)
  const [common, setCommon] = useState({
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
  });

  // Per-item editable data
  const [itemRows, setItemRows] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await getInwardEntriesByInvoice(invoiceId, {
          circle: circleScope,
          subcircle: subcircleScope,
          package: packageScope
        });
        const entries: any[] = res.data || [];
        if (entries.length === 0) { router.back(); return; }

        const first = entries[0];
        setInvoice(first);

        // Pre-fill common fields from first entry
        setCommon({
          invoiceNumber: first.invoiceNumber || '',
          invoiceDate: first.invoiceDate ? first.invoiceDate.split('T')[0] : '',
          challanNumber: first.challanNumber || '',
          transportName: first.transportName || '',
          truckNumber: first.truckNumber || '',
          grNumber: first.grNumber || '',
          grDate: first.grDate ? first.grDate.split('T')[0] : new Date().toISOString().split('T')[0],
          biltyNumber: first.biltyNumber || '',
          receivedDate: first.receivedDate ? first.receivedDate.split('T')[0] : new Date().toISOString().split('T')[0],
          remarks: first.remarks || '',
        });

        // Build per-item rows
        const rows = entries.map((entry: any) => {
          const packEntry = entry.packingList?.[0];
          const invoiceQty = (entry.status === 'PENDING_RECEIPT' || (entry.invoiceQty ?? 0) < 0)
            ? entry.totalQty
            : entry.invoiceQty;
          return {
            _id: entry._id,
            status: entry.status,
            description: entry.itemName || entry.itemDescription || '-',
            serialNumber: entry.serialNumber || '-',
            tempCode: entry.tempCode || '-',
            hsnCode: entry.hsnCode || '',
            unit: entry.unit || '',
            totalQty: entry.totalQty ?? 0,
            challanQty: entry.challanQty ?? '',
            invoiceQty: invoiceQty ?? 0,
            rejectedQty: entry.rejectedQty ?? 0,
            srt: entry.srt ?? '',
            act: entry.act ?? '',
            rate: entry.rate ?? 0,
            packType: packEntry?.packType || 'BOX',
            packUnit: packEntry?.packUnit || 'Box',
            packQty: packEntry?.quantity || invoiceQty || 0,
            cgstRate: entry.cgst || 0,
            sgstRate: entry.sgst || 0,
            igstRate: entry.igst || 0,
          };
        });
        setItemRows(rows);
      } catch (err) {
        console.error(err);
        alert("Failed to load invoice entries");
        router.back();
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [invoiceId]);

  const updateItemRow = (index: number, field: string, value: any) => {
    setItemRows(prev => {
      const updated = [...prev];
      const row = { ...updated[index], [field]: value };

      // Auto-sync packQty with invoiceQty
      if (field === 'invoiceQty') row.packQty = value;

      // Auto update packUnit label for non-OTHER types
      if (field === 'packType' && value !== 'OTHER') {
        row.packUnit = value.charAt(0) + value.slice(1).toLowerCase() + 's';
      }

      const qty = Number(row.invoiceQty) || 0;
      const rate = Number(row.rate) || 0;
      const taxable = qty * rate;
      row.taxableAmount = taxable;
      row.cgstAmount = (taxable * (row.cgstRate || 0)) / 100;
      row.sgstAmount = (taxable * (row.sgstRate || 0)) / 100;
      row.igstAmount = (taxable * (row.igstRate || 0)) / 100;
      row.amount = taxable + row.cgstAmount + row.sgstAmount + row.igstAmount;

      updated[index] = row;
      return updated;
    });
  };

  const handleSubmit = async (status: 'DRAFT' | 'SUBMITTED') => {
    setSubmitting(true);
    try {
      const items = itemRows
        .filter(r => r.status !== 'APPROVED' && r.status !== 'VERIFIED')
        .map(row => ({
          _id: row._id,
          invoiceQty: Number(row.invoiceQty) || 0,
          challanQty: Number(row.challanQty) || 0,
          rejectedQty: Number(row.rejectedQty) || 0,
          rate: Number(row.rate) || 0,
          hsnCode: row.hsnCode,
          unit: row.unit,
          srt: row.srt,
          act: row.act,
          packingList: [{ packType: row.packType, quantity: Number(row.packQty) || 0, packUnit: row.packUnit }],
        }));

      if (items.length === 0) {
        alert("All items are already approved.");
        return;
      }

      const commonDates = {
        ...common,
        invoiceDate: common.invoiceDate || undefined,
        grDate: common.grDate || undefined,
        receivedDate: common.receivedDate || undefined,
      };

      await bulkUpdateInwardEntries(invoiceId, { commonFields: commonDates, items, status });
      alert(`GRN ${status === 'DRAFT' ? 'saved as draft' : 'submitted'} successfully for all ${items.length} item(s)!`);
      router.push('/store/receipts');
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to submit GRN');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Loading invoice details...</p>
        </div>
      </div>
    );
  }

  const isAllApproved = itemRows.every(r => r.status === 'APPROVED' || r.status === 'VERIFIED');

  return (
    <div className="flex-1 bg-slate-50 min-h-screen pb-32">
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()} className="h-8 px-2 text-slate-500">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Inward Registration (GRN)</h1>
            <p className="text-sm text-slate-500 mt-0.5">Invoice: <span className="font-semibold text-slate-700">{common.invoiceNumber || invoiceId}</span> — {itemRows.length} item(s)</p>
          </div>
        </div>

        {/* Context Summary */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'PO Number', value: invoice?.poNumber },
              { label: 'PO Date', value: invoice?.poDate ? new Date(invoice.poDate).toLocaleDateString() : '-' },
              { label: 'Vendor Name', value: invoice?.vendorName },
              { label: 'Billing From', value: invoice?.billingFrom },
              { label: 'DI Ref No', value: invoice?.diRefNo },
              { label: 'Circle', value: invoice?.circle },
              { label: 'Sub-Circle', value: invoice?.subcircle },
              { label: 'Package', value: invoice?.package },
            ].map(f => (
              <div key={f.label}>
                <span className="block text-xs font-semibold text-slate-400 uppercase">{f.label}</span>
                <span className="text-sm font-medium text-slate-800">{f.value || '-'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Document & Transport (Common for all items) */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <Truck className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-bold text-slate-700 uppercase">Document & Transport Details</h2>
            <span className="text-xs text-slate-400 font-normal ml-1">(applies to all items in this invoice)</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { key: 'invoiceNumber', label: 'Invoice Number *', type: 'text' },
              { key: 'invoiceDate', label: 'Invoice Date', type: 'date' },
              { key: 'challanNumber', label: 'Challan Number', type: 'text' },
              { key: 'transportName', label: 'Transport Name', type: 'text' },
              { key: 'truckNumber', label: 'Truck Number', type: 'text' },
              { key: 'grNumber', label: 'GR Number', type: 'text' },
              { key: 'grDate', label: 'GR Date', type: 'date' },
              { key: 'biltyNumber', label: 'Bilty Number', type: 'text' },
              { key: 'receivedDate', label: 'Received Date', type: 'date' },
              { key: 'remarks', label: 'Remarks', type: 'text' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-blue-600 mb-1">{f.label}</label>
                <Input
                  type={f.type}
                  value={(common as any)[f.key] || ''}
                  onChange={e => setCommon(p => ({ ...p, [f.key]: e.target.value }))}
                  className="h-9 border-blue-200 focus:border-blue-500"
                  disabled={isAllApproved}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <Package className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-700 uppercase">Material Items — Enter GRN Details</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap min-w-[2000px]">
              <thead className="bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="px-4 py-3 border-r sticky left-0 bg-slate-100 z-10">Sr.</th>
                  <th className="px-4 py-3 border-r min-w-[200px]">Material Description</th>
                  <th className="px-4 py-3 border-r">LOA Sr No</th>
                  <th className="px-4 py-3 border-r">Temp Code</th>
                  <th className="px-4 py-3 border-r">HSN Code</th>
                  <th className="px-4 py-3 border-r">Unit</th>
                  <th className="px-4 py-3 border-r">Challan Qty</th>
                  <th className="px-4 py-3 border-r">Total Inv Qty</th>
                  <th className="px-4 py-3 border-r">SRT</th>
                  <th className="px-4 py-3 border-r">ACT</th>
                  <th className="px-4 py-3 border-r text-red-600 bg-red-50/50">Rejected Qty</th>
                  <th className="px-4 py-3 border-r bg-blue-50">Received Qty</th>
                  <th className="px-4 py-3 border-r bg-blue-50">Pack Type</th>
                  <th className="px-4 py-3 border-r bg-blue-50">Pack Unit</th>
                  <th className="px-4 py-3 border-r bg-blue-50">Pack Qty</th>
                  <th className="px-4 py-3 border-r bg-blue-50">Rate (₹)</th>
                  <th className="px-4 py-3 border-r bg-slate-50 text-slate-500">Taxable (₹)</th>
                  <th className="px-4 py-3 border-r bg-slate-50 text-slate-500">CGST (₹)</th>
                  <th className="px-4 py-3 border-r bg-slate-50 text-slate-500">SGST (₹)</th>
                  <th className="px-4 py-3 border-r bg-slate-50 text-slate-500">IGST (₹)</th>
                  <th className="px-4 py-3 bg-slate-50 text-slate-500 font-bold">Total (₹)</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {itemRows.map((row, i) => {
                  const isApproved = row.status === 'APPROVED' || row.status === 'VERIFIED';
                  const tdBase = `px-4 py-3 border-r border-slate-100 ${isApproved ? 'bg-emerald-50/30' : ''}`;
                  return (
                    <tr key={row._id} className={`hover:bg-slate-50/30 transition-colors ${isApproved ? 'opacity-75' : ''}`}>
                      <td className={`${tdBase} sticky left-0 bg-white z-10 text-center font-semibold text-slate-500`}>{i + 1}</td>
                      <td className={`${tdBase} whitespace-normal`}>
                        <div className="font-medium text-slate-800">{row.description}</div>
                      </td>
                      <td className={`${tdBase} font-medium text-slate-700`}>{row.serialNumber}</td>
                      <td className={`${tdBase} font-mono text-blue-700`}>{row.tempCode}</td>
                      <td className={tdBase}>
                        <Input value={row.hsnCode} onChange={e => updateItemRow(i, 'hsnCode', e.target.value)} disabled={isApproved} className="h-8 w-24 text-sm" />
                      </td>
                      <td className={tdBase}>
                        <Input value={row.unit} onChange={e => updateItemRow(i, 'unit', e.target.value)} disabled={isApproved} className="h-8 w-16 text-sm" />
                      </td>
                      <td className={tdBase}>
                        <Input type="number" value={row.challanQty} onChange={e => updateItemRow(i, 'challanQty', e.target.value)} disabled={isApproved} className="h-8 w-20 text-sm" />
                      </td>
                      <td className={`${tdBase} text-center font-medium text-slate-600`}>{row.totalQty ?? '-'}</td>
                      <td className={`${tdBase} text-center font-medium text-slate-600`}>{row.srt ?? '-'}</td>
                      <td className={`${tdBase} text-center font-medium text-slate-600`}>{row.act ?? '-'}</td>
                      <td className={tdBase}>
                        <Input type="number" value={row.rejectedQty} onChange={e => updateItemRow(i, 'rejectedQty', e.target.value)} disabled={isApproved} className="h-8 w-24 text-sm text-red-600 font-semibold border-red-200 focus:border-red-500 bg-red-50/30" />
                      </td>
                      <td className={tdBase}>
                        <Input type="number" value={row.invoiceQty} onChange={e => updateItemRow(i, 'invoiceQty', e.target.value)} disabled={isApproved} className="h-8 w-24 text-sm font-semibold text-blue-700 bg-blue-50/50" />
                      </td>
                      <td className={tdBase}>
                        <select className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm" value={row.packType} disabled={isApproved} onChange={e => updateItemRow(i, 'packType', e.target.value)}>
                          {packOptions.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </td>
                      <td className={tdBase}>
                        <Input value={row.packUnit} onChange={e => updateItemRow(i, 'packUnit', e.target.value)} disabled={isApproved || row.packType !== 'OTHER'} className={`h-8 w-20 text-sm ${row.packType !== 'OTHER' ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`} />
                      </td>
                      <td className={tdBase}>
                        <Input type="number" value={row.packQty} onChange={e => updateItemRow(i, 'packQty', e.target.value)} disabled={isApproved} className="h-8 w-20 text-sm" />
                      </td>
                      <td className={tdBase}>
                        <Input type="number" value={row.rate} onChange={e => updateItemRow(i, 'rate', e.target.value)} disabled={isApproved} className="h-8 w-24 text-sm" />
                      </td>
                      <td className={`${tdBase} bg-slate-50/50 font-medium text-slate-600 text-right`}>{(row.taxableAmount || 0).toFixed(2)}</td>
                      <td className={`${tdBase} bg-slate-50/50 text-slate-500 text-right`}>{(row.cgstAmount || 0).toFixed(2)}</td>
                      <td className={`${tdBase} bg-slate-50/50 text-slate-500 text-right`}>{(row.sgstAmount || 0).toFixed(2)}</td>
                      <td className={`${tdBase} bg-slate-50/50 text-slate-500 text-right`}>{(row.igstAmount || 0).toFixed(2)}</td>
                      <td className={`px-4 py-3 bg-slate-50/80 font-bold text-slate-800 text-right ${isApproved ? 'bg-emerald-50/30' : ''}`}>{(row.amount || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        {isApproved ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Floating Footer */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="text-sm font-medium text-slate-500">
            {isAllApproved ? 'All items are approved' : `${itemRows.filter(r => r.status === 'PENDING_RECEIPT').length} item(s) pending submission`}
          </div>
          {!isAllApproved && (
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => handleSubmit('DRAFT')} disabled={submitting} className="border-blue-200 text-blue-700 hover:bg-blue-50">
                <Save className="w-4 h-4 mr-2" /> Save as Draft
              </Button>
              <Button onClick={() => handleSubmit('SUBMITTED')} disabled={submitting} className="bg-green-600 hover:bg-green-700 text-white">
                <Send className="w-4 h-4 mr-2" /> Submit GRN for All Items
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
