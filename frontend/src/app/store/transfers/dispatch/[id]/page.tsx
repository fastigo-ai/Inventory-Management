"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getStoreTransferById, dispatchStoreTransfer } from "@/features/store/api/store.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Send } from "lucide-react";

export default function DispatchTransferPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [transfer, setTransfer] = useState<any>(null);

  const [formData, setFormData] = useState({
    vendorName: "",
    minBookNo: "",
    minNo: "",
    minDate: "",
    challanNo: "",
    challanDate: "",
    transportName: "",
    truckNumber: "",
    grNumber: "",
    grDate: "",
    driverName: "",
    driverMobile: "",
    remarks: ""
  });

  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (id) fetchTransfer();
  }, [id]);

  const fetchTransfer = async () => {
    try {
      setLoading(true);
      const res = await getStoreTransferById(id);
      setTransfer(res.data);
      setItems(res.data.items || []);
      setFormData({
        ...formData,
        vendorName: res.data.vendorName || "",
        remarks: res.data.remarks || ""
      });
    } catch (error) {
      console.error(error);
      alert("Failed to fetch transfer details.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        items
      };
      
      await dispatchStoreTransfer(id, payload);
      router.push('/store/transfers');
    } catch (error) {
      console.error(error);
      alert("Failed to dispatch transfer.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading transfer data...</div>;
  }

  if (!transfer) {
    return <div className="p-8 text-center text-red-500">Transfer not found.</div>;
  }

  return (
    <div className="flex-1 bg-slate-50 min-h-screen p-6">
      <div className="max-w-[1000px] mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => router.push('/store/transfers')}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Dispatch Material</h1>
            <p className="text-slate-500 text-sm">Dispatching to {transfer.toStore}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 space-y-6">
            
            {/* Header Info */}
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="block text-xs text-purple-600 font-semibold uppercase">Request Date</span>
                <span className="text-sm text-slate-700">{new Date(transfer.requestDate).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="block text-xs text-purple-600 font-semibold uppercase">From Store</span>
                <span className="text-sm text-slate-700">{transfer.fromStore}</span>
              </div>
              <div>
                <span className="block text-xs text-purple-600 font-semibold uppercase">To Store</span>
                <span className="text-sm text-slate-700">{transfer.toStore}</span>
              </div>
              <div>
                <span className="block text-xs text-purple-600 font-semibold uppercase">Status</span>
                <span className="text-sm font-medium text-slate-800">{transfer.status}</span>
              </div>
            </div>

            <div className="pt-2 border-t">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b">Vendor (Original Supplier)</h2>
              <div className="w-full md:w-1/3">
                <Input name="vendorName" placeholder="Name of Vendor" value={formData.vendorName} onChange={handleInputChange} />
              </div>
            </div>

            {/* Document Info */}
            <div>
              <h2 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b">Document Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">MIN BOOK No.</label>
                  <Input name="minBookNo" value={formData.minBookNo} onChange={handleInputChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">MIN No.</label>
                  <Input name="minNo" value={formData.minNo} onChange={handleInputChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">MIN Date</label>
                  <Input type="date" name="minDate" value={formData.minDate} onChange={handleInputChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Challan No.</label>
                  <Input name="challanNo" value={formData.challanNo} onChange={handleInputChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Challan Date</label>
                  <Input type="date" name="challanDate" value={formData.challanDate} onChange={handleInputChange} />
                </div>
              </div>
            </div>

            {/* Transport Info */}
            <div>
              <h2 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b">Transport Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Transport Name</label>
                  <Input name="transportName" value={formData.transportName} onChange={handleInputChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Truck No.</label>
                  <Input name="truckNumber" value={formData.truckNumber} onChange={handleInputChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">GR No.</label>
                  <Input name="grNumber" value={formData.grNumber} onChange={handleInputChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">GR Date</label>
                  <Input type="date" name="grDate" value={formData.grDate} onChange={handleInputChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Driver Name</label>
                  <Input name="driverName" value={formData.driverName} onChange={handleInputChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Driver Mobile No.</label>
                  <Input name="driverMobile" value={formData.driverMobile} onChange={handleInputChange} />
                </div>
              </div>
            </div>

            {/* Material Received */}
            <div>
              <h2 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b">Material to Dispatch</h2>
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="flex flex-col md:flex-row items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                      <div className="col-span-2 md:col-span-2">
                        <span className="block text-xs font-medium text-slate-500 mb-1">Material</span>
                        <div className="text-sm font-medium text-slate-800">{item.description}</div>
                        <div className="text-xs text-slate-500">{item.tempCode}</div>
                      </div>
                      <div>
                        <span className="block text-xs font-medium text-slate-500 mb-1">Requested Qty</span>
                        <div className="text-sm font-medium text-slate-800">{item.requestedQty} {item.unit}</div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Dispatched Qty (Transfer Qty)</label>
                        <Input 
                          type="number" 
                          min="0"
                          value={item.dispatchedQty || ""} 
                          onChange={(e) => handleItemChange(index, 'dispatchedQty', Number(e.target.value))} 
                          className="w-full"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
              <Input name="remarks" value={formData.remarks} onChange={handleInputChange} />
            </div>

          </div>
          
          <div className="p-4 bg-slate-50 border-t flex justify-end gap-3">
            <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-purple-600 hover:bg-purple-700">
              {submitting ? "Saving..." : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Dispatch Material
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
