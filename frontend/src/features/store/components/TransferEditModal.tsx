import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { getStoreTransferById, updateStoreTransfer } from "@/features/store/api/store.api";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function TransferEditModal({ 
  transferId, 
  isOpen, 
  onClose,
  onSuccess
}: { 
  transferId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [transfer, setTransfer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    minNo: '',
    minBookNo: '',
    challanNo: '',
    transportName: '',
    truckNumber: '',
    grNumber: '',
    driverName: '',
    driverMobile: '',
    remarks: ''
  });

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
      const data = res.data;
      setTransfer(data);
      setFormData({
        minNo: data.minNo || '',
        minBookNo: data.minBookNo || '',
        challanNo: data.challanNo || '',
        transportName: data.transportName || '',
        truckNumber: data.truckNumber || '',
        grNumber: data.grNumber || '',
        driverName: data.driverName || '',
        driverMobile: data.driverMobile || '',
        remarks: data.remarks || ''
      });
    } catch (error) {
      console.error("Failed to load transfer details", error);
      toast.error("Failed to load transfer");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateStoreTransfer(transferId!, formData);
      toast.success("Transfer updated successfully");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Update failed", error);
      toast.error(error.response?.data?.message || "Failed to update transfer");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Edit Outward Transfer Details</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : transfer ? (
          <div className="space-y-4 mt-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">MIN No.</label>
                <Input 
                  value={formData.minNo} 
                  onChange={(e) => setFormData({...formData, minNo: e.target.value})}
                  placeholder="MIN-1234"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">MIN Book No.</label>
                <Input 
                  value={formData.minBookNo} 
                  onChange={(e) => setFormData({...formData, minBookNo: e.target.value})}
                  placeholder="MB-01"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Challan No.</label>
                <Input 
                  value={formData.challanNo} 
                  onChange={(e) => setFormData({...formData, challanNo: e.target.value})}
                  placeholder="CH-1234"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Transporter</label>
                <Input 
                  value={formData.transportName} 
                  onChange={(e) => setFormData({...formData, transportName: e.target.value})}
                  placeholder="Logistics Inc"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Truck Number</label>
                <Input 
                  value={formData.truckNumber} 
                  onChange={(e) => setFormData({...formData, truckNumber: e.target.value})}
                  placeholder="HP-01-AB-1234"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">GR Number</label>
                <Input 
                  value={formData.grNumber} 
                  onChange={(e) => setFormData({...formData, grNumber: e.target.value})}
                  placeholder="GR-123"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Driver Name</label>
                <Input 
                  value={formData.driverName} 
                  onChange={(e) => setFormData({...formData, driverName: e.target.value})}
                  placeholder="John Doe"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Driver Mobile</label>
                <Input 
                  value={formData.driverMobile} 
                  onChange={(e) => setFormData({...formData, driverMobile: e.target.value})}
                  placeholder="+91..."
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Remarks</label>
              <Input 
                value={formData.remarks} 
                onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                placeholder="Any additional notes..."
                className="mt-1"
              />
            </div>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>

          </div>
        ) : (
          <div className="p-4 text-center text-red-500">Transfer data not found.</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
