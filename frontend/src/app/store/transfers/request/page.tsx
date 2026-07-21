"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createStoreTransfer } from "@/features/store/api/store.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";

export default function CreateTransferRequestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Basic Info
  const [requestDate, setRequestDate] = useState(new Date().toISOString().split('T')[0]);
  const [fromStore, setFromStore] = useState("");
  const [toStore, setToStore] = useState("");
  const [remarks, setRemarks] = useState("");

  // Items
  const [items, setItems] = useState<any[]>([]);

  const handleAddItem = () => {
    setItems([...items, { itemId: "", tempCode: "", description: "", unit: "Nos", requestedQty: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const payload = {
        requestDate,
        fromStore,
        toStore,
        status: 'PENDING',
        remarks,
        items
      };
      
      await createStoreTransfer(payload);
      router.push('/store/transfers');
    } catch (error) {
      console.error("Failed to create transfer request", error);
      alert("Failed to create transfer request");
    } finally {
      setLoading(false);
    }
  };

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
            <h1 className="text-2xl font-bold text-slate-800">New Transfer Request</h1>
            <p className="text-slate-500 text-sm">Request material from another store</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 space-y-6">
            
            {/* Basic Info */}
            <div>
              <h2 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Request Date</label>
                  <Input type="date" value={requestDate} onChange={(e) => setRequestDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Remarks / Reason</label>
                  <Input placeholder="Why is this material needed?" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">From Store (Source)</label>
                  <Input placeholder="e.g. Circle A" value={fromStore} onChange={(e) => setFromStore(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">To Store (Destination / Us)</label>
                  <Input placeholder="e.g. Circle B" value={toStore} onChange={(e) => setToStore(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Requested Items */}
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b">
                <h2 className="text-lg font-semibold text-slate-800">Requested Items</h2>
                <Button variant="outline" size="sm" onClick={handleAddItem}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 border border-dashed rounded-lg text-slate-500">
                  No items added yet. Click "Add Item" to request materials.
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={index} className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 relative">
                      <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="md:col-span-1">
                          <label className="block text-xs font-medium text-slate-500 mb-1">Temp Code</label>
                          <Input 
                            value={item.tempCode} 
                            onChange={(e) => handleItemChange(index, 'tempCode', e.target.value)} 
                            placeholder="T-123" 
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
                          <Input 
                            value={item.description} 
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)} 
                            placeholder="Material name" 
                          />
                        </div>
                        <div className="md:col-span-1">
                          <label className="block text-xs font-medium text-slate-500 mb-1">Unit</label>
                          <Input 
                            value={item.unit} 
                            onChange={(e) => handleItemChange(index, 'unit', e.target.value)} 
                          />
                        </div>
                        <div className="md:col-span-1">
                          <label className="block text-xs font-medium text-slate-500 mb-1">Req. Qty</label>
                          <Input 
                            type="number" 
                            min="0"
                            value={item.requestedQty} 
                            onChange={(e) => handleItemChange(index, 'requestedQty', Number(e.target.value))} 
                          />
                        </div>
                      </div>
                      <button 
                        onClick={() => handleRemoveItem(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded mt-5"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
          
          <div className="p-4 bg-slate-50 border-t flex justify-end gap-3">
            <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading || items.length === 0} className="bg-blue-600 hover:bg-blue-700">
              {loading ? "Submitting..." : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Submit Request
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
