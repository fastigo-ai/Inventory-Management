"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getStoreTransferById, receiveStoreTransfer } from "@/features/store/api/store.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save } from "lucide-react";

export default function ReceiveTransferPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [transfer, setTransfer] = useState<any>(null);

  const [formData, setFormData] = useState({
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
      
      await receiveStoreTransfer(id, payload);
      router.push('/store/transfers');
    } catch (error) {
      console.error(error);
      alert("Failed to receive transfer.");
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
            <h1 className="text-2xl font-bold text-slate-800">Register Material Receipt</h1>
            <p className="text-slate-500 text-sm">Receiving from {transfer.fromStore}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 space-y-6">
            
            {/* Header Info */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="block text-xs text-blue-600 font-semibold uppercase">Request Date</span>
                <span className="text-sm text-slate-700">{new Date(transfer.requestDate).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="block text-xs text-blue-600 font-semibold uppercase">From Store</span>
                <span className="text-sm text-slate-700">{transfer.fromStore}</span>
              </div>
              <div>
                <span className="block text-xs text-blue-600 font-semibold uppercase">To Store</span>
                <span className="text-sm text-slate-700">{transfer.toStore}</span>
              </div>
              <div>
                <span className="block text-xs text-blue-600 font-semibold uppercase">Status</span>
                <span className="text-sm font-medium text-slate-800">{transfer.status}</span>
              </div>
            </div>

            {/* Document Info (Read-Only) */}
            <div>
              <h2 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b">Document Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">MIN BOOK No.</label>
                  <div className="text-sm text-slate-800 font-medium">{transfer.minBookNo || "-"}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">MIN No.</label>
                  <div className="text-sm text-slate-800 font-medium">{transfer.minNo || "-"}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">MIN Date</label>
                  <div className="text-sm text-slate-800 font-medium">{transfer.minDate ? new Date(transfer.minDate).toLocaleDateString() : "-"}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Challan No.</label>
                  <div className="text-sm text-slate-800 font-medium">{transfer.challanNo || "-"}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Challan Date</label>
                  <div className="text-sm text-slate-800 font-medium">{transfer.challanDate ? new Date(transfer.challanDate).toLocaleDateString() : "-"}</div>
                </div>
              </div>
            </div>

            {/* Transport Info (Read-Only) */}
            <div>
              <h2 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b">Transport Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Transport Name</label>
                  <div className="text-sm text-slate-800 font-medium">{transfer.transportName || "-"}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Truck No.</label>
                  <div className="text-sm text-slate-800 font-medium">{transfer.truckNumber || "-"}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">GR No.</label>
                  <div className="text-sm text-slate-800 font-medium">{transfer.grNumber || "-"}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">GR Date</label>
                  <div className="text-sm text-slate-800 font-medium">{transfer.grDate ? new Date(transfer.grDate).toLocaleDateString() : "-"}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Driver Name</label>
                  <div className="text-sm text-slate-800 font-medium">{transfer.driverName || "-"}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Driver Mobile No.</label>
                  <div className="text-sm text-slate-800 font-medium">{transfer.driverMobile || "-"}</div>
                </div>
              </div>
            </div>

            {/* Material Received */}
            <div>
              <h2 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b">Material Received</h2>
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
                        <span className="block text-xs font-medium text-slate-500 mb-1">Dispatched</span>
                        <div className="text-sm font-medium text-slate-800">{item.dispatchedQty} {item.unit}</div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Received Qty</label>
                        <Input 
                          type="number" 
                          min="0"
                          value={item.receivedQty || ""} 
                          onChange={(e) => handleItemChange(index, 'receivedQty', Number(e.target.value))} 
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Final Remarks</label>
              <Input name="remarks" value={formData.remarks} onChange={handleInputChange} />
            </div>

          </div>
          
          <div className="p-4 bg-slate-50 border-t flex justify-end gap-3">
            <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-green-600 hover:bg-green-700">
              {submitting ? "Saving..." : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Confirm Receipt
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
