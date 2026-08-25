"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Save, Plus, Trash2, Loader2, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { updateDemandNote, getDemandNoteById, getContextData } from '@/features/site-portal/api/demand-notes.api';
import { getItems } from '@/features/items/api/items.api';
import { getContractorWorkOrderById } from '@/features/contractors/api/contractorWorkOrder.api';
import { getContractorAggregatedQuantities, getContractors } from '@/features/contractors/api/contractors.api';
import { ItemSelectionModal } from '@/features/site-portal/components/ItemSelectionModal';
import { useAuthStore } from '@/shared/store/auth.store';

function DemandNoteEditForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const id = params?.id as string;
  const { user } = useAuthStore();
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [contractorsList, setContractorsList] = useState<any[]>([]);
  const workOrderId = searchParams.get('workOrderId');
  
  const contractorIdParam = searchParams.get('contractorId');
  const contractorNameParam = searchParams.get('contractorName');
  const packageParam = searchParams.get('package');
  const circleParam = searchParams.get('circle');
  const tempCodeParam = searchParams.get('tempCode');
  const itemIdParam = searchParams.get('itemId');
  const itemNameParam = searchParams.get('itemName');
  const activityParam = searchParams.get('activity');
  const finalBalQtyParam = searchParams.get('finalBalQty');
  const wipConsumedParam = searchParams.get('wipConsumed') || searchParams.get('wipQty');
  const wipRequiredParam = searchParams.get('wipRequired') || searchParams.get('wipRequiredQty');
  const jmcDoneParam = searchParams.get('jmcDone') || searchParams.get('jmcQty');
  const alreadyIssuedParam = searchParams.get('alreadyIssuedQty') || searchParams.get('totalIssued');
  const stockBalParam = searchParams.get('stockBal');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingWO, setIsFetchingWO] = useState(false);
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [workOrderItems, setWorkOrderItems] = useState<any[]>([]);
  
  const [formData, setFormData] = useState<{
    contractorId?: string;
    contractorName: string;
    division: string;
    subDivision: string;
    location: string;
    remarks: string;
    authorizedByEngineer: string;
    package: string;
    circle: string;
    status: string;
    locationDrawing?: File | null;
    drawingPreview?: string | null;
  }>({
    contractorName: '',
    division: '',
    subDivision: '',
    location: '',
    remarks: '',
    authorizedByEngineer: '',
    package: '',
    circle: '',
    status: 'Pending PM Approval'
  });

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const hasAutoPopulated = React.useRef(false);

  useEffect(() => {
    if (id) {
      getDemandNoteById(id).then(res => {
        const dn = res.data.demandNote || res.data;
        if (dn.status === 'Approved' || dn.status === 'Fulfilled' || dn.status === 'Pending PD Approval') {
          toast.error('This Demand Note cannot be edited.');
          router.push('/site-portal/demand-notes');
          return;
        }
        setFormData({
          contractorId: dn.contractorId?._id || dn.contractorId || '',
          contractorName: dn.contractorName || '',
          division: dn.division || '',
          subDivision: dn.subDivision || '',
          location: dn.location || '',
          package: dn.package || '',
          circle: dn.circle || '',
          remarks: dn.remarks || '',
          status: dn.status || 'Pending PM Approval',
          authorizedByEngineer: dn.authorizedByEngineer || '',
          locationDrawing: undefined,
          drawingPreview: dn.locationDrawingUrl || null,
        });
        
        const loadedItems = (dn.items || []).map((item: any) => ({
          ...item,
          balBomQty: (item.bomQty || 0) - (item.alreadyIssuedQty || 0) - (item.demandQty || 0)
        }));
        
        setItems(loadedItems);
        setIsInitialLoading(false);
      }).catch(err => {
        toast.error('Failed to load Demand Note');
        router.push('/site-portal/demand-notes');
      });
    }
  }, [id, router]);

  useEffect(() => {
    // Prefill package and circle from user profile if not overridden by URL params
    if (user && !packageParam && !circleParam) {
      setFormData(prev => ({
        ...prev,
        package: prev.package || user.assignedPackage || '',
        circle: prev.circle || user.assignedCircle || ''
      }));
    }
  }, [user, packageParam, circleParam]);

  useEffect(() => {
    // Fetch contractors for the dropdown
    const fetchAllContractors = async () => {
      try {
        const res = await getContractors();
        if (res && res.data) {
          setContractorsList(res.data);
        } else if (Array.isArray(res)) {
          setContractorsList(res);
        }
      } catch (err) {
        console.error("Failed to fetch contractors", err);
      }
    };
    fetchAllContractors();
  }, []);

  useEffect(() => {
    if (id) return;
    // If URL params are present, auto-fill formData
    if (contractorIdParam || contractorNameParam || packageParam || circleParam) {
      setFormData(prev => ({
        ...prev,
        contractorId: contractorIdParam || prev.contractorId,
        contractorName: contractorNameParam || prev.contractorName,
        package: packageParam || prev.package,
        circle: circleParam || prev.circle
      }));
    }

    if (hasAutoPopulated.current) return;

    fetchItemsList().then((fetchedItems) => {
      if ((itemIdParam || tempCodeParam || itemNameParam) && !hasAutoPopulated.current) {
        let itemToSelect: any = null;

        // 1. Match by Item ID
        if (itemIdParam && fetchedItems && fetchedItems.length > 0) {
          itemToSelect = fetchedItems.find((i: any) => String(i._id) === itemIdParam || String(i.itemId) === itemIdParam);
        }

        // 2. Match by Temp Code (case-insensitive & trimmed)
        if (!itemToSelect && tempCodeParam && fetchedItems && fetchedItems.length > 0) {
          const cleanTemp = tempCodeParam.trim().toLowerCase();
          itemToSelect = fetchedItems.find((i: any) => {
            const iTemp = String(i.dynamicData?.tempCode || i.tempCode || '').trim().toLowerCase();
            return iTemp === cleanTemp;
          });
        }

        // 3. Match by Item Name / Description
        if (!itemToSelect && itemNameParam && fetchedItems && fetchedItems.length > 0) {
          const cleanName = itemNameParam.trim().toLowerCase();
          itemToSelect = fetchedItems.find((i: any) => {
            const iName = String(i.dynamicData?.itemName || i.dynamicData?.name || i.name || i.dynamicData?.description || '').trim().toLowerCase();
            return iName === cleanName || (cleanName.length > 5 && (iName.includes(cleanName) || cleanName.includes(iName)));
          });
        }

        const initialDemandQty = finalBalQtyParam && Number(finalBalQtyParam) > 0 ? Number(finalBalQtyParam) : 0;

        if (itemToSelect) {
          hasAutoPopulated.current = true;
          handleAddNewItem([itemToSelect], contractorIdParam || undefined, initialDemandQty);
        } else if (tempCodeParam || itemNameParam) {
          // Fallback: If not matched in catalog list, create row from parameters directly
          hasAutoPopulated.current = true;
          const syntheticItem = {
            _id: itemIdParam || '',
            itemId: itemIdParam || '',
            name: itemNameParam || tempCodeParam || '',
            dynamicData: {
              name: itemNameParam || '',
              itemName: itemNameParam || '',
              tempCode: tempCodeParam || '',
              activity: activityParam || '',
            }
          };
          handleAddNewItem([syntheticItem], contractorIdParam || undefined, initialDemandQty);
        }
      }
    });
  }, [contractorIdParam, contractorNameParam, packageParam, circleParam, itemIdParam, tempCodeParam, itemNameParam, activityParam, finalBalQtyParam, wipConsumedParam, wipRequiredParam, jmcDoneParam, alreadyIssuedParam, stockBalParam, id]);

  useEffect(() => {
    if (workOrderId) {
      fetchWorkOrderData(workOrderId);
    }
  }, [workOrderId]);

  const fetchItemsList = async () => {
    try {
      const res = await getItems({ limit: 5000 });
      let list: any[] = [];
      if (res && res.items) {
        list = res.items;
      } else if (Array.isArray(res)) {
        list = res;
      }
      setItemsList(list);
      return list;
    } catch (error) {
      console.error('Failed to fetch items', error);
      return [];
    }
  };

  const fetchWorkOrderData = async (id: string) => {
    try {
      setIsFetchingWO(true);
      const res = await getContractorWorkOrderById(id);
      if (res.success) {
        const wo = res.data;
        setFormData(prev => ({
          ...prev,
          contractorId: wo.contractorId?._id || wo.contractorId || '',
          contractorName: wo.contractorId?.dynamicData?.name || wo.contractorId?.dynamicData?.contractorName || wo.contractorId?.dynamicData?.firmName || wo.contractorId?.dynamicData?.companyName || wo.contractorId?.dynamicData?.displayName || wo.contractorName || '',
          division: wo.division || '',
          subDivision: wo.subDivision || '',
          location: wo.location || '',
          package: wo.package || '',
          circle: wo.circle || ''
        }));

        if (wo.items && wo.items.length > 0) {
          let aggData: any = {};
          const cId = wo.contractorId?._id || wo.contractorId;
          if (cId) {
            try {
              const aggRes = await getContractorAggregatedQuantities(cId);
              if (aggRes && aggRes.success && aggRes.data) {
                aggData = aggRes.data;
              }
            } catch (err) {
              console.error("Failed to fetch aggregated quantities", err);
            }
          }

          const mappedItems = wo.items.map((i: any) => {
            const act = String(i.activity || '').trim().toLowerCase();
            const loaSr = String(i.loaSrNo || '').trim().toLowerCase();
            const key = `${act}_${loaSr}`;
            const agg = aggData[key] || { jmcQty: 0, wipQty: 0, wipRequiredQty: 0 };

            return {
              itemId: i.itemId,
              itemName: i.itemName || i.description || '',
              itemDescription: i.itemDescription || '',
              activity: i.activity || '',
              tempCode: i.tempCode || '',
              loaSrNo: i.loaSrNo || '',
              unit: i.unit || '',
              totalPackageLoaQty: i.totalPackageLoaQty || 0,
              circleLoaQty: i.circleLoaQty || 0,
              circleBomQty: i.circleBomQty || 0,
              loaQty: i.loaQty || i.circleLoaQty || 0,
              woQty: i.woQty || i.issuedQty || 0,
              bomQty: i.bomQty || i.circleBomQty || 0,
              alreadyIssuedQty: 0,
              contractorErectionRate: i.contractorErectionRate || 0,
              amount: i.amount || 0,
              gstType: i.gstType || '',
              gstAmount: i.gstAmount || 0,
              totalAmount: i.totalAmount || 0,
              transferFromOther: i.transferFromOther || 0,
              transferToOther: i.transferToOther || 0,
              stockBal: i.stockBal || 0,
              jmcQty: agg.jmcQty || 0,
              wipQty: agg.wipQty || 0,
              wipRequiredQty: agg.wipRequiredQty || 0,
              miscellaneousQty: 0,
              demandQty: 0,
              balBomQty: (i.bomQty || i.circleBomQty || 0) - (i.alreadyIssuedQty || 0),
              isLoadingContext: false
            };
          });
          setWorkOrderItems(mappedItems);
          const initialItems = mappedItems.map((item: any) => ({ ...item, isLoadingContext: true }));
          setItems(initialItems);

          initialItems.forEach(async (item: any, idx: number) => {
            try {
              const res = await getContextData(
                item.itemId,
                cId || undefined,
                wo.contractorName || undefined,
                item.activity,
                item.itemName,
                item.tempCode,
                item.loaSrNo,
                wo.package || undefined,
                wo.circle || undefined
              );
              if (res.success) {
                setItems(prev => {
                  const updated = [...prev];
                  const curr = updated[idx];
                  if (curr) {
                    if (res.data.alreadyIssuedQty !== undefined && res.data.alreadyIssuedQty >= 0) {
                      curr.alreadyIssuedQty = res.data.alreadyIssuedQty;
                    }
                    if (res.data.stockBal !== undefined && res.data.stockBal > 0) {
                      curr.stockBal = res.data.stockBal;
                    }
                    if (res.data.jmcQty !== undefined && res.data.jmcQty > 0) curr.jmcQty = res.data.jmcQty;
                    if (res.data.wipQty !== undefined && res.data.wipQty > 0) curr.wipQty = res.data.wipQty;
                    if (res.data.wipRequiredQty !== undefined && res.data.wipRequiredQty > 0) curr.wipRequiredQty = res.data.wipRequiredQty;
                    
                    curr.balBomQty = curr.bomQty - curr.alreadyIssuedQty - (curr.demandQty || 0);
                    curr.isLoadingContext = false;
                  }
                  return updated;
                });
              } else {
                setItems(prev => {
                  const updated = [...prev];
                  if (updated[idx]) updated[idx].isLoadingContext = false;
                  return updated;
                });
              }
            } catch (error) {
              setItems(prev => {
                const updated = [...prev];
                if (updated[idx]) updated[idx].isLoadingContext = false;
                return updated;
              });
            }
          });
          
        } else {
          toast.warning('This Work Order does not contain any items.');
        }
      }
    } catch (error) {
      toast.error('Failed to fetch Work Order details');
    } finally {
      setIsFetchingWO(false);
    }
  };

  const removeItemRow = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleAddNewItem = async (selectedItems: any[], overrideContractorId?: string, initialDemandQty?: number) => {
    if (!selectedItems || selectedItems.length === 0) return;

    let newRows: any[] = [];
    
    selectedItems.forEach(selectedItem => {
      const itemId = workOrderId ? selectedItem.itemId : (selectedItem._id || selectedItem.itemId || '');
      const dynamic = selectedItem.dynamicData || {};

      let newItem = {
        itemId: '', itemName: '', itemDescription: '', activity: '', tempCode: '', loaSrNo: '',
        unit: '', totalPackageLoaQty: 0, circleLoaQty: 0, circleBomQty: 0,
        loaQty: 0, woQty: 0, bomQty: 0, 
        alreadyIssuedQty: Number(alreadyIssuedParam || 0), 
        contractorErectionRate: 0, amount: 0, gstType: '', gstAmount: 0, totalAmount: 0,
        transferFromOther: 0, transferToOther: 0, 
        stockBal: Number(stockBalParam || 0),
        jmcQty: Number(jmcDoneParam || 0), 
        wipQty: Number(wipConsumedParam || 0), 
        wipRequiredQty: Number(wipRequiredParam || 0), 
        miscellaneousQty: 0, demandQty: initialDemandQty || 0, balBomQty: 0, isLoadingContext: false
      };

      if (workOrderId) {
        newItem = {
          ...newItem,
          ...selectedItem,
          demandQty: initialDemandQty || 0,
          jmcQty: Number(jmcDoneParam || 0),
          wipQty: Number(wipConsumedParam || 0),
          wipRequiredQty: Number(wipRequiredParam || 0),
          miscellaneousQty: 0,
          balBomQty: selectedItem.bomQty - (selectedItem.alreadyIssuedQty || 0) - (initialDemandQty || 0),
        };
      } else {
        newItem.itemId = itemId;
        newItem.itemName = dynamic.itemName || dynamic.name || selectedItem.name || dynamic.description || itemNameParam || '';
        newItem.itemDescription = dynamic.itemDescription || dynamic.description || selectedItem.description || '';
        newItem.activity = dynamic.activity || selectedItem.activity || activityParam || '';
        newItem.tempCode = dynamic.tempCode || selectedItem.tempCode || tempCodeParam || '';
        newItem.loaSrNo = dynamic.loaSrNo || dynamic.loaSerialNo || dynamic.loaSerialNumber || dynamic.sku || selectedItem.sku || '';
        newItem.unit = dynamic.unit || dynamic.Unit || dynamic.uom || dynamic.UOM || dynamic.unitName || dynamic['Unit Name'] || dynamic.unitOfMeasurement || selectedItem.unit || '';
        
        newItem.totalPackageLoaQty = Number(dynamic.totalPackageLoaQty || selectedItem.totalPackageLoaQty || 0);
        newItem.circleLoaQty = Number(dynamic.circleLoaQty || selectedItem.circleLoaQty || 0);
        newItem.circleBomQty = Number(dynamic.circleBomQty || selectedItem.circleBomQty || 0);
        newItem.loaQty = Number(dynamic.loaQty || selectedItem.loaQty || 0);
        newItem.woQty = Number(dynamic.woQty || selectedItem.woQty || 0);
        newItem.bomQty = Number(dynamic.bomQty || selectedItem.bomQty || 0);
        newItem.contractorErectionRate = Number(dynamic.contractorErectionRate || selectedItem.contractorErectionRate || 0);
        newItem.amount = Number(dynamic.amount || selectedItem.amount || 0);
        newItem.gstType = dynamic.gstType || selectedItem.gstType || '';
        newItem.gstAmount = Number(dynamic.gstAmount || selectedItem.gstAmount || 0);
        newItem.totalAmount = Number(dynamic.totalAmount || selectedItem.totalAmount || 0);
      }
      
      newItem.isLoadingContext = true;
      newRows.push(newItem);
    });
    
    setItems(prev => [...prev, ...newRows]);
    
    const startIdx = items.length;

    selectedItems.forEach(async (selectedItem, idx) => {
      const itemId = workOrderId ? selectedItem.itemId : (selectedItem._id || selectedItem.itemId || '');
      const actualIndex = startIdx + idx;
      const dynamic = selectedItem.dynamicData || {};

      try {
        const contractorId = overrideContractorId || formData.contractorId || contractorIdParam;
        const contractorName = formData.contractorName || contractorNameParam;
        const currentPkg = formData.package || packageParam;
        const currentCircle = formData.circle || circleParam;
        const activity = dynamic.activity || selectedItem.activity || activityParam || '';
        const description = dynamic.itemName || dynamic.name || selectedItem.name || dynamic.description || itemNameParam || '';
        const tempCode = dynamic.tempCode || selectedItem.tempCode || tempCodeParam || '';
        const loaSrNo = dynamic.loaSrNo || dynamic.loaSerialNo || dynamic.loaSerialNumber || dynamic.sku || selectedItem.sku || '';

        const res = await getContextData(itemId, contractorId || undefined, contractorName || undefined, activity, description, tempCode, loaSrNo, currentPkg || undefined, currentCircle || undefined);
        if (res.success) {
          const ctx = res.data;
          setItems(prev => {
            const updated = [...prev];
            const curr = updated[actualIndex];
            if (!curr) return prev;
            
            if (ctx.itemDescription) curr.itemDescription = ctx.itemDescription;
            if (ctx.unit && !curr.unit) curr.unit = ctx.unit;
            if (ctx.circleLoaQty !== undefined && ctx.circleLoaQty > 0) curr.circleLoaQty = ctx.circleLoaQty;
            if (ctx.totalPackageLoaQty !== undefined && ctx.totalPackageLoaQty > 0) curr.totalPackageLoaQty = ctx.totalPackageLoaQty;
            if (ctx.woQty !== undefined && ctx.woQty > 0) curr.woQty = ctx.woQty;
            if (ctx.bomQty !== undefined && ctx.bomQty > 0) curr.bomQty = ctx.bomQty;
            if (ctx.contractorErectionRate !== undefined && ctx.contractorErectionRate > 0) curr.contractorErectionRate = ctx.contractorErectionRate;
            if (ctx.amount !== undefined && ctx.amount > 0) curr.amount = ctx.amount;
            if (ctx.gstType) curr.gstType = ctx.gstType;
            if (ctx.gstAmount !== undefined && ctx.gstAmount > 0) curr.gstAmount = ctx.gstAmount;
            if (ctx.totalAmount !== undefined && ctx.totalAmount > 0) curr.totalAmount = ctx.totalAmount;
            
            if (!workOrderId) {
              curr.bomQty = ctx.bomQty || curr.bomQty || 0;
            }

            if (ctx.alreadyIssuedQty !== undefined && ctx.alreadyIssuedQty >= 0) {
              curr.alreadyIssuedQty = ctx.alreadyIssuedQty;
            }

            if (ctx.stockBal !== undefined && ctx.stockBal > 0) curr.stockBal = ctx.stockBal;
            curr.transferFromOther = ctx.transferFromOther || 0;
            curr.transferToOther = ctx.transferToOther || 0;
            if (ctx.jmcQty !== undefined && ctx.jmcQty > 0) curr.jmcQty = ctx.jmcQty;
            if (ctx.wipQty !== undefined && ctx.wipQty > 0) curr.wipQty = ctx.wipQty;
            if (ctx.wipRequiredQty !== undefined && ctx.wipRequiredQty > 0) curr.wipRequiredQty = ctx.wipRequiredQty;
            curr.balBomQty = curr.bomQty - curr.alreadyIssuedQty - (curr.demandQty || 0);
            curr.isLoadingContext = false;
            return updated;
          });
        }
      } catch (error) {
        setItems(prev => {
          const updated = [...prev];
          if (updated[actualIndex]) updated[actualIndex].isLoadingContext = false;
          return updated;
        });
      }
    });
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;

    if (field === 'demandQty') {
      const dQty = Number(value) || 0;
      newItems[index].balBomQty = newItems[index].bomQty - newItems[index].alreadyIssuedQty - dQty;
    }
    
    setItems(newItems);
  };

  const calculateContractorBalance = (item: any) => {
    const issued = Number(item.alreadyIssuedQty) || 0;
    const jmc = Number(item.jmcQty) || 0;
    const wipC = Number(item.wipQty) || 0;
    const wipR = Number(item.wipRequiredQty) || 0;
    const misc = Number(item.miscellaneousQty) || 0;
    const balance = issued - jmc - wipC - wipR - misc;
    return Number(balance.toFixed(2));
  };

  const handleSubmit = async () => {
    const itemsToSave = items.map(i => {
      const { isLoadingContext, ...rest } = i;
      return {
        ...rest,
        activity: rest.activity || '',
        tempCode: rest.tempCode || '',
        jmcQty: Number(rest.jmcQty) || 0,
        wipQty: Number(rest.wipQty) || 0,
        wipRequiredQty: Number(rest.wipRequiredQty) || 0,
        miscellaneousQty: Number(rest.miscellaneousQty) || 0,
        demandQty: Number(rest.demandQty) || 0
      };
    });

    if (itemsToSave.length === 0) {
      toast.error('No items to save.');
      return;
    }

    if (itemsToSave.some(i => !i.itemId)) {
      toast.error('Please ensure all items have a valid Item ID.');
      return;
    }

    setIsSubmitting(true);
    try {

      const submitData = new FormData();
      submitData.append('contractorName', formData.contractorName);
      submitData.append('division', formData.division);
      submitData.append('subDivision', formData.subDivision);
      submitData.append('location', formData.location);
      submitData.append('remarks', formData.remarks);
      submitData.append('package', formData.package);
      submitData.append('circle', formData.circle);
      submitData.append('status', formData.status);
      if (formData.authorizedByEngineer) {
        submitData.append('authorizedByEngineer', formData.authorizedByEngineer);
      }
      submitData.append('items', JSON.stringify(itemsToSave));
      if (formData.locationDrawing) {
        submitData.append('file', formData.locationDrawing);
      }

      await updateDemandNote(id, submitData);
      toast.success('Demand Note updated successfully!');
      router.push('/site-portal/demand-notes');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit Demand Note');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (isFetchingWO) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-slate-500 font-medium">Fetching Work Order details...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/site-portal/demand-notes" className="text-slate-400 hover:text-slate-600 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Edit Demand Note</h1>
            <p className="text-slate-500 text-sm mt-1">
              Modify the details of this demand note.
            </p>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2">
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Update Demand Note
        </Button>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
        <h3 className="text-lg font-semibold text-slate-800">General Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Contractor Name</label>
            <select
              value={formData.contractorId || ''}
              onChange={e => {
                const selected = contractorsList.find(c => c._id === e.target.value);
                const name = selected ? (selected.dynamicData?.displayName || selected.dynamicData?.companyName || selected.dynamicData?.name || selected.dynamicData?.vendorName || '') : '';
                setFormData({
                  ...formData,
                  contractorId: e.target.value,
                  contractorName: name
                });
              }}
              disabled={!!workOrderId}
              className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select Contractor</option>
              {contractorsList
                .filter(c => {
                  if (!formData.circle) return true;
                  const locs = c.location || c.assignedLocations || c.dynamicData?.assignedCircle || c.dynamicData?.circle || c.dynamicData?.assignedCircles || '';
                  return locs.includes(formData.circle);
                })
                .map(c => {
                  const displayName = c.dynamicData?.displayName || c.dynamicData?.companyName || c.dynamicData?.name || c.dynamicData?.vendorName || c._id;
                  return (
                    <option key={c._id} value={c._id}>{displayName}</option>
                  );
                })
              }
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Package</label>
            <Input value={formData.package} onChange={e => setFormData({...formData, package: e.target.value})} disabled={!!user?.assignedPackage} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Circle</label>
            <Input value={formData.circle} onChange={e => setFormData({...formData, circle: e.target.value})} disabled={!!user?.assignedCircle} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Division</label>
            <Input value={formData.division} onChange={e => setFormData({...formData, division: e.target.value})} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Sub Division</label>
            <Input value={formData.subDivision} onChange={e => setFormData({...formData, subDivision: e.target.value})} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Location</label>
            <Input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Remarks</label>
            <Input value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Authorized By Engineer</label>
            <Input value={formData.authorizedByEngineer} onChange={e => setFormData({...formData, authorizedByEngineer: e.target.value})} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Location Drawing / Document</label>
            {formData.drawingPreview && (
              <a href={formData.drawingPreview} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 underline block mb-1">View Current Document</a>
            )}
            <Input 
              type="file" 
              onChange={e => {
                if (e.target.files && e.target.files.length > 0) {
                  setFormData(prev => ({ ...prev, locationDrawing: e.target.files![0] }));
                }
              }} 
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-slate-800">Requested Items</h3>
          <Button onClick={() => setIsItemModalOpen(true)} variant="outline" size="sm" className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Item
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
              <tr>
                <th className="px-4 py-3 min-w-[200px]">Item Name</th>
                <th className="px-4 py-3 min-w-[120px]">Activity</th>
                <th className="px-4 py-3 min-w-[120px]">Temp Code</th>
                <th className="px-4 py-3 min-w-[120px]">LOA Sr No</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Total Pkg LOA</th>
                <th className="px-4 py-3">Circle LOA</th>
                <th className="px-4 py-3">WO Qty</th>
                <th className="px-4 py-3">BOM Qty</th>
                <th className="px-4 py-3">Rate</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">GST Type</th>
                <th className="px-4 py-3">GST Amt</th>
                <th className="px-4 py-3">Total Amt</th>
                <th className="px-4 py-3">Stock Bal</th>
                <th className="px-4 py-3 text-amber-700 bg-amber-50">Already Issued</th>
                <th className="px-4 py-3 text-indigo-700 bg-indigo-50">JMC Done Qty</th>
                <th className="px-4 py-3 text-blue-700 bg-blue-50">WIP Consumed</th>
                <th className="px-4 py-3 text-blue-700 bg-blue-50">WIP Req. Material</th>
                <th className="px-4 py-3 text-orange-700 bg-orange-50">Misc Qty</th>
                <th className="px-4 py-3 text-red-700 bg-red-50 font-bold">Bal Qty at Contractor</th>
                <th className="px-4 py-3">Demand Qty <span className="text-red-500">*</span></th>
                <th className="px-4 py-3">Bal BOM Qty</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.entries(items.reduce((acc, item, idx) => {
                const act = item.activity || 'Unassigned Activity';
                if (!acc[act]) acc[act] = [];
                acc[act].push({ item, idx });
                return acc;
              }, {} as Record<string, {item: any, idx: number}[]>)).map(([activity, group]: any) => (
                <React.Fragment key={activity}>
                  <tr className="bg-slate-100/80 border-y border-slate-200">
                    <td colSpan={24} className="px-4 py-2 text-[13px] font-bold text-slate-700">
                      Activity: <span className="text-indigo-700 ml-1">{activity === 'Unassigned Activity' ? 'Pending Item Selection' : activity}</span>
                    </td>
                  </tr>
                  {group.map(({ item, idx }: {item: any, idx: number}) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800 max-w-[200px] truncate" title={item.itemName || 'Unknown Item'}>
                          {item.itemName || 'Unknown Item'}
                        </div>
                        {item.isLoadingContext && <Loader2 className="w-4 h-4 animate-spin text-indigo-500 mt-2" />}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 truncate max-w-[150px]" title={item.activity}>{item.activity || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{item.tempCode || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{item.loaSrNo || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{item.unit || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{item.totalPackageLoaQty}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{item.circleLoaQty}</td>
                      <td className="px-4 py-3 font-medium text-slate-700">{item.woQty}</td>
                      <td className="px-4 py-3 font-medium text-slate-700">{item.bomQty}</td>
                      <td className="px-4 py-3 font-medium text-slate-700">₹{item.contractorErectionRate}</td>
                      <td className="px-4 py-3 font-medium text-slate-700">₹{item.amount}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{item.gstType || 'N/A'}</td>
                      <td className="px-4 py-3 font-medium text-slate-700">₹{item.gstAmount}</td>
                      <td className="px-4 py-3 font-bold text-slate-800">₹{item.totalAmount}</td>
                      <td className="px-4 py-3 font-medium text-blue-600">{item.stockBal}</td>
                      <td className="px-4 py-3 font-medium text-amber-600 bg-amber-50">{item.alreadyIssuedQty}</td>
                      
                      <td className="px-4 py-3 bg-indigo-50">
                        <Input type="number" className="w-20 h-9" value={item.jmcQty !== undefined ? item.jmcQty : ''} onChange={(e) => handleItemChange(idx, 'jmcQty', e.target.value)} />
                      </td>
                      <td className="px-4 py-3 bg-blue-50">
                        <Input type="number" className="w-20 h-9" value={item.wipQty !== undefined ? item.wipQty : ''} onChange={(e) => handleItemChange(idx, 'wipQty', e.target.value)} />
                      </td>
                      <td className="px-4 py-3 bg-blue-50">
                        <Input type="number" className="w-20 h-9" value={item.wipRequiredQty !== undefined ? item.wipRequiredQty : ''} onChange={(e) => handleItemChange(idx, 'wipRequiredQty', e.target.value)} />
                      </td>
                      <td className="px-4 py-3 bg-orange-50">
                        <Input type="number" className="w-20 h-9" value={item.miscellaneousQty !== undefined ? item.miscellaneousQty : ''} onChange={(e) => handleItemChange(idx, 'miscellaneousQty', e.target.value)} />
                      </td>
                      
                      <td className="px-4 py-3 font-bold text-red-600 bg-red-50">
                        {calculateContractorBalance(item)}
                      </td>
    
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          className="w-20 h-9"
                          step="any" value={item.demandQty !== undefined ? item.demandQty : ''}
                          onChange={(e) => handleItemChange(idx, 'demandQty', e.target.value)}
                          placeholder="0"
                        />
                      </td>
                      <td className="px-4 py-3 font-semibold text-indigo-600">{item.balBomQty}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => removeItemRow(idx)} className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded transition-colors" disabled={items.length === 1}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <ItemSelectionModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        items={workOrderId ? workOrderItems : itemsList}
        onSelect={handleAddNewItem}
        isWorkOrderContext={!!workOrderId}
      />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin mx-auto mt-10" />}>
      <DemandNoteEditForm />
    </Suspense>
  );
}
