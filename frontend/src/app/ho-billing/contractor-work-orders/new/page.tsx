"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft, Plus, X, Search, Eye, EyeOff } from 'lucide-react';
import { getContractors } from '@/features/contractors/api/contractors.api';
import { getItems, getEntityMetadata, getItemMetrics } from '@/features/items/api/items.api';
import { createContractorWorkOrder } from '@/features/contractors/api/contractorWorkOrder.api';
import { toast } from 'sonner';
import { DataTable } from '@/shared/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { api } from "@/shared/api/axios";

export default function NewContractorWorkOrderPage() {
  const router = useRouter();

  const [packageOptions] = useState([
    "Package 1(S/N)",
    "Package 2(R/R)"
  ]);
  
  const [formData, setFormData] = useState({
    package: '',
    circle: '',
    contractorId: '',
    drawings: [{ drawingNumber: '', division: '', subDivision: '', location: '', drawingUrl: '' }],
    remarks: '',
    activities: [] as string[]
  });

  const [currentActivityInput, setCurrentActivityInput] = useState('');

  const addDrawing = () => {
    setFormData(prev => ({ ...prev, drawings: [...prev.drawings, { drawingNumber: '', division: '', subDivision: '', location: '', drawingUrl: '' }] }));
  };

  const removeDrawing = (index: number) => {
    if (formData.drawings.length === 1) return;
    setFormData(prev => ({ ...prev, drawings: prev.drawings.filter((_, i) => i !== index) }));
  };

  const updateDrawing = (index: number, field: string, value: string) => {
    const newDrawings = [...formData.drawings];
    newDrawings[index] = { ...newDrawings[index], [field]: value };
    setFormData({ ...formData, drawings: newDrawings });
  };

  const [contractors, setContractors] = useState<any[]>([]);
  const [allActivityStats, setAllActivityStats] = useState<any[]>([]);
  
  const [items, setItems] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  const [manualItemSearch, setManualItemSearch] = useState('');
  const [manualItemResults, setManualItemResults] = useState<any[]>([]);
  const [isSearchingManual, setIsSearchingManual] = useState(false);
  const [showManualResults, setShowManualResults] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{isOpen: boolean, type: 'package' | 'circle', value: string}>({
    isOpen: false,
    type: 'package',
    value: ''
  });
  
  const [showLoaColumns, setShowLoaColumns] = useState(false); // Default to false to give more space for description
  
  const [activityRatios, setActivityRatios] = useState<Record<string, string>>({});
  const [uploadingDrawings, setUploadingDrawings] = useState<{ [key: number]: boolean }>({});

  const handleFileUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDrawings(prev => ({ ...prev, [index]: true }));
    try {
      const uploadData = new FormData();
      uploadData.append('file', file);
      uploadData.append('sourceType', 'ContractorWorkOrder');
      uploadData.append('sourceId', 'temp');

      const response = await api.post('/documents/upload', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data?.data?.url) {
        updateDrawing(index, 'drawingUrl', response.data.data.url);
        toast.success('Drawing uploaded successfully');
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to upload drawing');
    } finally {
      setUploadingDrawings(prev => ({ ...prev, [index]: false }));
    }
  };

  // Derive circles based on package
  const availableCircles = formData.package === 'Package 1(S/N)' ? ['Solan', 'Nahan'] :
                           formData.package === 'Package 2(R/R)' ? ['Rampur', 'Rohru'] : [];

  // Fetch unique activities on mount
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const metrics = await getItemMetrics();
        if (metrics && metrics.circleActivityStats) {
          setAllActivityStats(metrics.circleActivityStats);
        }
      } catch (e) {
        console.error('Failed to load activities', e);
      }
    };
    fetchActivities();
  }, []);

  // Compute available activities based on selected circle
  const activities = React.useMemo(() => {
    if (!formData.circle) return [];
    const relevantStats = allActivityStats.filter((s: any) => s._id?.circle === formData.circle);
    const acts = relevantStats.map((s: any) => s._id?.activity).filter((id: any) => typeof id === 'string' && id.trim() !== '');
    return Array.from(new Set(acts)).sort();
  }, [formData.circle, allActivityStats]);

  // Fetch contractors when circle changes
  useEffect(() => {
    if (formData.circle) {
      getContractors(formData.circle)
        .then(res => setContractors(res.data || []))
        .catch(() => toast.error('Failed to fetch contractors'));
    } else {
      setContractors([]);
      setFormData(prev => ({ ...prev, contractorId: '' }));
    }
  }, [formData.circle]);

  // Remove the auto-fetch useEffect that was based on single activity change
  // We will now fetch manually when "Add" is clicked.
  const handleAddActivity = () => {
    if (!currentActivityInput) {
      toast.error('Please select an activity to add');
      return;
    }
    
    if (formData.activities.includes(currentActivityInput)) {
      toast.error('Activity already added');
      return;
    }

    setIsLoadingItems(true);
    getItems({ 
      filters: {
        activity: currentActivityInput, 
        circle: formData.circle, 
        package: formData.package
      },
      limit: 50000 
    })
      .then(res => {
        const fetchedItems = res?.items || res?.data?.items || (Array.isArray(res) ? res : []);
        const mappedItems = Array.isArray(fetchedItems) ? fetchedItems.map(item => {
          const isPkg1 = formData.package === 'Package 1(S/N)';
          const totalPackageLoaQty = Number(item.dynamicData?.totalloaqty || item.dynamicData?.totalLoaQty || item.dynamicData?.totalLoaQuantity || 0) || (isPkg1 
            ? (Number(item.dynamicData?.solanloaqty || item.dynamicData?.solanLoaQuantity || item.dynamicData?.solanLoaQty || 0) + Number(item.dynamicData?.nahanloaqty || item.dynamicData?.nahanLoaQuantity || item.dynamicData?.nahanLoaQty || 0))
            : (Number(item.dynamicData?.rampurloaqty || item.dynamicData?.rampurLoaQuantity || item.dynamicData?.rampurLoaQty || 0) + Number(item.dynamicData?.rohruloaqty || item.dynamicData?.rohruLoaQuantity || item.dynamicData?.rohruLoaQty || 0)));

          return {
            itemId: item._id,
            tempCode: item.dynamicData?.tempCode || '',
            activity: item.dynamicData?.activity || '',
            loaSrNo: item.dynamicData?.sku || item.dynamicData?.loaSrNo || '',
            description: item.dynamicData?.description || item.dynamicData?.name || '',
            unit: item.dynamicData?.unit || '',
            circleLoaQty: formData.circle?.toLowerCase() === 'solan' ? Number(item.dynamicData?.solanloaqty || item.dynamicData?.solanLoaQuantity || item.dynamicData?.solanLoaQty || 0) :
                          formData.circle?.toLowerCase() === 'nahan' ? Number(item.dynamicData?.nahanloaqty || item.dynamicData?.nahanLoaQuantity || item.dynamicData?.nahanLoaQty || 0) :
                          formData.circle?.toLowerCase() === 'rampur' ? Number(item.dynamicData?.rampurloaqty || item.dynamicData?.rampurLoaQuantity || item.dynamicData?.rampurLoaQty || 0) :
                          formData.circle?.toLowerCase() === 'rohru' ? Number(item.dynamicData?.rohruloaqty || item.dynamicData?.rohruLoaQuantity || item.dynamicData?.rohruLoaQty || 0) : 0,
            circleBomQty: formData.circle?.toLowerCase() === 'solan' ? Number(item.dynamicData?.solanbomqty || item.dynamicData?.solanBomQuantity || item.dynamicData?.solanBomQty || 0) :
                          formData.circle?.toLowerCase() === 'nahan' ? Number(item.dynamicData?.nahanbomqty || item.dynamicData?.nahanBomQuantity || item.dynamicData?.nahanBomQty || 0) :
                          formData.circle?.toLowerCase() === 'rampur' ? Number(item.dynamicData?.rampurbomqty || item.dynamicData?.rampurBomQuantity || item.dynamicData?.rampurBomQty || 0) :
                          formData.circle?.toLowerCase() === 'rohru' ? Number(item.dynamicData?.rohrubomqty || item.dynamicData?.rohruBomQuantity || item.dynamicData?.rohruBomQty || 0) : 0,
            totalPackageLoaQty,
            alreadyIssuedQty: 0, // Placeholder
          woQty: 0,
          contractorErectionRate: 0,
            amount: 0,
            gstType: 'Intra', // default
            gstAmount: 0,
            totalAmount: 0
          };
        }) : [];
        
        if (mappedItems.length === 0) {
          toast.info('No items found for this activity');
        } else {
          setItems(prev => {
            const newItems = [...prev, ...mappedItems];
            return newItems.sort((a, b) => {
              const aVal = String(a.loaSrNo || '').trim();
              const bVal = String(b.loaSrNo || '').trim();
              return aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' });
            });
          });
          setFormData(prev => ({ ...prev, activities: [...prev.activities, currentActivityInput] }));
          setCurrentActivityInput('');
        }
      })
      .catch(() => toast.error('Failed to fetch items for activity'))
      .finally(() => setIsLoadingItems(false));
  };

  const handleConfirmChange = () => {
    if (confirmDialog.type === 'package') {
      setFormData({ ...formData, package: confirmDialog.value, circle: '', contractorId: '', drawings: [{ drawingNumber: '', division: '', subDivision: '', location: '' }], activities: [] });
    } else {
      setFormData({ ...formData, circle: confirmDialog.value, contractorId: '', drawings: [{ drawingNumber: '', division: '', subDivision: '', location: '' }], activities: [] });
    }
    setItems([]);
    setActivityRatios({});
    setConfirmDialog({ isOpen: false, type: 'package', value: '' });
  };

  const handleRemoveActivity = (activityToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      activities: prev.activities.filter(a => a !== activityToRemove)
    }));
    setItems(prev => prev.filter(item => item.activity !== activityToRemove));
    setActivityRatios(prev => {
      const newRatios = { ...prev };
      delete newRatios[activityToRemove];
      return newRatios;
    });
  };

  const handleRatioChange = (activity: string, ratioStr: string) => {
    setActivityRatios(prev => ({ ...prev, [activity]: ratioStr }));
    const ratio = parseFloat(ratioStr);

    setItems(prev => {
      const firstItem = prev.find(i => i.activity === activity);
      const baseLoaQty = firstItem?.totalPackageLoaQty || 1;

      return prev.map(item => {
        if (item.activity === activity) {
          if (!ratio || isNaN(ratio) || ratio === 0) {
            const newItem = { ...item, alreadyIssuedQty: 0, woQty: 0, amount: 0, gstAmount: 0, totalAmount: 0 };
            return newItem;
          }
          const calculatedQty = (item.totalPackageLoaQty / baseLoaQty) * ratio;
          const finalQty = Number(calculatedQty.toFixed(3));
          
          const newItem = {
            ...item,
            alreadyIssuedQty: finalQty,
            woQty: finalQty
          };
          
          newItem.amount = finalQty * (Number(newItem.contractorErectionRate) || 0);
          newItem.gstAmount = newItem.amount * 0.18;
          newItem.totalAmount = newItem.amount + newItem.gstAmount;
          
          return newItem;
        }
        return item;
      });
    });
  };

  useEffect(() => {
    if (!manualItemSearch || manualItemSearch.length < 2) {
      setManualItemResults([]);
      setShowManualResults(false);
      return;
    }
    const timer = setTimeout(() => {
      setIsSearchingManual(true);
      getItems({ 
        search: manualItemSearch, 
        limit: 10 
      })
        .then(res => {
          const itemsList = res?.items || res?.data?.items || (Array.isArray(res) ? res : []);
          setManualItemResults(Array.isArray(itemsList) ? itemsList : []);
          setShowManualResults(true);
        })
        .finally(() => setIsSearchingManual(false));
    }, 500);
    return () => clearTimeout(timer);
  }, [manualItemSearch]);

  const handleAddManualItem = (item: any) => {
    const isPkg1 = formData.package === 'Package 1(S/N)';
    const totalPackageLoaQty = Number(item.dynamicData?.totalloaqty || item.dynamicData?.totalLoaQty || item.dynamicData?.totalLoaQuantity || 0) || (isPkg1 
      ? (Number(item.dynamicData?.solanloaqty || item.dynamicData?.solanLoaQuantity || item.dynamicData?.solanLoaQty || 0) + Number(item.dynamicData?.nahanloaqty || item.dynamicData?.nahanLoaQuantity || item.dynamicData?.nahanLoaQty || 0))
      : (Number(item.dynamicData?.rampurloaqty || item.dynamicData?.rampurLoaQuantity || item.dynamicData?.rampurLoaQty || 0) + Number(item.dynamicData?.rohruloaqty || item.dynamicData?.rohruLoaQuantity || item.dynamicData?.rohruLoaQty || 0)));

    const mappedItem = {
      itemId: item._id,
      tempCode: item.dynamicData?.tempCode || '',
      activity: 'Manually Added (Misc)',
      loaSrNo: item.dynamicData?.sku || item.dynamicData?.loaSrNo || '',
      description: item.dynamicData?.description || item.dynamicData?.name || '',
      unit: item.dynamicData?.unit || '',
      circleLoaQty: formData.circle?.toLowerCase() === 'solan' ? Number(item.dynamicData?.solanloaqty || item.dynamicData?.solanLoaQuantity || item.dynamicData?.solanLoaQty || 0) :
                    formData.circle?.toLowerCase() === 'nahan' ? Number(item.dynamicData?.nahanloaqty || item.dynamicData?.nahanLoaQuantity || item.dynamicData?.nahanLoaQty || 0) :
                    formData.circle?.toLowerCase() === 'rampur' ? Number(item.dynamicData?.rampurloaqty || item.dynamicData?.rampurLoaQuantity || item.dynamicData?.rampurLoaQty || 0) :
                    formData.circle?.toLowerCase() === 'rohru' ? Number(item.dynamicData?.rohruloaqty || item.dynamicData?.rohruLoaQuantity || item.dynamicData?.rohruLoaQty || 0) : 0,
      circleBomQty: formData.circle?.toLowerCase() === 'solan' ? Number(item.dynamicData?.solanbomqty || item.dynamicData?.solanBomQuantity || item.dynamicData?.solanBomQty || 0) :
                    formData.circle?.toLowerCase() === 'nahan' ? Number(item.dynamicData?.nahanbomqty || item.dynamicData?.nahanBomQuantity || item.dynamicData?.nahanBomQty || 0) :
                    formData.circle?.toLowerCase() === 'rampur' ? Number(item.dynamicData?.rampurbomqty || item.dynamicData?.rampurBomQuantity || item.dynamicData?.rampurBomQty || 0) :
                    formData.circle?.toLowerCase() === 'rohru' ? Number(item.dynamicData?.rohrubomqty || item.dynamicData?.rohruBomQuantity || item.dynamicData?.rohruBomQty || 0) : 0,
      totalPackageLoaQty,
      alreadyIssuedQty: 0,
      woQty: 0,
      contractorErectionRate: 0,
      amount: 0,
      gstType: 'Intra',
      gstAmount: 0,
      totalAmount: 0
    };
    setItems(prev => {
      const newItems = [...prev, mappedItem];
      return newItems.sort((a, b) => {
        const aVal = String(a.loaSrNo || '').trim();
        const bVal = String(b.loaSrNo || '').trim();
        return aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' });
      });
    });
    setManualItemSearch('');
    setShowManualResults(false);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };

    if (field === 'alreadyIssuedQty') {
      item.woQty = value;
    }

    if (field === 'woQty' || field === 'contractorErectionRate' || field === 'alreadyIssuedQty') {
      item.amount = (Number(item.woQty) || 0) * (Number(item.contractorErectionRate) || 0);
    }
    
    if (field === 'woQty' || field === 'contractorErectionRate' || field === 'gstType' || field === 'alreadyIssuedQty') {
      const amt = item.amount;
      item.gstAmount = amt * 0.18;
      item.totalAmount = amt + item.gstAmount;
    }

    newItems[index] = item;
    setItems(newItems);
  };

  const handleSave = async () => {
    if (!formData.package || !formData.circle || !formData.contractorId || formData.drawings.some(d => !d.drawingNumber) || formData.activities.length === 0) {
      toast.error('Please fill all required fields');
      return;
    }
    if (items.length === 0) {
      toast.error('No items to save');
      return;
    }

    const payload = {
      ...formData,
      totalWoAmount: items.reduce((sum, item) => sum + (item.totalAmount || 0), 0),
      status: 'Approved',
      items
    };

    try {
      setIsSubmitting(true);
      await createContractorWorkOrder(payload);
      toast.success('Work Order created successfully');
      router.push('/ho-billing/contractor-work-orders');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to create work order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDivisions = (circle: string) => {
    switch (circle?.toLowerCase()) {
      case 'nahan':
        return ['Nahan', 'Rajgarh', 'Poanta'];
      case 'solan':
        return ['Solan', 'Nalagarh', 'Kumarhatti', 'Baddhi', 'Parwahoo', 'Arki'];
      case 'rohru':
        return ['Rohru', 'Jubbal'];
      default:
        return [];
    }
  };
  const availableDivisions = getDivisions(formData.circle);

  const tableData = React.useMemo(() => {
    const data: any[] = [];
    items.forEach((item, index) => {
      const showActivityHeader = index === 0 || items[index - 1].activity !== item.activity;
      if (showActivityHeader) {
        data.push({ isGroupRow: true, activityName: item.activity, id: `group-${item.activity}` });
      }
      data.push({ ...item, originalIndex: index });
    });
    return data;
  }, [items]);

  const columns = React.useMemo<ColumnDef<any>[]>(() => {
    const cols: ColumnDef<any>[] = [
      { accessorKey: "tempCode", header: "Temp Code", size: 100 },
      { accessorKey: "activity", header: "Activity", size: 150 },
      { accessorKey: "loaSrNo", header: "LOA Sr No", size: 100 },
      { accessorKey: "description", header: "Description", size: 250 },
      { accessorKey: "unit", header: "Unit", size: 80 },
    ];
    
    if (showLoaColumns) {
      cols.push(
        { accessorKey: "totalPackageLoaQty", header: "Total LOA Qty", size: 100 },
        { accessorKey: "circleLoaQty", header: `${formData.circle || 'Circle'} LOA Qty`, size: 120 },
        { accessorKey: "circleBomQty", header: `${formData.circle || 'Circle'} BOM Qty`, size: 120 }
      );
    }
    
    cols.push(
      {
        accessorKey: "alreadyIssuedQty",
        header: "Issued Qty",
        size: 100,
        cell: ({ row }) => (
          <input
            type="number"
            value={row.original.alreadyIssuedQty || ''}
            onChange={(e) => updateItem(row.original.originalIndex, 'alreadyIssuedQty', Number(e.target.value))}
            className="w-24 text-right px-2 py-1.5 rounded border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium text-orange-600 text-sm transition-shadow bg-orange-50"
          />
        )
      },
      {
        accessorKey: "woQty",
        header: "WO Qty",
        size: 100,
        cell: ({ row }) => (
          <input
            type="number"
            value={row.original.woQty || ''}
            onChange={(e) => updateItem(row.original.originalIndex, 'woQty', Number(e.target.value))}
            className="w-20 text-right px-2 py-1.5 rounded border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-shadow"
          />
        )
      },
      {
        accessorKey: "contractorErectionRate",
        header: "Rate",
        size: 100,
        cell: ({ row }) => (
          <input
            type="number"
            value={row.original.contractorErectionRate || ''}
            onChange={(e) => updateItem(row.original.originalIndex, 'contractorErectionRate', Number(e.target.value))}
            className="w-24 text-right px-2 py-1.5 rounded border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-shadow"
          />
        )
      },
      {
        accessorKey: "amount",
        header: "Amount",
        size: 100,
        cell: ({ row }) => <span className="font-medium text-slate-800">₹{(row.original.amount || 0).toLocaleString()}</span>
      },
      {
        accessorKey: "gstType",
        header: "GST Type",
        size: 120,
        cell: ({ row }) => (
          <select
            value={row.original.gstType}
            onChange={(e) => updateItem(row.original.originalIndex, 'gstType', e.target.value)}
            className="w-28 px-2 py-1.5 rounded border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs text-slate-700 transition-shadow bg-white"
          >
            <option value="Intra">Intra (18%)</option>
            <option value="Inter">Inter (9+9%)</option>
          </select>
        )
      },
      {
        accessorKey: "totalAmount",
        header: "Total Amount",
        size: 120,
        cell: ({ row }) => <span className="font-bold text-indigo-700">₹{(row.original.totalAmount || 0).toLocaleString()}</span>
      }
    );
    
    return cols;
  }, [showLoaColumns, formData.circle, items]); // Needs items for closures, or just rely on React state updates

  const getIsGroupRow = React.useCallback((row: any) => {
    return !!row.original?.isGroupRow;
  }, []);

  const renderGroupRow = React.useCallback((row: any) => {
    return (
      <td colSpan={columns.length} className="px-0 py-0 sticky left-0 z-20">
        <div className="flex items-center bg-slate-100/80 border-y border-slate-200 w-[100vw] sm:w-full">
           <div className="px-4 py-2 text-[13px] font-bold text-slate-700 min-w-[250px]">
             Activity: <span className="text-indigo-700 ml-1">{row.original.activityName}</span>
           </div>
           <div className="px-4 py-2">
             <input
               type="number"
               placeholder="Ratio"
               value={activityRatios[row.original.activityName] || ''}
               onChange={(e) => handleRatioChange(row.original.activityName, e.target.value)}
               className="w-20 text-right px-2 py-1 rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
               title="Enter Ratio to divide Total Package LOA Qty"
             />
           </div>
           <div className="flex-1"></div>
           <div className="px-4 py-2 text-right mr-4">
             <button
               onClick={() => handleRemoveActivity(row.original.activityName)}
               className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-slate-200"
               title="Remove Activity"
             >
               <X className="w-4 h-4" />
             </button>
           </div>
        </div>
      </td>
    );
  }, [columns.length, activityRatios, handleRatioChange, handleRemoveActivity]);

  return (
    <div className="p-6 pb-24 max-w-7xl mx-auto">
      <div className="flex items-center space-x-4 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">New Contractor Work Order</h1>
          <p className="text-sm text-slate-500 mt-1">Create a new work order for a registered contractor</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div>
            <label className="block text-[13px] font-semibold text-slate-800 mb-1">Package <span className="text-red-500">*</span></label>
            <select
              value={formData.package}
              onChange={(e) => {
                if (formData.activities && formData.activities.length > 0) {
                  setConfirmDialog({ isOpen: true, type: 'package', value: e.target.value });
                  return;
                }
                setFormData({ ...formData, package: e.target.value, circle: '', contractorId: '', drawings: [{ drawingNumber: '', division: '', subDivision: '', location: '' }], activities: [] });
                setItems([]);
                setActivityRatios({});
              }}
              className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white"
            >
              <option value="">Select Package</option>
              {packageOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-slate-800 mb-1">Circle <span className="text-red-500">*</span></label>
            <select
              value={formData.circle}
              onChange={(e) => {
                if (formData.activities && formData.activities.length > 0) {
                  setConfirmDialog({ isOpen: true, type: 'circle', value: e.target.value });
                  return;
                }
                setFormData({ ...formData, circle: e.target.value, contractorId: '', drawings: [{ drawingNumber: '', division: '', subDivision: '', location: '' }], activities: [] });
                setItems([]);
                setActivityRatios({});
              }}
              disabled={!formData.package}
              className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white disabled:bg-slate-50 disabled:text-slate-500"
            >
              <option value="">Select Circle</option>
              {availableCircles.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-slate-800 mb-1">Regd Contractor <span className="text-red-500">*</span></label>
            <select
              value={formData.contractorId}
              onChange={(e) => setFormData({ ...formData, contractorId: e.target.value })}
              disabled={!formData.circle}
              className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white disabled:bg-slate-50 disabled:text-slate-500"
            >
              <option value="">Select Contractor...</option>
              {contractors.map(c => (
                <option key={c._id} value={c._id}>
                  {c.dynamicData?.companyName || c.dynamicData?.displayName || 'Unknown Contractor'} {c.location ? `(${c.location})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="block text-[13px] font-semibold text-slate-800 mb-2">Drawings <span className="text-red-500">*</span></label>
            {formData.drawings.map((drawing, idx) => (
              <div key={idx} className="flex gap-2 mb-2 items-start border border-slate-200 p-3 rounded-md bg-slate-50">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-[12px] text-slate-600 mb-1">Drawing Number <span className="text-red-500">*</span></label>
                    <input type="text" value={drawing.drawingNumber} onChange={e => updateDrawing(idx, 'drawingNumber', e.target.value)} placeholder="e.g. DWG-001" className="w-full px-2 py-1.5 text-sm rounded border border-slate-200" required />
                  </div>
                  <div>
                    <label className="block text-[12px] text-slate-600 mb-1">Division</label>
                    <select value={drawing.division} onChange={e => updateDrawing(idx, 'division', e.target.value)} className="w-full px-2 py-1.5 text-sm rounded border border-slate-200 bg-white">
                      <option value="">Select Division</option>
                      {availableDivisions.map(div => <option key={div} value={div}>{div}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] text-slate-600 mb-1">Sub Division</label>
                    <input type="text" value={drawing.subDivision} onChange={e => updateDrawing(idx, 'subDivision', e.target.value)} placeholder="Sub Div" className="w-full px-2 py-1.5 text-sm rounded border border-slate-200" />
                  </div>
                  <div>
                    <label className="block text-[12px] text-slate-600 mb-1">Location</label>
                    <input type="text" value={drawing.location} onChange={e => updateDrawing(idx, 'location', e.target.value)} placeholder="Location" className="w-full px-2 py-1.5 text-sm rounded border border-slate-200" />
                  </div>
                  <div>
                    <label className="block text-[12px] text-slate-600 mb-1">Upload Drawing</label>
                    {drawing.drawingUrl ? (
                      <div className="flex items-center gap-2 mt-1">
                        <a href={drawing.drawingUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline text-xs flex items-center">
                          <Eye className="w-4 h-4 mr-1" /> View File
                        </a>
                        <button onClick={() => updateDrawing(idx, 'drawingUrl', '')} className="text-red-500 hover:bg-red-50 p-1 rounded">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <input 
                          type="file" 
                          onChange={(e) => handleFileUpload(idx, e)}
                          disabled={uploadingDrawings[idx]}
                          className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50" 
                        />
                        {uploadingDrawings[idx] && <div className="absolute right-2 top-1 text-[10px] text-indigo-600">Uploading...</div>}
                      </div>
                    )}
                  </div>
                </div>
                <button type="button" onClick={() => removeDrawing(idx)} className="mt-6 text-slate-400 hover:text-red-500 p-1 rounded-md hover:bg-white" title="Remove Drawing">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button type="button" onClick={addDrawing} className="mt-1 flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              <Plus className="w-4 h-4" /> Add Another Drawing
            </button>
          </div>

          <div className="md:col-span-2">
            <label className="block text-[13px] font-semibold text-slate-800 mb-1">Remarks</label>
            <input
              type="text"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              placeholder="Enter remarks manually"
              className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-visible mb-6">
        <div className="p-6 border-b border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[13px] font-semibold text-slate-800 mb-1">Add Activities <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <select
                    value={currentActivityInput}
                    onChange={(e) => setCurrentActivityInput(e.target.value)}
                    disabled={!formData.circle || isLoadingItems}
                    className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 bg-white"
                  >
                    <option value="">Select an activity...</option>
                    {activities.map((act, i) => (
                      <option key={i} value={act}>{act}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleAddActivity}
                  disabled={!currentActivityInput || isLoadingItems}
                  className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-md text-sm font-medium hover:bg-indigo-100 disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  {isLoadingItems ? 'Adding...' : 'Add Activity'}
                </button>
              </div>

              {formData.activities.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {formData.activities.map((act, i) => (
                    <div key={i} className="flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm border border-slate-200">
                      <span className="max-w-[300px] truncate" title={act}>{act}</span>
                      <button 
                        onClick={() => handleRemoveActivity(act)}
                        className="ml-1 text-slate-400 hover:text-red-500 focus:outline-none transition-colors"
                        title="Remove Activity"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <label className="block text-[13px] font-semibold text-slate-800 mb-1">Add Single Item <span className="text-slate-500 font-normal">(Non-billable / Misc)</span></label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={manualItemSearch}
                  onChange={(e) => setManualItemSearch(e.target.value)}
                  onFocus={() => { if (manualItemResults.length > 0) setShowManualResults(true); }}
                  placeholder="Search item by description, temp code, LOA..."
                  disabled={!formData.circle}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-slate-200 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50"
                />
              </div>

              {showManualResults && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {isSearchingManual ? (
                    <div className="p-3 text-sm text-center text-slate-500">Searching...</div>
                  ) : manualItemResults.length > 0 ? (
                    manualItemResults.map((res) => (
                      <div
                        key={res._id}
                        onClick={() => handleAddManualItem(res)}
                        className="px-4 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                      >
                        <div className="text-sm font-medium text-slate-800">
                          {res.dynamicData?.description || res.dynamicData?.name || 'Unknown Item'}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex gap-3">
                          <span>Temp: {res.dynamicData?.tempCode || 'N/A'}</span>
                          <span>LOA: {res.dynamicData?.sku || res.dynamicData?.loaSrNo || 'N/A'}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-sm text-center text-slate-500">No items found.</div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
            <button
              onClick={() => setShowLoaColumns(!showLoaColumns)}
              className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              {showLoaColumns ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showLoaColumns ? 'Hide' : 'Show'} LOA & BOM Qty Columns
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {items.length === 0 && !isLoadingItems ? (
            <div className="p-12 text-center text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
              Select an activity to view items
            </div>
          ) : (
            <DataTable 
              columns={columns} 
              data={tableData} 
              isLoading={isLoadingItems}
              initialPinning={{ left: ["tempCode", "activity", "loaSrNo"] }}
              enableSorting={true}
              enableColumnReordering={true}
              enableColumnVisibility={true}
              enableGlobalFilter={true}
              enableExport={true}
              getIsGroupRow={getIsGroupRow}
              renderSubComponent={renderGroupRow}
            />
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 flex justify-between items-center z-10 px-6 lg:pl-72">
        <div className="text-lg font-bold text-slate-800">
          Grand Total: ₹{items.reduce((sum, item) => sum + (item.totalAmount || 0), 0).toLocaleString()}
        </div>
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? 'Saving...' : 'Save Work Order'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
