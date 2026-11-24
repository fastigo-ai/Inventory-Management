"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createJmc, getJmcById, updateJmc, getJmcs, sendJmcForApproval, approveJmc, rejectJmc } from "@/features/site-portal/api/jmc.api";
import { getContractors } from "@/features/contractors/api/contractors.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Trash2, Save, Send, CheckCircle2, XCircle, Clock, AlertTriangle, Check } from "lucide-react";
import Select from "react-select";
import { getItems } from "@/features/items/api/items.api";
import { useAuthStore } from "@/shared/store/auth.store";
import { toast } from "sonner";

const calcPrevQtyFromJmcs = (jmcs: any[], tempCode: string | number, loaSrNo: string | number, desc?: string) => {
  let total = 0;
  const tStr = tempCode ? tempCode.toString().trim() : '';
  const lStr = loaSrNo ? loaSrNo.toString().trim() : '';
  const dStr = desc ? desc.toString().trim().toLowerCase() : '';

  jmcs.forEach(jmc => {
    (jmc.items || []).forEach((item: any) => {
      const itemTemp = item.tempCode ? item.tempCode.toString().trim() : '';
      const itemLoa = item.loaSrNo ? item.loaSrNo.toString().trim() : '';
      const itemDesc = item.description ? item.description.toString().trim().toLowerCase() : '';

      const isMatch = (tStr && itemTemp && tStr === itemTemp) ||
                      (lStr && itemLoa && lStr === itemLoa) ||
                      (dStr && itemDesc && (dStr === itemDesc || dStr.includes(itemDesc) || itemDesc.includes(dStr)));

      if (isMatch) {
        const qty = Number(item.approvedQty) > 0 
          ? Number(item.approvedQty) 
          : Number(item.claimedQty || item.quantity || 0);
        total += qty;
      }
    });
  });
  return total;
};

