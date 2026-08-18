import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getStoreTransferById } from "@/features/store/api/store.api";
import { Loader2 } from "lucide-react";

export function TransferDetailModal({ 
  transferId, 
  isOpen, 
  onClose 
}: { 
  transferId: string | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [transfer, setTransfer] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (transferId && isOpen) {
      loadTransfer();
    } else {
      setTransfer(null);
    }
  }, [transferId, isOpen]);

  const loadTransfer = async () => {
    setLoading(true);
    try {
      const res = await getStoreTransferById(transferId!);
      setTransfer(res.data);
    } catch (error) {
      console.error("Failed to load transfer details", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Outward Transfer Details</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : transfer ? (
          <div className="space-y-6 mt-4">
            <div className="grid grid-cols-3 gap-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div>
                <span className="block text-xs font-semibold text-slate-500 uppercase">Status</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                  transfer.status === 'RECEIVED' ? 'bg-green-100 text-green-800' :
                  transfer.status === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {transfer.status}
                </span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-500 uppercase">Request Date</span>
                <span className="block text-sm font-medium text-slate-800 mt-1">
                  {new Date(transfer.requestDate).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-500 uppercase">Vendor Name</span>
                <span className="block text-sm font-medium text-slate-800 mt-1">{transfer.vendorName || '-'}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-500 uppercase">From Store</span>
                <span className="block text-sm font-medium text-slate-800 mt-1">{transfer.fromStore}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-500 uppercase">To Store</span>
                <span className="block text-sm font-medium text-slate-800 mt-1">{transfer.toStore}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-500 uppercase">Requested By</span>
                <span className="block text-sm font-medium text-slate-800 mt-1">
                  {transfer.requestedBy ? `${transfer.requestedBy.firstName} ${transfer.requestedBy.lastName}` : (transfer.fromStore ? `${transfer.fromStore} Store Manager` : 'System Import')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <h4 className="font-semibold text-slate-700 mb-3 border-b pb-2">Document Details</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">MIN No:</span>
                    <span className="text-sm font-medium text-slate-800">{transfer.minNo || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">MIN Book No:</span>
                    <span className="text-sm font-medium text-slate-800">{transfer.minBookNo || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">MIN Date:</span>
                    <span className="text-sm font-medium text-slate-800">{transfer.minDate ? new Date(transfer.minDate).toLocaleDateString() : '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Challan No:</span>
                    <span className="text-sm font-medium text-slate-800">{transfer.challanNo || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Challan Date:</span>
                    <span className="text-sm font-medium text-slate-800">{transfer.challanDate ? new Date(transfer.challanDate).toLocaleDateString() : '-'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <h4 className="font-semibold text-slate-700 mb-3 border-b pb-2">Transport Details</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Transporter:</span>
                    <span className="text-sm font-medium text-slate-800">{transfer.transportName || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Truck No:</span>
                    <span className="text-sm font-medium text-slate-800">{transfer.truckNumber || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">GR No:</span>
                    <span className="text-sm font-medium text-slate-800">{transfer.grNumber || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Driver Name:</span>
                    <span className="text-sm font-medium text-slate-800">{transfer.driverName || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Driver Mobile:</span>
                    <span className="text-sm font-medium text-slate-800">{transfer.driverMobile || '-'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-slate-800 mb-3">Line Items</h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2">Material</th>
                      <th className="px-4 py-2">Unit</th>
                      <th className="px-4 py-2 text-right">Requested Qty</th>
                      <th className="px-4 py-2 text-right">Dispatched Qty</th>
                      <th className="px-4 py-2 text-right">Received Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transfer.items?.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-2">
                          <span className="block font-medium text-slate-800">{item.description}</span>
                          <span className="block text-xs text-slate-500">Code: {item.tempCode}</span>
                        </td>
                        <td className="px-4 py-2 text-slate-600">{item.unit}</td>
                        <td className="px-4 py-2 text-right text-slate-600">{item.requestedQty}</td>
                        <td className="px-4 py-2 text-right font-medium text-blue-700">{item.dispatchedQty}</td>
                        <td className="px-4 py-2 text-right font-medium text-green-700">{item.receivedQty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-red-500">Transfer data not found.</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
