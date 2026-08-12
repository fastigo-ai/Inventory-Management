"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { getContractorReturnById, deleteContractorReturn } from "@/features/contractors/api/contractors.api";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2, Edit, Save, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ContractorReturnDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [returnObj, setReturnObj] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchReturn();
    }
  }, [id]);

  const fetchReturn = () => {
    setLoading(true);
    getContractorReturnById(id)
      .then(res => {
        setReturnObj(res.data);
      })
      .catch(err => {
        console.error(err);
        toast.error("Failed to fetch contractor return details");
      })
      .finally(() => setLoading(false));
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteContractorReturn(id);
      toast.success("Contractor return deleted successfully");
      router.push("/store/contractor-return");
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to delete return");
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!returnObj) {
    return (
      <div className="flex-1 min-h-screen p-8 bg-slate-50">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-8 text-center">
          <h2 className="text-xl font-semibold text-slate-800">Return Not Found</h2>
          <Button className="mt-4" onClick={() => router.push("/store/contractor-return")}>
            Back to List
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-screen bg-slate-50 p-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-slate-500 hover:text-slate-900 bg-white shadow-sm border border-slate-200"
              onClick={() => router.push("/store/contractor-return")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Return Details: {returnObj.returnChallanNo}</h1>
              <p className="text-sm text-slate-500">Status: <span className="font-medium text-slate-700">{returnObj.status}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline"
              className="text-slate-600"
              onClick={() => router.push(`/store/contractor-return/${id}/edit`)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button 
              variant="destructive"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Details & Info */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">
              Return Details & Contractor Info
            </h3>
            <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div>
                <p className="text-slate-500 mb-1">Return Challan No.</p>
                <p className="font-medium text-slate-900">{returnObj.returnChallanNo}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">Return Challan Date</p>
                <p className="font-medium text-slate-900">{new Date(returnObj.returnChallanDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">Book No.</p>
                <p className="font-medium text-slate-900">{returnObj.bookNo || '-'}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">Contractor Name</p>
                <p className="font-medium text-slate-900">
                  {returnObj.contractorId?.name || returnObj.contractorId?.dynamicData?.displayName || 'Unknown'}
                </p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">Contractor's Firm/Farm Name</p>
                <p className="font-medium text-slate-900">{returnObj.contractorFarmName || returnObj.contractorId?.farmName || '-'}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">Supervisor / Engineer</p>
                <p className="font-medium text-slate-900">{returnObj.supervisorEngineer || '-'}</p>
              </div>
            </div>
          </div>

          {/* Location & Additional Info */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col gap-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">
                Location Information
              </h3>
              <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                <div>
                  <p className="text-slate-500 mb-1">Name of Division</p>
                  <p className="font-medium text-slate-900">{returnObj.division || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">Name of Sub-Division</p>
                  <p className="font-medium text-slate-900">{returnObj.subDivision || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">Name of Sub-Station</p>
                  <p className="font-medium text-slate-900">{returnObj.subStation || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">Name of Feeder</p>
                  <p className="font-medium text-slate-900">{returnObj.feeder || '-'}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">
                Additional Details
              </h3>
              <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                <div>
                  <p className="text-slate-500 mb-1">Return TFS Sr No.</p>
                  <p className="font-medium text-slate-900">{returnObj.issuedTfsSrNo || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">Remarks</p>
                  <p className="font-medium text-slate-900">{returnObj.remarks || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Materials Returned</h3>
            <div className="text-sm text-slate-500 font-medium">
              Total Items: {returnObj.lineItems?.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0) || 0}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="px-4 py-3">Sr. No.</th>
                  <th className="px-4 py-3">Description of Material</th>
                  <th className="px-4 py-3">Temp Code</th>
                  <th className="px-4 py-3">HSN Code</th>
                  <th className="px-4 py-3">UNIT</th>
                  <th className="px-4 py-3 text-right">Return QTY.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!returnObj.lineItems || returnObj.lineItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                      No materials were found for this return.
                    </td>
                  </tr>
                ) : (
                  returnObj.lineItems.map((item: any, idx: number) => (
                    <tr key={item._id || idx} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{item.itemName || item.itemId?.description || '-'}</td>
                      <td className="px-4 py-3 text-slate-600">{item.tempCode || item.itemId?.itemCode || '-'}</td>
                      <td className="px-4 py-3 text-slate-500">{item.hsnCode || '-'}</td>
                      <td className="px-4 py-3 text-slate-500">{item.unit || item.itemId?.unit || 'Nos'}</td>
                      <td className="px-4 py-3 font-semibold text-blue-700 text-right bg-blue-50/30">{item.quantity}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-600">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this contractor return (<strong>{returnObj.returnChallanNo}</strong>)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