export default function JmcRegisterFormPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const params = useParams();
  const isNew = !params.id || params.id === 'new';
  const jmcId = params.id as string;

  const [contractors, setContractors] = useState<any[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [submitting, setSubmitting] = useState(false);
  const [availableItems, setAvailableItems] = useState<any[]>([]);
  const [previousJmcs, setPreviousJmcs] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);

  // Role permissions
  const userRole = user?.role?.name || '';
  const isSuperOrAdmin =
    userRole === 'Admin' ||
    userRole === 'Super Admin' ||
    userRole === 'CEO' ||
    user?.role?.permissions?.includes('*');
  const isPM = userRole === 'Project Manager' || userRole === 'PM' || isSuperOrAdmin;
  const isPD = userRole === 'Project Director' || userRole === 'PD' || isSuperOrAdmin;

  // Rejection modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectRemarks, setRejectRemarks] = useState('');

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    contractorId: "",
    package: user?.assignedPackage || "",
    circle: user?.assignedCircle || "",
    division: "",
    subDivision: "",
    subCircle: "",
    subStation: "",
    feeder: "",
    location: "",
    drawingNo: "",
    status: "Submitted",
    approvalStatus: "Draft",
    approvalRemarks: "",
    rejectionRemarks: "",
    remarks: "",
    items: [
      {
        activity: "",
        tempCode: "",
        loaSrNo: "",
        description: "",
        unit: "",
        prevQty: 0,
        claimedQty: 0,
        approvedQty: 0,
        rate: 0,
        amount: 0,
        totalLoaQty: 0,
        remarks: ""
      }
    ] as any[]
  });


  useEffect(() => {
    if (user && isNew) {
      setFormData(prev => ({
        ...prev,
        package: prev.package || user.assignedPackage || "",
        circle: prev.circle || user.assignedCircle || ""
      }));
    }
  }, [user, isNew]);

  useEffect(() => {
    if (formData.circle) {
      getItems({ filters: { circle: formData.circle }, limit: 500000 }).then(res => {
        const fetched = res?.items || res?.data?.items || (Array.isArray(res) ? res : res.data) || [];
        setAvailableItems(fetched);
      }).catch(console.error);
    } else {
      getItems({ limit: 500000 }).then(res => {
        const fetched = res?.items || res?.data?.items || (Array.isArray(res) ? res : res.data) || [];
        setAvailableItems(fetched);
      }).catch(console.error);
    }
  }, [formData.circle]);


  useEffect(() => {
    if (formData.contractorId) {
      getJmcs({ contractorId: formData.contractorId }).then((res: any) => {
        const payload = res?.data?.data || {};
        const jmcs = payload.data || (Array.isArray(res?.data?.data) ? res.data.data : []);
        const filtered = jmcs.filter((j: any) => j.package === formData.package && j.circle === formData.circle && j.status === 'Approved');
        setPreviousJmcs(filtered);
      }).catch(console.error);
    } else {
      setPreviousJmcs([]);
    }
  }, [formData.contractorId]);

  // Automatically recalculate previous quantities for existing items when historical JMCs arrive
  useEffect(() => {
    if (formData.items.length > 0 && previousJmcs.length > 0) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.map(item => ({
          ...item,
          prevQty: calcPrevQtyFromJmcs(previousJmcs, item.tempCode, item.loaSrNo, item.description)
        }))
      }));
    }
  }, [previousJmcs]);

  useEffect(() => {
    fetchContractors();
    if (!isNew) {
      fetchJmc();
    }
  }, [isNew, jmcId]);

  const fetchContractors = async () => {
    try {
      const locationParam = user?.assignedCircle || undefined;
      const res = await getContractors(locationParam);
      setContractors(res?.data || (Array.isArray(res) ? res : []));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchJmc = async () => {
    try {
      setLoading(true);
      const res = await getJmcById(jmcId);
      const data = res.data?.data;
      if (data) {
        setFormData({
          ...data,
          date: data.date ? new Date(data.date).toISOString().split('T')[0] : "",
          contractorId: data.contractorId?._id || data.contractorId,
          items: data.items?.map((item: any) => ({
            ...item,
            loaSrNo: item.loaSrNo || item.loaSerialNo || '',
            tempCode: item.tempCode || ''
          })) || []
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (availableItems.length > 0 && formData.items.length > 0 && !isNew) {
      let changed = false;
      let newItems = [...formData.items];
      
      newItems = newItems.map(item => {
        if (item.tempCode && item.totalLoaQty > 0) return item;
        const match = availableItems.find(ai => 
          (item.loaSrNo && (String(ai.dynamicData?.sku) === String(item.loaSrNo) || String(ai.dynamicData?.loaSrNo) === String(item.loaSrNo))) || 
          (item.activity && ai.dynamicData?.activity === item.activity && ai.dynamicData?.description === item.description)
        );
        if (match) {
           let updated = { ...item };
           if (!updated.tempCode) {
             updated.tempCode = match.rawItem?.tempCode || match.dynamicData?.tempCode || '';
             if (updated.tempCode) changed = true;
           }
           if (!updated.totalLoaQty || updated.totalLoaQty === 0) {
             updated.totalLoaQty = Number(match.dynamicData?.loaQty || match.dynamicData?.loaQuantity || match.dynamicData?.totalLoaQuantity || match.dynamicData?.qty || match.dynamicData?.quantity || 0);
             if (updated.totalLoaQty > 0) changed = true;
           }
           return updated;
        }
        return item;
      });

      const existingActivities = new Set(newItems.map(i => i.activity).filter(Boolean));
      
      existingActivities.forEach(activity => {
        const lowerActivity = activity.toLowerCase();
        const activityItems = availableItems.filter(ai => String(ai.dynamicData?.activity || '').trim().toLowerCase() === lowerActivity.trim());
        activityItems.forEach(ai => {
          const temp = ai.dynamicData?.tempCode || ai.rawItem?.tempCode || '';
          const loa = ai.dynamicData?.loaSrNo || ai.dynamicData?.loaSerialNo || ai.dynamicData?.sku || ai.rawItem?.sku || '';
          const desc = ai.dynamicData?.description || ai.dynamicData?.itemDescription || ai.dynamicData?.name || '';
          
          const exists = newItems.find(item => 
            String(item.activity || '').trim().toLowerCase() === lowerActivity.trim() &&
            String(item.tempCode || '') === String(temp || '') &&
            String(item.loaSrNo || '') === String(loa || '') &&
            String(item.description || '') === String(desc || '')
          );
          
          if (!exists) {
            changed = true;
            newItems.push({
              activity: activity,
              tempCode: temp,
              loaSrNo: loa,
              description: desc,
              unit: ai.dynamicData?.unit || ai.dynamicData?.uom || '',
              totalLoaQty: Number(ai.dynamicData?.loaQty || ai.dynamicData?.loaQuantity || ai.dynamicData?.totalLoaQuantity || ai.dynamicData?.qty || ai.dynamicData?.quantity || 0),
              prevQty: calcPrevQtyFromJmcs(previousJmcs, temp, loa, desc),
              claimedQty: 0,
              approvedQty: 0,
              rate: 0,
              amount: 0,
              remarks: ''
            });
          }
        });
      });

      if (changed) {
        newItems.sort((a, b) => {
          if (a.activity !== b.activity) return (a.activity || '').localeCompare(b.activity || '');
          const numA = parseFloat(a.tempCode || a.loaSrNo || '0');
          const numB = parseFloat(b.tempCode || b.loaSrNo || '0');
          return numA - numB;
        });
        setFormData(prev => ({ ...prev, items: newItems }));
      }
    }
  }, [availableItems, isNew, previousJmcs]);

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    (newItems[index] as any)[field] = value;
    
    // Auto calculate amount based on claimedQty (or approvedQty depending on status)
    if (field === 'claimedQty' || field === 'approvedQty' || field === 'rate') {
      const qty = Number(newItems[index].approvedQty) > 0 ? Number(newItems[index].approvedQty) : Number(newItems[index].claimedQty);
      newItems[index].amount = qty * Number(newItems[index].rate || 0);
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          activity: "",
          tempCode: "",
          loaSrNo: "",
          description: "",
          unit: "",
          prevQty: 0,
          claimedQty: 0,
          approvedQty: 0,
          rate: 0,
          amount: 0,
          totalLoaQty: 0,
          remarks: ""
        }
      ]
    });
  };

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (statusToSave: string) => {
    if (!formData.contractorId) {
      alert("Please select a contractor");
      return;
    }

    setSubmitting(true);
    try {
      // Calculate totals
      let claimedTotal = 0;
      let approvedTotal = 0;
      formData.items.forEach((item: any) => {
        claimedTotal += (Number(item.claimedQty) * Number(item.rate));
        approvedTotal += (Number(item.approvedQty) * Number(item.rate));
      });

      const payload = new FormData();
      payload.append('date', formData.date);
      payload.append('contractorId', formData.contractorId);
      payload.append('package', formData.package);
      payload.append('circle', formData.circle);
      payload.append('division', formData.division || '');
      payload.append('subDivision', formData.subDivision || '');
      payload.append('subCircle', formData.subCircle || '');
      payload.append('subStation', formData.subStation || '');
      payload.append('feeder', formData.feeder || '');
      payload.append('location', formData.location || '');
      payload.append('drawingNo', formData.drawingNo || '');
      payload.append('remarks', formData.remarks || '');
      payload.append('status', statusToSave);
      payload.append('claimedAmount', claimedTotal.toString());
      payload.append('approvedAmount', approvedTotal.toString());
      payload.append('items', JSON.stringify(formData.items));
      if (file) {
        payload.append('file', file);
      }

      if (isNew) {
        await createJmc(payload);
        alert(`JMC saved as ${statusToSave}`);
        router.push('/site-portal/jmc-register');
      } else {
        await updateJmc(jmcId, payload);
        alert(`JMC updated and saved as ${statusToSave}`);
        router.push('/site-portal/jmc-register');
      }
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.message || "Failed to save JMC");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendForApprovalAction = async () => {
    try {
      setSubmitting(true);
      await sendJmcForApproval(jmcId);
      toast.success("JMC sent for PM and PD approval successfully");
      fetchJmc();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to send JMC for approval");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveAction = async () => {
    try {
      setSubmitting(true);
      await approveJmc(jmcId);
      toast.success("JMC approved successfully");
      fetchJmc();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to approve JMC");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmRejectAction = async () => {
    if (!rejectRemarks.trim()) {
      toast.error("Please enter rejection remarks");
      return;
    }
    try {
      setSubmitting(true);
      await rejectJmc(jmcId, rejectRemarks.trim());
      toast.success("JMC rejected successfully");
      setRejectModalOpen(false);
      setRejectRemarks('');
      fetchJmc();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to reject JMC");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading...</div>;

  const totalClaimed = formData.items.reduce((sum, item) => sum + (Number(item.claimedQty) * Number(item.rate)), 0);
  const totalApproved = formData.items.reduce((sum, item) => sum + (Number(item.approvedQty) * Number(item.rate)), 0);

  return (
    <div className="flex-1 bg-slate-50 min-h-screen p-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-slate-200 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                {isNew ? 'New JMC Entry' : `JMC ${(formData as any).jmcNumber || ''}`}
              </h1>
              {!isNew && (
                <div className="flex flex-wrap items-center gap-3 mt-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500 font-medium">Status:</span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      formData.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      formData.status === 'Submitted' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {formData.status === 'Approved' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                      {formData.status || 'Draft'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500 font-medium">Approval Status:</span>
                    {((formData as any).approvalStatus === 'Approved' || formData.status === 'Approved') ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Approved
                      </span>
                    ) : (formData as any).approvalStatus === 'Pending PM Approval' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 animate-pulse">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        Pending PM Approval
                      </span>
                    ) : (formData as any).approvalStatus === 'Pending PD Approval' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 animate-pulse">
                        <Clock className="w-3.5 h-3.5 text-purple-600" />
                        Pending PD Approval
                      </span>
                    ) : (formData as any).approvalStatus === 'Rejected' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                        <XCircle className="w-3.5 h-3.5 text-red-600" />
                        Rejected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                        {(formData as any).approvalStatus || 'Draft'}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Save Draft */}
            {formData.status !== 'Approved' && (formData as any).approvalStatus !== 'Approved' && (
              <Button 
                variant="outline"
                onClick={() => handleSubmit('Draft')}
                disabled={submitting}
                className="border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </Button>
            )}

            {/* Submit JMC */}
            {isNew && (
              <Button 
                onClick={() => handleSubmit('Submitted')}
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Send className="w-4 h-4 mr-2" />
                Submit JMC
              </Button>
            )}

            {/* Send for Approval Button */}
            {!isNew && ((formData as any).approvalStatus === 'Draft' || (formData as any).approvalStatus === 'Rejected' || (!(formData as any).approvalStatus && formData.status !== 'Approved')) && formData.status !== 'Approved' && (
              <Button 
                onClick={handleSendForApprovalAction}
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
              >
                <Send className="w-4 h-4 mr-2" />
                {(formData as any).approvalStatus === 'Rejected' ? 'Re-send for Approval' : 'Send for Approval'}
              </Button>
            )}

            {/* PM Approval Button */}
            {!isNew && isPM && ((formData as any).approvalStatus === 'Pending PM Approval' || (isSuperOrAdmin && (formData as any).approvalStatus === 'Draft' && formData.status === 'Submitted')) && (
              <>
                <Button 
                  onClick={handleApproveAction}
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Approve (PM)
                </Button>
                <Button 
                  onClick={() => setRejectModalOpen(true)}
                  disabled={submitting}
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-2 text-red-600" />
                  Reject
                </Button>
              </>
            )}

            {/* PD Approval Button */}
            {!isNew && isPD && (formData as any).approvalStatus === 'Pending PD Approval' && (
              <>
                <Button 
                  onClick={handleApproveAction}
                  disabled={submitting}
                  className="bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Approve (PD)
                </Button>
                <Button 
                  onClick={() => setRejectModalOpen(true)}
                  disabled={submitting}
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-2 text-red-600" />
                  Reject
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Approval Workflow Progress & Rejection Notice */}
        {!isNew && (
          <div className="mb-6 space-y-3">
            {/* Rejection Alert Banner with Remark */}
            {(formData as any).approvalStatus === 'Rejected' && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 shadow-2xs">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-red-800">Approval Rejected with Remarks</h4>
                  <div className="text-xs text-red-800 mt-1 font-medium bg-white/70 p-2.5 rounded-lg border border-red-200">
                    <span className="font-bold text-red-900">Approver Remark:</span> &ldquo;{(formData as any).rejectionRemarks || (formData as any).approvalRemarks || 'Correction required by approver.'}&rdquo;
                  </div>
                  <p className="text-xs text-red-600 mt-2">
                    Note: The JMC remains a valid submitted record. Please edit the claimed quantities or item details as requested, save changes, and click <strong>&ldquo;Re-send for Approval&rdquo;</strong> to submit for PM & PD review again.
                  </p>
                </div>
              </div>
            )}

            {/* Approval Stepper Tracker */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Step 1: Submission */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div className="text-xs">
                  <p className="font-bold text-slate-700">Initial Submission</p>
                  <p className="text-slate-500">Document {formData.status || 'Submitted'}</p>
                </div>
              </div>

              {/* Step 2: PM Approval */}
              <div className={`flex items-center gap-3 p-3 rounded-lg border ${
                (formData as any).pmStatus === 'Approved' ? 'bg-emerald-50 border-emerald-200' :
                (formData as any).pmStatus === 'Rejected' ? 'bg-red-50 border-red-200' :
                (formData as any).approvalStatus === 'Pending PM Approval' ? 'bg-amber-50 border-amber-200' :
                'bg-slate-50 border-slate-100'
              }`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                  (formData as any).pmStatus === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                  (formData as any).pmStatus === 'Rejected' ? 'bg-red-100 text-red-700' :
                  (formData as any).approvalStatus === 'Pending PM Approval' ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-200 text-slate-600'
                }`}>
                  {(formData as any).pmStatus === 'Approved' ? <Check className="w-4 h-4" /> : '2'}
                </div>
                <div className="text-xs">
                  <p className="font-bold text-slate-700">PM Approval</p>
                  <p className="text-slate-500">
                    {(formData as any).pmStatus === 'Approved' 
                      ? `Approved by ${(formData as any).pmApprovedBy?.firstName || (formData as any).pmApprovedBy || 'PM'}` 
                      : (formData as any).pmStatus === 'Rejected' ? 'Rejected by PM' : 'Awaiting PM'}
                  </p>
                  {(formData as any).pmApprovalRemarks && (
                    <p className="text-[11px] text-slate-600 italic mt-0.5 truncate" title={(formData as any).pmApprovalRemarks}>
                      Note: {(formData as any).pmApprovalRemarks}
                    </p>
                  )}
                </div>
              </div>

              {/* Step 3: PD Approval */}
              <div className={`flex items-center gap-3 p-3 rounded-lg border ${
                (formData as any).pdStatus === 'Approved' ? 'bg-emerald-50 border-emerald-200' :
                (formData as any).pdStatus === 'Rejected' ? 'bg-red-50 border-red-200' :
                (formData as any).approvalStatus === 'Pending PD Approval' ? 'bg-purple-50 border-purple-200' :
                'bg-slate-50 border-slate-100'
              }`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                  (formData as any).pdStatus === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                  (formData as any).pdStatus === 'Rejected' ? 'bg-red-100 text-red-700' :
                  (formData as any).approvalStatus === 'Pending PD Approval' ? 'bg-purple-100 text-purple-700' :
                  'bg-slate-200 text-slate-600'
                }`}>
                  {(formData as any).pdStatus === 'Approved' ? <Check className="w-4 h-4" /> : '3'}
                </div>
                <div className="text-xs">
                  <p className="font-bold text-slate-700">PD Approval (Final)</p>
                  <p className="text-slate-500">
                    {(formData as any).pdStatus === 'Approved' 
                      ? `Approved by ${(formData as any).pdApprovedBy?.firstName || (formData as any).pdApprovedBy || 'PD'}` 
                      : (formData as any).pdStatus === 'Rejected' ? 'Rejected by PD' : 'Awaiting PD'}
                  </p>
                  {(formData as any).pdApprovalRemarks && (
                    <p className="text-[11px] text-slate-600 italic mt-0.5 truncate" title={(formData as any).pdApprovalRemarks}>
                      Note: {(formData as any).pdApprovalRemarks}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-sm font-bold text-slate-700 uppercase mb-4">General Details</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Date</label>
                <Input 
                  type="date" 
                  value={formData.date} 
                  onChange={e => setFormData({...formData, date: e.target.value})} 
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Contractor *</label>
                <select 
                  className="w-full h-9 rounded-md border border-slate-200 px-3 text-sm focus:border-blue-500 focus:ring-blue-500 bg-white"
                  value={formData.contractorId}
                  onChange={e => {
                    const selectedId = e.target.value;
                    const selectedContractor = contractors.find(c => c._id === selectedId);
                    setFormData(prev => ({
                      ...prev, 
                      contractorId: selectedId,
                      package: selectedContractor?.dynamicData?.package || selectedContractor?.dynamicData?.assignedPackage || selectedContractor?.package || prev.package,
                      circle: selectedContractor?.dynamicData?.circle || selectedContractor?.dynamicData?.assignedCircle || selectedContractor?.circle || selectedContractor?.location || prev.circle
                    }));
                  }}
                >
                  <option value="">Select Contractor</option>
                  {contractors
                    .filter(c => {
                      if (c._id === formData.contractorId) return true;
                      if (!formData.circle) return true;
                      const locs = c.location || c.assignedLocations || c.dynamicData?.assignedCircle || c.dynamicData?.circle || c.dynamicData?.assignedCircles || '';
                      return locs.includes(formData.circle);
                    })
                    .map((c: any) => {
                      const displayName = c.dynamicData?.displayName || c.dynamicData?.companyName || c.dynamicData?.name || c.dynamicData?.vendorName || c._id;
                      return (
                        <option key={c._id} value={c._id}>{displayName}</option>
                      );
                    })
                  }
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Status</label>
                <div className="h-9 px-3 py-2 bg-slate-100 rounded-md text-sm font-medium text-slate-700 border border-slate-200">
                  {formData.status}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-sm font-bold text-slate-700 uppercase mb-4">Location Details</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Package</label>
                <Input value={formData.package} readOnly className="bg-slate-50 text-slate-500" placeholder="Auto-filled from your profile" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Circle</label>
                <Input value={formData.circle} readOnly className="bg-slate-50 text-slate-500" placeholder="Auto-filled from your profile" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">Sub Circle</label>
                  <select 
                    className="w-full h-9 rounded-md border border-slate-200 px-3 text-sm focus:border-blue-500 focus:ring-blue-500 bg-white disabled:bg-slate-100 disabled:text-slate-400"
                    value={formData.subCircle || ''}
                    onChange={e => setFormData({...formData, subCircle: e.target.value})}
                    disabled={formData.circle?.toLowerCase() !== 'solan'}
                  >
                    <option value="">Select Sub Circle</option>
                    <option value="Kumarhatti">Kumarhatti</option>
                    <option value="Nalagarh">Nalagarh</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">Division</label>
                  <Input 
                    value={formData.division} 
                    onChange={e => setFormData({...formData, division: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">Sub Division</label>
                  <Input 
                    value={formData.subDivision} 
                    onChange={e => setFormData({...formData, subDivision: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">Sub Station</label>
                  <Input 
                    value={formData.subStation || ''} 
                    onChange={e => setFormData({...formData, subStation: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">Feeder</label>
                  <Input 
                    value={formData.feeder || ''} 
                    onChange={e => setFormData({...formData, feeder: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">Location</label>
                  <Input 
                    value={formData.location || ''} 
                    onChange={e => setFormData({...formData, location: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">Drawing No</label>
                  <Input 
                    value={formData.drawingNo || ''} 
                    onChange={e => setFormData({...formData, drawingNo: e.target.value})} 
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-sm font-bold text-slate-700 uppercase mb-4">Summary</h2>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-500">Total Claimed</span>
                  <span className="text-lg font-bold text-slate-800">₹ {totalClaimed.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Total Approved</span>
                  <span className="text-lg font-bold text-green-700">₹ {totalApproved.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Remarks</label>
                <Input
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Enter remarks..."
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">Drawing Sheet / Document</label>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-700 uppercase">JMC Items</h2>
            <div className="flex items-center gap-4">
              <div className="w-[300px]">
                <Select
                  options={Array.from(new Set(availableItems.map(ai => ai.dynamicData?.activity).filter(Boolean))).map(act => ({ value: act, label: act }))}
                  placeholder="Add by Activity..."
                  onChange={(selected: any) => {
                    if (!selected) return;
                    const activityItems = availableItems.filter(ai => ai.dynamicData?.activity === selected.value);

                    const newRows = activityItems.map(ai => {
                      const temp = ai.dynamicData?.tempCode || '';
                      const loa = ai.dynamicData?.loaSrNo || ai.dynamicData?.loaSerialNo || ai.dynamicData?.sku || '';
                      const desc = ai.dynamicData?.description || ai.dynamicData?.itemDescription || ai.dynamicData?.name || '';
                      return {
                        activity: ai.dynamicData?.activity || '',
                        tempCode: temp,
                        loaSrNo: loa,
                        description: desc,
                        unit: ai.dynamicData?.unit || ai.dynamicData?.uom || '',
                        totalLoaQty: Number(ai.dynamicData?.loaQty || ai.dynamicData?.loaQuantity || ai.dynamicData?.totalLoaQuantity || ai.dynamicData?.qty || ai.dynamicData?.quantity || 0),
                        prevQty: calcPrevQtyFromJmcs(previousJmcs, temp, loa, desc),
                        claimedQty: 0,
                        approvedQty: 0,
                        rate: 0,
                        amount: 0,
                        remarks: ''
                      };
                    });
                    
                    newRows.sort((a, b) => {
                      const numA = parseFloat(a.tempCode || a.loaSrNo || '0');
                      const numB = parseFloat(b.tempCode || b.loaSrNo || '0');
                      return numA - numB;
                    });
                    
                    setFormData(prev => ({
                      ...prev,
                      items: [...prev.items, ...newRows]
                    }));
                  }}
                  styles={{
                    control: (base) => ({ ...base, minHeight: '32px', height: '32px', fontSize: '13px', backgroundColor: 'white', border: '1px solid #cbd5e1', boxShadow: 'none' }),
                    menuPortal: base => ({ ...base, zIndex: 9999 })
                  }}
                  menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                  menuPosition="fixed"
                />
              </div>
              <Button onClick={addItem} variant="outline" size="sm" className="h-8">
              <Plus className="w-4 h-4 mr-2" /> Add Item
            </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="px-4 py-3 border-r min-w-[200px]">Activity</th>
                  <th className="px-4 py-3 border-r min-w-[120px]">LOA Sr No</th>
                  <th className="px-4 py-3 border-r min-w-[120px]">Temp Code</th>
                  <th className="px-4 py-3 border-r min-w-[300px]">Description</th>
                  <th className="px-4 py-3 border-r min-w-[100px]">Unit</th>
                  <th className="px-4 py-3 border-r min-w-[100px]">LOA Qty</th>
                  <th className="px-4 py-3 border-r min-w-[120px] bg-slate-50">Prev JMC Alloted Qty</th>
                  <th className="px-4 py-3 border-r min-w-[120px] bg-blue-50 text-blue-800">New JMC Qty</th>
                  <th className="px-4 py-3 border-r min-w-[120px] bg-green-50 text-green-800">Approved Qty</th>
                  <th className="px-4 py-3 border-r min-w-[120px] bg-purple-50 text-purple-800">Total JMC Qty</th>
                  <th className="px-4 py-3 border-r min-w-[120px]">Rate (₹)</th>
                  <th className="px-4 py-3 border-r min-w-[120px]">Amount (₹)</th>
                  <th className="px-4 py-3 border-r min-w-[150px]">Remarks</th>
                  <th className="px-4 py-3 w-12 text-center">Act</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.entries(
                  formData.items.reduce((acc: any, item: any, index: number) => {
                    const act = item.activity || 'Uncategorized';
                    if (!acc[act]) acc[act] = [];
                    acc[act].push({ item, index });
                    return acc;
                  }, {})
                ).map(([activity, groupedItems]: [string, any]) => (
                  <React.Fragment key={activity}>
                    <tr className="bg-slate-200/60">
                      <td colSpan={14} className="px-4 py-2 font-bold text-slate-800 uppercase border-y border-slate-300">
                        {activity}
                      </td>
                    </tr>
                    {groupedItems.map(({ item, index }: { item: any, index: number }) => (
                      <tr key={index} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2 border-r border-slate-100">
                      <Input title={item.activity} value={item.activity || ''} 
                        onChange={e => handleItemChange(index, 'activity', e.target.value)} 
                        className="h-8 text-sm bg-slate-50"
                      />
                    </td>
                    <td className="px-4 py-2 border-r border-slate-100">
                      <Input title={item.loaSrNo} value={item.loaSrNo || ''} 
                        onChange={e => handleItemChange(index, 'loaSrNo', e.target.value)} 
                        className="h-8 text-sm"
                        placeholder="LOA Sr No"
                      />
                    </td>
                    <td className="px-4 py-2 border-r border-slate-100">
                      <Input title={item.tempCode} value={item.tempCode || ''} 
                        onChange={e => handleItemChange(index, 'tempCode', e.target.value)} 
                        className="h-8 text-sm"
                        placeholder="Code"
                      />
                    </td>
                    <td className="px-4 py-2 border-r border-slate-100">
                      <textarea 
                        value={item.description} 
                        onChange={e => handleItemChange(index, 'description', e.target.value)} 
                        className="w-full min-w-[250px] min-h-[40px] text-sm bg-transparent border border-slate-200 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
                        placeholder="Description of work"
                        title={item.description}
                      />
                    </td>
                    <td className="px-4 py-2 border-r border-slate-100">
                      <Input title={item.unit} value={item.unit || ''} 
                        onChange={e => handleItemChange(index, 'unit', e.target.value)} 
                        className="h-8 text-sm"
                        placeholder="e.g. Mtr"
                      />
                    </td>
                    <td className="px-4 py-2 border-r border-slate-100 bg-slate-50 text-center font-medium text-slate-700">
                      {item.totalLoaQty || 0}
                    </td>
                    <td className="px-4 py-2 border-r border-slate-100 bg-slate-50 text-center font-medium text-slate-700">
                      {Number(item.prevQty || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 border-r border-slate-100 bg-blue-50/30">
                      <Input 
                        type="number"
                        value={item.claimedQty || ''} 
                        onChange={e => handleItemChange(index, 'claimedQty', e.target.value)} 
                        placeholder="0"
                        className="h-8 text-sm font-medium text-blue-700 bg-white"
                      />
                    </td>
                    <td className="p-2 border-r bg-green-50/30">
                      <Input 
                        type="number"
                        className="w-full h-9 bg-white"
                        value={item.approvedQty || ''} 
                        onChange={e => handleItemChange(index, 'approvedQty', e.target.value)} 
                        placeholder="0"
                      />
                    </td>
                    <td className="p-2 border-r text-center font-medium bg-purple-50/30 text-purple-900">
                      {(Number(item.prevQty || 0) + (Number(item.approvedQty) > 0 ? Number(item.approvedQty) : Number(item.claimedQty || 0))).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 border-r border-slate-100">
                      <Input 
                        type="number"
                        value={item.rate || ''} 
                        onChange={e => handleItemChange(index, 'rate', e.target.value)} 
                        className="h-8 text-sm text-right"
                      />
                    </td>
                    <td className="px-4 py-2 border-r border-slate-100 bg-slate-50 font-bold text-slate-700 text-right">
                      {((Number(item.approvedQty) > 0 ? Number(item.approvedQty) : Number(item.claimedQty)) * Number(item.rate)).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 border-r border-slate-100">
                      <Input 
                        value={item.remarks} 
                        onChange={e => handleItemChange(index, 'remarks', e.target.value)} 
                        className="h-8 text-sm"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button 
                        onClick={() => removeItem(index)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                    ))}
                  </React.Fragment>
                ))}
                {formData.items.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-6 py-8 text-center text-slate-500">
                      No items added yet. Click "Add Item" to begin.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Rejection Modal Dialog */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-800 mb-2 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Reject JMC Entry
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Please specify the reason for rejecting this JMC. The contractor/user will see this remark and can correct the items before re-submitting for approval.
            </p>
            <textarea
              value={rejectRemarks}
              onChange={(e) => setRejectRemarks(e.target.value)}
              rows={3}
              placeholder="Enter rejection reason / remarks (mandatory)..."
              className="w-full text-sm p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRejectModalOpen(false);
                  setRejectRemarks('');
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleConfirmRejectAction}
                disabled={submitting || !rejectRemarks.trim()}
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
