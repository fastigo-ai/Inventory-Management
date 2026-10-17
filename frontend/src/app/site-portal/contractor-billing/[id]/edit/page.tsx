'use client';

import React, { useState, useEffect, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  Plus, 
  Trash2, 
  Upload, 
  FileCheck, 
  Search, 
  CheckCircle2, 
  ExternalLink,
  Receipt,
  Building2,
  Calendar,
  Layers,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/shared/api/axios';
import { updateContractorInvoice, getContractorInvoiceById } from '@/features/contractor-billing/api/contractor-billing.api';
import { getItems } from '@/features/items/api/items.api';
import { uploadDocument } from '@/features/documents/api/documents.api';
import { useAuthStore } from '@/shared/store/auth.store';

const STAGES = ['10%', '20%', '25%', '30%', '50%', '60%', '70%', '75%', '90%', '100%', 'Advance', 'Amount', 'Adhoc'];

export default function EditContractorBill({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Raw Invoice Header Metadata
  const [invoiceData, setInvoiceData] = useState<any>(null);

  // Form State
  const [contractorId, setContractorId] = useState('');
  const [workOrderId, setWorkOrderId] = useState('');
  const [stage, setStage] = useState('90%');
  const [globalCategory, setGlobalCategory] = useState<'JMC Done' | 'Erection'>('JMC Done');
  const [jmcDocUrl, setJmcDocUrl] = useState('');
  const [signedBillDocUrl, setSignedBillDocUrl] = useState('');
  const [drawingNumber, setDrawingNumber] = useState('');
  const [supplyRaBillNo, setSupplyRaBillNo] = useState('');
  const [isUploadingJmc, setIsUploadingJmc] = useState(false);
  const [isUploadingSigned, setIsUploadingSigned] = useState(false);

  // Search filter for line items table (great for enterprise bills with 50+ items)
  const [searchTerm, setSearchTerm] = useState('');

  // Items State
  const [lineItems, setLineItems] = useState<any[]>([]);

  // Metadata Options
  const [contractors, setContractors] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [availableItems, setAvailableItems] = useState<any[]>([]);
  const [jmcItemMap, setJmcItemMap] = useState<Record<string, number>>({});
  const [prevBilledJmcMap, setPrevBilledJmcMap] = useState<Record<string, number>>({});

  // 1. Initial Load of Invoice
  useEffect(() => {
    if (!id) return;

    setInitialLoading(true);
    getContractorInvoiceById(id)
      .then(async (res) => {
        if (res.success && res.data) {
          const inv = res.data;
          setInvoiceData(inv);
          setContractorId(inv.contractorId?._id || inv.contractorId || '');
          setWorkOrderId(inv.workOrderId?._id || inv.workOrderId || '');
          setStage(inv.stage || '90%');
          if (inv.lineItems?.length > 0 && inv.lineItems[0].billingCategory) {
            setGlobalCategory(inv.lineItems[0].billingCategory);
          }
          setJmcDocUrl(inv.jmcDocUrl || '');
          setSignedBillDocUrl(inv.signedBillDocUrl || '');
          setDrawingNumber(inv.drawingNumber || '');
          setSupplyRaBillNo(inv.supplyRaBillNo || '');

          // Resolve invoice circle & package
          const invCircle = (inv.legacyMetadata?.circle || inv.workOrderId?.circle || inv.contractorId?.location || user?.assignedCircle || '').trim();
          const invPackage = (inv.legacyMetadata?.package || inv.workOrderId?.package || user?.assignedPackage || '').trim();
          const circleLower = invCircle.toLowerCase();

          // Fetch items for this circle/package so all options & metadata are available
          let fetchedItems: any[] = [];
          try {
            const itemFilters: any = {};
            if (invCircle) itemFilters.circle = invCircle;
            if (invPackage) itemFilters.package = invPackage;
            const itemsRes = await getItems({ filters: itemFilters, limit: 50000 });
            const rawItems = itemsRes?.items || itemsRes?.data?.items || itemsRes?.data?.data || itemsRes?.data || itemsRes || [];
            fetchedItems = Array.isArray(rawItems) ? rawItems : (Array.isArray(rawItems?.items) ? rawItems.items : []);
            setAvailableItems(fetchedItems);
          } catch (e) {
            console.error('Failed to pre-fetch available items for invoice context', e);
          }

          // Build quick lookup map by SKU, tempCode, and itemId
          const itemsBySku = new Map<string, any>();
          const itemsByTempCode = new Map<string, any>();
          const itemsById = new Map<string, any>();
          if (Array.isArray(fetchedItems)) {
            fetchedItems.forEach(ai => {
              const idKey = String(ai._id || ai.id).trim();
              const skuKey = String(ai.dynamicData?.sku || ai.dynamicData?.loaSerialNo || ai.loaSerialNo || '').trim();
              const tcKey = String(ai.dynamicData?.tempCode || ai.tempCode || '').trim();
              if (idKey) itemsById.set(idKey, ai);
              if (skuKey) itemsBySku.set(skuKey, ai);
              if (tcKey && !itemsByTempCode.has(tcKey)) itemsByTempCode.set(tcKey, ai);
            });
          }

          // Pre-populate and enrich line items
          const mappedItems = (inv.lineItems || []).map((item: any) => {
            const itemDoc = (typeof item.itemId === 'object' && item.itemId !== null) ? item.itemId : null;
            const dData = itemDoc?.dynamicData || {};
            const itemDocId = itemDoc?._id ? String(itemDoc._id) : String(item.itemId || '');
            
            // Cross-reference with availableItems if item was not populated or missing dynamicData
            const matchedAi = itemsById.get(itemDocId) || 
                              itemsBySku.get(String(item.loaSrNo || item.loaSerialNo || item.legacyData?.loaSerialNo || '').trim()) ||
                              itemsByTempCode.get(String(item.tempCode || '').trim());
            const aiData = matchedAi?.dynamicData || {};

            // Check matched Work Order item if present
            const matchedWoItem = inv.workOrderId?.items?.find((woItem: any) => 
              (woItem.itemId?._id || woItem.itemId)?.toString() === itemDocId ||
              (woItem.tempCode && String(woItem.tempCode).trim() === String(item.tempCode || '').trim()) ||
              (woItem.loaSrNo && String(woItem.loaSrNo).trim() === String(item.loaSrNo || item.loaSerialNo || '').trim())
            );

            // 1. Resolve Temp Code
            const resolvedTempCode = String(
              item.tempCode || 
              item.tc || 
              dData.tempCode || 
              dData.temp_code || 
              matchedWoItem?.tempCode || 
              aiData.tempCode || 
              aiData.temp_code || 
              '-'
            ).trim();

            // 2. Resolve LOA Sl No
            const resolvedLoaSrNo = String(
              item.loaSrNo || 
              item.loaSerialNo || 
              item.legacyData?.loaSerialNo || 
              matchedWoItem?.loaSrNo || 
              dData.sku || 
              dData.loaSerialNo || 
              dData.loaSrNo || 
              aiData.sku || 
              aiData.loaSerialNo || 
              '-'
            ).trim();

            // 3. Resolve LOA Qty
            let resolvedLoaQty = 0;
            if (matchedWoItem?.circleLoaQty !== undefined) {
              resolvedLoaQty = Number(matchedWoItem.circleLoaQty || 0);
            } else if (matchedWoItem?.woQty !== undefined) {
              resolvedLoaQty = Number(matchedWoItem.woQty || 0);
            } else if (circleLower && dData[`${circleLower}LoaQuantity`] !== undefined && dData[`${circleLower}LoaQuantity`] !== '') {
              resolvedLoaQty = Number(dData[`${circleLower}LoaQuantity`] || 0);
            } else if (dData.loaQuantity !== undefined && dData.loaQuantity !== '') {
              resolvedLoaQty = Number(dData.loaQuantity || 0);
            } else if (circleLower && aiData[`${circleLower}LoaQuantity`] !== undefined && aiData[`${circleLower}LoaQuantity`] !== '') {
              resolvedLoaQty = Number(aiData[`${circleLower}LoaQuantity`] || 0);
            } else if (aiData.loaQuantity !== undefined && aiData.loaQuantity !== '') {
              resolvedLoaQty = Number(aiData.loaQuantity || 0);
            } else if (circleLower && (dData[`${circleLower}BomQuantity`] || aiData[`${circleLower}BomQuantity`])) {
              resolvedLoaQty = Number(dData[`${circleLower}BomQuantity`] || aiData[`${circleLower}BomQuantity`] || 0);
            } else if (dData.bomQuantity || aiData.bomQuantity) {
              resolvedLoaQty = Number(dData.bomQuantity || aiData.bomQuantity || 0);
            } else {
              resolvedLoaQty = Number(item.loaQty || 0);
            }

            // 4. Resolve Rate & Quantities
            // Edge case: For Contractor Bill, NEVER fetch rate from master item erection rate or boqRate!
            const isContractorBill = inv.billingCategory === 'Contractor Bill';
            const resolvedRate = isContractorBill
              ? Number(item.rate || matchedWoItem?.contractorErectionRate || 0)
              : Number(item.rate || matchedWoItem?.contractorErectionRate || dData.boqRate || aiData.boqRate || 0);
            const resolvedJmcDoneQty = Number(item.jmcDoneQty !== undefined ? item.jmcDoneQty : (item.erectedQty || 0));
            const resolvedErectedQty = Number(item.erectedQty !== undefined ? item.erectedQty : (item.jmcDoneQty || 0));
            const resolvedGstRate = Number(item.gstRate !== undefined && item.gstRate <= 28 && item.gstRate > 0 ? item.gstRate : 18);

            return {
              ...item,
              itemId: itemDoc?._id || item.itemId || matchedAi?._id || '',
              activity: item.activity || dData.activity || aiData.activity || matchedWoItem?.activity || 'General Works',
              description: item.description || dData.itemName || dData.name || dData.description || aiData.itemName || aiData.name || aiData.description || matchedWoItem?.description || '-',
              tempCode: resolvedTempCode,
              loaSrNo: resolvedLoaSrNo,
              loaSerialNo: resolvedLoaSrNo,
              loaQty: resolvedLoaQty,
              rate: resolvedRate,
              jmcDoneQty: resolvedJmcDoneQty,
              erectedQty: resolvedErectedQty,
              gstRate: resolvedGstRate,
              billingCategory: item.billingCategory || inv.lineItems?.[0]?.billingCategory || 'JMC Done',
              legacyData: {
                ...(item.legacyData || {}),
                loaSerialNo: resolvedLoaSrNo,
                unit: item.unit || item.legacyData?.unit || dData.unit || aiData.unit || 'Nos'
              }
            };
          });

          setLineItems(mappedItems);
        } else {
          toast.error('Invoice details could not be found');
        }
      })
      .catch((err) => {
        console.error('Failed to load invoice', err);
        toast.error('Failed to load invoice details');
      })
      .finally(() => {
        setInitialLoading(false);
      });
  }, [id, user]);

  // 2. Fetch Contractors
  useEffect(() => {
    api.get('/contractors').then(res => {
      const data = res.data?.data;
      let arr: any[] = [];
      if (Array.isArray(data)) {
        arr = data;
      } else if (data && Array.isArray(data.contractors)) {
        arr = data.contractors;
      }
      setContractors(arr);
    }).catch(console.error);
  }, []);

  // 3. Fetch Work Orders for selected Contractor
  useEffect(() => {
    if (contractorId) {
      api.get(`/ho-billing/contractor-work-orders?contractorId=${contractorId}`).then(res => {
        const arr = res.data?.data?.data || res.data?.data || res.data || [];
        setWorkOrders(Array.isArray(arr) ? arr : []);
      }).catch(console.error);
    } else {
      setWorkOrders([]);
    }
  }, [contractorId]);

  // 4. Fetch Approved JMC Limits
  useEffect(() => {
    if (contractorId) {
      api.get(`/jmc?contractorId=${contractorId}&limit=all`).then(res => {
        const payload = res.data?.data;
        const jmcs: any[] = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.jmcs)
          ? payload.jmcs
          : Array.isArray(payload)
          ? payload
          : Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
          ? res.data
          : [];
        const map: Record<string, number> = {};
        if (Array.isArray(jmcs)) {
          jmcs.forEach((jmc: any) => {
            if (jmc.status === 'Approved' && Array.isArray(jmc.items)) {
              let jmcWOId = jmc.workOrderId;
              if (jmcWOId && typeof jmcWOId === 'object') {
                jmcWOId = jmcWOId._id || jmcWOId.id || jmcWOId;
              }
              if (workOrderId && String(jmcWOId) !== String(workOrderId)) return;
              
              jmc.items.forEach((item: any) => {
                if (item.itemId) {
                  const tc = String(item.tempCode || (typeof item.itemId === 'object' ? (item.itemId.dynamicData?.tempCode || '') : '')).trim();
                  const loaNo = String(item.loaSerialNo || (typeof item.itemId === 'object' ? (item.itemId.dynamicData?.sku || item.itemId.loaSerialNo || '') : '')).trim();
                  const key = `${tc}_${loaNo}`;
                  if (key !== '_') {
                    if (!map[key]) map[key] = 0;
                    map[key] += (Number(item.approvedQty) || Number(item.claimedQty) || 0);
                  }
                }
              });
            }
          });
        }
        setJmcItemMap(map);
      }).catch(console.error);
    } else {
      setJmcItemMap({});
    }
  }, [contractorId, workOrderId]);

  // 5. Fetch Previously Billed JMC Qty to enforce ceilings
  useEffect(() => {
    if (contractorId) {
      let query = `/contractor-billing/invoices?contractorId=${contractorId}`;
      if (workOrderId) {
        query += `&workOrderId=${workOrderId}`;
      }
      api.get(query).then(res => {
        const payload = res.data?.data;
        const invoices: any[] = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload)
          ? payload
          : Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
          ? res.data
          : [];
        const map: Record<string, number> = {};
        
        if (Array.isArray(invoices)) {
          invoices.forEach((inv: any) => {
            // Exclude current invoice from previous totals so user can re-save!
            if (String(inv._id) !== String(id) && inv.status !== 'Rejected' && Array.isArray(inv.lineItems)) {
              inv.lineItems.forEach((item: any) => {
                if (item.itemId && (inv.stage === '90%' || inv.stage === '100%')) {
                  const tc = String(item.tempCode || (typeof item.itemId === 'object' ? (item.itemId.dynamicData?.tempCode || '') : '')).trim();
                  const loaNo = String(item.loaSerialNo || (typeof item.itemId === 'object' ? (item.itemId.dynamicData?.sku || item.itemId.loaSerialNo || '') : '')).trim();
                  const key = `${tc}_${loaNo}`;
                  if (!map[key]) map[key] = 0;
                  map[key] += (item.jmcDoneQty || 0);
                }
              });
            }
          });
        }
        setPrevBilledJmcMap(map);
      }).catch(console.error);
    } else {
      setPrevBilledJmcMap({});
    }
  }, [contractorId, workOrderId, id]);

  // Unique activities for dropdown
  const uniqueActivities = useMemo(() => {
    const activities = new Set<string>();
    if (Array.isArray(availableItems)) {
      availableItems.forEach(ai => {
        const act = ai.dynamicData?.activity || ai.activity;
        if (act) activities.add(act);
      });
    }
    // Also include any activity already on current line items
    if (Array.isArray(lineItems)) {
      lineItems.forEach(li => {
        if (li.activity) activities.add(li.activity);
      });
    }
    return Array.from(activities).sort();
  }, [availableItems, lineItems]);

  // Handle Document Uploads
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>, 
    setter: (url: string) => void, 
    loadingSetter: (val: boolean) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      loadingSetter(true);
      const fd = new FormData();
      fd.append('file', file);
      const res = await uploadDocument(fd);
      if (res?.data?.url) {
        setter(res.data.url);
        toast.success('Document uploaded successfully');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to upload document');
    } finally {
      loadingSetter(false);
    }
  };

  // Add Line Item
  const handleAddItem = () => {
    setLineItems([
      ...lineItems,
      {
        itemId: '',
        activity: uniqueActivities[0] || '',
        description: '',
        tempCode: '-',
        loaSrNo: '-',
        loaSerialNo: '-',
        loaQty: 0,
        rate: 0,
        jmcDoneQty: 0,
        erectedQty: 0,
        gstRate: 18,
        billingCategory: globalCategory
      }
    ]);
  };

  // Remove Line Item
  const handleRemoveItem = (index: number) => {
    const newItems = [...lineItems];
    newItems.splice(index, 1);
    setLineItems(newItems);
  };

  // Change Line Item Attribute
  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...lineItems];
    const circleLower = (invoiceData?.legacyMetadata?.circle || invoiceData?.workOrderId?.circle || user?.assignedCircle || '').toLowerCase();

    if (field === 'activity') {
      newItems[index].activity = value;
      if (value) {
        const matchingItems = availableItems.filter(ai => (ai.dynamicData?.activity || ai.activity || '') === value);
        if (matchingItems.length > 0) {
          const first = matchingItems[0];
          const dData = first.dynamicData || {};
          newItems[index].itemId = first._id;
          newItems[index].description = dData.itemName || dData.name || dData.description || first.itemName || '-';
          newItems[index].rate = invoiceData?.billingCategory === 'Contractor Bill' ? 0 : Number(dData.boqRate || first.boqRate || dData.rate || 0);
          newItems[index].tempCode = dData.tempCode || dData.temp_code || '-';
          newItems[index].loaSerialNo = dData.sku || dData.loaSerialNo || '-';
          newItems[index].loaSrNo = dData.sku || dData.loaSerialNo || '-';
          newItems[index].loaQty = Number(
            (circleLower && dData[`${circleLower}LoaQuantity`]) || 
            dData.loaQuantity || 
            (circleLower && dData[`${circleLower}BomQuantity`]) || 
            dData.bomQuantity || 
            0
          );
        }
      }
    } else if (field === 'itemId') {
      newItems[index].itemId = value;
      const selectedItem = availableItems.find(i => String(i._id) === String(value));
      if (selectedItem) {
        const dData = selectedItem.dynamicData || {};
        newItems[index].description = dData.itemName || dData.name || dData.description || selectedItem.itemName || '-';
        newItems[index].rate = invoiceData?.billingCategory === 'Contractor Bill' ? 0 : Number(dData.boqRate || selectedItem.boqRate || dData.rate || 0);
        newItems[index].activity = dData.activity || selectedItem.activity || newItems[index].activity;
        newItems[index].tempCode = dData.tempCode || dData.temp_code || '-';
        newItems[index].loaSerialNo = dData.sku || dData.loaSerialNo || '-';
        newItems[index].loaSrNo = dData.sku || dData.loaSerialNo || '-';
        newItems[index].loaQty = Number(
          (circleLower && dData[`${circleLower}LoaQuantity`]) || 
          dData.loaQuantity || 
          (circleLower && dData[`${circleLower}BomQuantity`]) || 
          dData.bomQuantity || 
          0
        );
      }
    } else {
      newItems[index][field] = value;
    }

    setLineItems(newItems);
  };

  // Grand Totals Computation
  const isNonPercent = stage === 'Amount' || stage === 'Advance' || stage === 'Adhoc';
  const percentage = isNonPercent ? 100 : (parseInt(stage) || 0);

  const billCalculations = useMemo(() => {
    let subtotalTaxable = 0;
    let totalGst = 0;

    const rowDetails = lineItems.map((item) => {
      const qty = globalCategory === 'JMC Done' ? Number(item.jmcDoneQty || 0) : Number(item.erectedQty || 0);
      const rate = Number(item.rate || 0);
      const gstRate = Number(item.gstRate !== undefined && item.gstRate <= 28 && item.gstRate > 0 ? item.gstRate : 18);

      const fullBaseAmt = (qty > 0 && rate > 0) ? (qty * rate) : Number(item.baseAmount || 0);

      const baseAmt = (isNonPercent || percentage === 100)
        ? fullBaseAmt 
        : (fullBaseAmt * (percentage / 100));

      // Rule: GST is always 100% of the total amount, NOT reduced by stage percentage (e.g. 90%)
      const gstAmt = fullBaseAmt * (gstRate / 100);
      const totalAmt = baseAmt + gstAmt;

      subtotalTaxable += baseAmt;
      totalGst += gstAmt;

      return {
        fullBaseAmt,
        baseAmt,
        gstAmt,
        totalAmt
      };
    });

    return {
      rowDetails,
      subtotalTaxable,
      totalGst,
      grandTotal: subtotalTaxable + totalGst
    };
  }, [lineItems, stage, globalCategory, percentage, isNonPercent]);

  // Submit Updated Bill
  const handleSubmit = async () => {
    if (!contractorId || !stage) {
      toast.error('Please select Contractor and Billing Stage');
      return;
    }

    if (lineItems.length === 0) {
      toast.error('Please maintain at least one line item in the bill');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        contractorId,
        workOrderId: workOrderId || undefined,
        stage,
        jmcDocUrl,
        signedBillDocUrl,
        drawingNumber,
        supplyRaBillNo,
        lineItems: lineItems.map((item, idx) => {
          const calc = billCalculations.rowDetails[idx] || { baseAmt: 0, gstAmt: 0, totalAmt: 0 };
          return {
            ...item,
            billingCategory: globalCategory,
            rate: Number(item.rate || 0),
            jmcDoneQty: Number(item.jmcDoneQty || 0),
            erectedQty: Number(item.erectedQty || 0),
            gstRate: Number(item.gstRate || 0),
            baseAmount: calc.baseAmt,
            gstAmount: calc.gstAmt,
            totalAmount: calc.totalAmt,
            tempCode: String(item.tempCode || '').trim(),
            loaSerialNo: String(item.loaSerialNo || item.loaSrNo || '').trim(),
            loaSrNo: String(item.loaSerialNo || item.loaSrNo || '').trim(),
          };
        })
      };

      await updateContractorInvoice(id, payload);
      toast.success('Contractor RA Bill updated successfully!');
      router.push(`/site-portal/contractor-billing/${id}`);
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to update contractor bill');
    } finally {
      setLoading(false);
    }
  };

  // Filtered Items for fast ERP search
  const filteredLineItems = useMemo(() => {
    if (!searchTerm.trim()) return lineItems;
    const term = searchTerm.toLowerCase();
    return lineItems.filter(item => 
      (item.description && item.description.toLowerCase().includes(term)) ||
      (item.tempCode && String(item.tempCode).toLowerCase().includes(term)) ||
      (item.loaSerialNo && String(item.loaSerialNo).toLowerCase().includes(term)) ||
      (item.activity && item.activity.toLowerCase().includes(term))
    );
  }, [lineItems, searchTerm]);

  if (initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        <p className="text-sm font-medium text-slate-600">Loading contractor bill and metadata...</p>
      </div>
    );
  }

  const contractorName = 
    invoiceData?.contractorId?.dynamicData?.displayName || 
    invoiceData?.contractorId?.name || 
    invoiceData?.contractorId?.vendorName || 
    'Contractor';
  const circleName = invoiceData?.legacyMetadata?.circle || invoiceData?.workOrderId?.circle || 'Circle';
  const packageName = invoiceData?.legacyMetadata?.package || invoiceData?.workOrderId?.package || 'Package';

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6 pb-32">
      {/* Enterprise ERP Header Ribbon */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <button 
              onClick={() => router.back()} 
              className="mt-1 p-2 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors text-slate-600"
              title="Go Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  RA Bill Editor
                </span>
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                  {invoiceData?.status || 'Pending PM Approval'}
                </span>
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  {stage} Stage
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mt-1 flex items-center gap-3">
                {invoiceData?.invoiceNumber || 'Contractor Bill'}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-1">
                <span className="flex items-center gap-1 font-medium text-slate-700">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  {contractorName}
                </span>
                <span>•</span>
                <span>{circleName} ({packageName})</span>
                {invoiceData?.date && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(invoiceData.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </>
                )}
                <span>•</span>
                <span className="font-semibold text-slate-700">{lineItems.length} Bill Items</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-lg p-3 px-5 self-start lg:self-auto">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Taxable Subtotal</p>
              <p className="text-sm font-semibold text-slate-700">
                ₹{billCalculations.subtotalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">GST Total</p>
              <p className="text-sm font-semibold text-slate-700">
                ₹{billCalculations.totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <p className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider">Bill Total ({stage})</p>
              <p className="text-lg font-bold text-indigo-700 font-mono">
                ₹{billCalculations.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Billing Context & Mandatory Documentation */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5">
          <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-indigo-600" />
            Billing Context & Documentation
          </CardTitle>
          <CardDescription className="text-xs">
            Review linked contractor, stage, drawing information, and verification documents.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Contractor <span className="text-red-500">*</span></Label>
              <select
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={contractorId}
                onChange={(e) => setContractorId(e.target.value)}
              >
                <option value="">Select Contractor</option>
                {contractors.map(c => (
                  <option key={c._id} value={c._id}>
                    {c.dynamicData?.displayName || c.name || c.vendorName || 'Unknown Contractor'}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Work Order</Label>
              <select
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={workOrderId}
                onChange={(e) => setWorkOrderId(e.target.value)}
              >
                <option value="">No Work Order / Legacy Direct Bill</option>
                {workOrders.map(w => (
                  <option key={w._id} value={w._id}>{w.workOrderNumber}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Billing Stage <span className="text-red-500">*</span></Label>
              <select
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
              >
                {STAGES.map(s => (
                  <option key={s} value={s}>{s} Payment Release Stage</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Billing Category <span className="text-red-500">*</span></Label>
              <select
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                value={globalCategory}
                onChange={(e) => setGlobalCategory(e.target.value as any)}
              >
                <option value="JMC Done">JMC Done</option>
                <option value="Erection">Erection</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-2 border-t border-slate-100">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Drawing Number</Label>
              <Input
                type="text"
                placeholder="Enter Drawing No."
                className="h-9 text-xs"
                value={drawingNumber}
                onChange={(e) => setDrawingNumber(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Supply 60% RA Bill Reference</Label>
              <Input
                type="text"
                placeholder="Linked Supply Bill No."
                className="h-9 text-xs"
                value={supplyRaBillNo}
                onChange={(e) => setSupplyRaBillNo(e.target.value)}
              />
            </div>

            {/* Document Verification Row */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Upload Attachments</Label>
              <div className="flex items-center gap-2">
                <label className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-xs font-medium text-slate-700 transition-colors">
                    {isUploadingJmc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    <span>{jmcDocUrl ? 'Replace JMC Copy' : 'Upload JMC Copy'}</span>
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    onChange={(e) => handleFileUpload(e, setJmcDocUrl, setIsUploadingJmc)} 
                  />
                </label>
                {jmcDocUrl && (
                  <a 
                    href={jmcDocUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="p-1.5 text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-200 rounded"
                    title="View uploaded JMC file"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}

                <label className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-xs font-medium text-slate-700 transition-colors">
                    {isUploadingSigned ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    <span>{signedBillDocUrl ? 'Replace Bill Copy' : 'Upload Bill Copy'}</span>
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    onChange={(e) => handleFileUpload(e, setSignedBillDocUrl, setIsUploadingSigned)} 
                  />
                </label>
                {signedBillDocUrl && (
                  <a 
                    href={signedBillDocUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="p-1.5 text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-200 rounded"
                    title="View uploaded Signed Bill file"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bill Line Items Table - Enterprise ERP Design */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-200 py-3.5 px-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Bill Line Items
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 ml-1">
                {lineItems.length} Total
              </span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Review line items, verify BOQ rates, temp codes, and billed release quantities.
            </CardDescription>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick search input */}
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <Input
                type="text"
                placeholder="Search description, temp code..."
                className="h-8 pl-8 text-xs bg-white border-slate-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Button 
              onClick={handleAddItem} 
              size="sm" 
              className="bg-indigo-600 hover:bg-indigo-700 h-8 text-xs font-semibold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Item
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-xs text-left border-collapse min-w-[1300px]">
              <thead className="text-[11px] font-bold text-slate-700 uppercase bg-slate-100/80 border-b border-slate-200 tracking-wider">
                <tr>
                  <th className="py-3 px-3 text-center w-12 border-r border-slate-200">#</th>
                  <th className="py-3 px-3 min-w-[200px] border-r border-slate-200">Activity</th>
                  <th className="py-3 px-3 min-w-[260px] border-r border-slate-200">Item Description</th>
                  <th className="py-3 px-3 text-center min-w-[95px] border-r border-slate-200">Temp Code</th>
                  <th className="py-3 px-3 text-center min-w-[95px] border-r border-slate-200">LOA Sl No</th>
                  <th className="py-3 px-3 text-right min-w-[90px] border-r border-slate-200">LOA Qty</th>
                  <th className="py-3 px-3 text-right min-w-[135px] border-r border-slate-200 bg-amber-50/40">
                    Rate (₹)
                  </th>
                  {globalCategory === 'JMC Done' ? (
                    <th className="py-3 px-3 text-right min-w-[125px] border-r border-slate-200 bg-blue-50/60 text-blue-900">
                      JMC Done Qty
                      <span className="block text-[9px] font-normal text-blue-600 lowercase">{stage} release</span>
                    </th>
                  ) : (
                    <th className="py-3 px-3 text-right min-w-[125px] border-r border-slate-200 bg-orange-50/60 text-orange-900">
                      Erected Qty
                      <span className="block text-[9px] font-normal text-orange-600 lowercase">adhoc release</span>
                    </th>
                  )}
                  <th className="py-3 px-3 text-right min-w-[125px] border-r border-slate-200 bg-slate-50 text-slate-800 font-bold">
                    Base Price (₹)
                    <span className="block text-[9px] font-normal text-slate-500 lowercase">qty × rate (100%)</span>
                  </th>
                  <th className="py-3 px-3 text-center min-w-[75px] border-r border-slate-200">GST %</th>
                  <th className="py-3 px-3 text-right min-w-[130px] border-r border-slate-200 bg-slate-50">
                    Taxable ({stage}) (₹)
                  </th>
                  <th className="py-3 px-3 text-right min-w-[120px] border-r border-slate-200 bg-emerald-50/50 text-emerald-900 font-bold">
                    GST (100%) (₹)
                  </th>
                  <th className="py-3 px-3 text-right min-w-[145px] border-r border-slate-200 bg-indigo-50/40 text-indigo-900 font-bold">
                    Total Amount (₹)
                  </th>
                  <th className="py-3 px-2 text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredLineItems.map((item, idx) => {
                  const originalIndex = lineItems.indexOf(item);
                  const calc = billCalculations.rowDetails[originalIndex] || { baseAmt: 0, gstAmt: 0, totalAmt: 0 };
                  const billedQty = globalCategory === 'JMC Done' ? Number(item.jmcDoneQty || 0) : Number(item.erectedQty || 0);

                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      {/* # Row Number */}
                      <td className="py-2.5 px-3 text-center font-mono text-slate-400 border-r border-slate-200">
                        {originalIndex + 1}
                      </td>

                      {/* Activity Dropdown */}
                      <td className="py-2 px-3 border-r border-slate-200">
                        <select
                          className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                          value={item.activity}
                          onChange={(e) => handleItemChange(originalIndex, 'activity', e.target.value)}
                        >
                          <option value="">Select Activity</option>
                          {uniqueActivities.map(act => (
                            <option key={act} value={act}>{act}</option>
                          ))}
                        </select>
                      </td>

                      {/* Item Dropdown / Description */}
                      <td className="py-2 px-3 border-r border-slate-200">
                        {availableItems.length > 0 ? (
                          <select
                            className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            value={item.itemId}
                            onChange={(e) => handleItemChange(originalIndex, 'itemId', e.target.value)}
                          >
                            <option value="">{item.description || 'Select Item'}</option>
                            {availableItems
                              .filter(ai => !item.activity || (ai.dynamicData?.activity || ai.activity) === item.activity)
                              .map(ai => {
                                const name = ai.dynamicData?.itemName || ai.dynamicData?.name || ai.itemName || 'Item';
                                const tc = ai.dynamicData?.tempCode || '';
                                return (
                                  <option key={ai._id} value={ai._id}>
                                    {tc ? `[${tc}] ` : ''}{name}
                                  </option>
                                );
                              })}
                          </select>
                        ) : (
                          <Input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleItemChange(originalIndex, 'description', e.target.value)}
                            className="h-8 text-xs font-medium text-slate-800"
                          />
                        )}
                      </td>

                      {/* Temp Code */}
                      <td className="py-2.5 px-3 text-center border-r border-slate-200">
                        <span className="inline-block px-2 py-0.5 rounded font-mono font-bold text-xs bg-slate-100 text-slate-800 border border-slate-200">
                          {item.tempCode && item.tempCode !== '-' ? item.tempCode : '-'}
                        </span>
                      </td>

                      {/* LOA Sl No */}
                      <td className="py-2.5 px-3 text-center border-r border-slate-200">
                        <span className="inline-block px-2 py-0.5 rounded font-mono text-xs text-slate-700 bg-slate-50 border border-slate-200">
                          {item.loaSerialNo || item.loaSrNo || '-'}
                        </span>
                      </td>

                      {/* LOA Qty */}
                      <td className="py-2.5 px-3 text-right font-medium text-slate-600 border-r border-slate-200">
                        {Number(item.loaQty || 0).toLocaleString('en-IN')}
                      </td>

                      {/* Rate Input Box (Enterprise ERP styling - wide enough so numbers never truncate!) */}
                      <td className="py-2 px-3 border-r border-slate-200 bg-amber-50/20">
                        <div className="relative flex items-center">
                          <span className="absolute left-2.5 text-slate-400 font-medium text-xs pointer-events-none">₹</span>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.rate !== undefined ? item.rate : 0}
                            onChange={(e) => handleItemChange(originalIndex, 'rate', parseFloat(e.target.value) || 0)}
                            className="h-8 w-32 min-w-[125px] pl-6 pr-2 text-right font-medium text-xs font-mono border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                          />
                        </div>
                      </td>

                      {/* Billed Quantity Input */}
                      {globalCategory === 'JMC Done' ? (
                        <td className="py-2 px-3 border-r border-slate-200 bg-blue-50/20">
                          <div className="flex flex-col items-end">
                            <Input
                              type="number"
                              step="any"
                              value={item.jmcDoneQty !== undefined ? item.jmcDoneQty : 0}
                              onChange={(e) => handleItemChange(originalIndex, 'jmcDoneQty', parseFloat(e.target.value) || 0)}
                              className="h-8 w-28 min-w-[110px] text-right font-bold text-xs font-mono border-blue-200 text-blue-900 bg-white focus:ring-1 focus:ring-blue-500"
                            />
                            {(() => {
                              const tc = String(item.tempCode || '').trim();
                              const loaNo = String(item.loaSerialNo || item.loaSrNo || '').trim();
                              const key = `${tc}_${loaNo}`;
                              const maxAvailable = Math.max(0, (jmcItemMap[key] || 0) - (prevBilledJmcMap[key] || 0));
                              if (jmcItemMap[key]) {
                                return (
                                  <span className="text-[10px] text-slate-400 mt-0.5">
                                    Max: {maxAvailable}
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </td>
                      ) : (
                        <td className="py-2 px-3 border-r border-slate-200 bg-orange-50/20">
                          <Input
                            type="number"
                            step="any"
                            value={item.erectedQty !== undefined ? item.erectedQty : 0}
                            onChange={(e) => handleItemChange(originalIndex, 'erectedQty', parseFloat(e.target.value) || 0)}
                            className="h-8 w-28 min-w-[110px] text-right font-bold text-xs font-mono border-orange-200 text-orange-900 bg-white focus:ring-1 focus:ring-orange-500 ml-auto"
                          />
                        </td>
                      )}

                      {/* Base Price (100% = Qty * Rate) */}
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-800 border-r border-slate-200 bg-slate-50/40">
                        ₹{calc.fullBaseAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* GST % */}
                      <td className="py-2 px-3 border-r border-slate-200 text-center">
                        <Input
                          type="number"
                          value={item.gstRate !== undefined && item.gstRate <= 28 && item.gstRate > 0 ? item.gstRate : 18}
                          onChange={(e) => handleItemChange(originalIndex, 'gstRate', parseFloat(e.target.value) || 18)}
                          className="h-8 w-16 text-center text-xs font-mono mx-auto"
                        />
                      </td>

                      {/* Taxable Base Amount (Stage %) */}
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-700 border-r border-slate-200 bg-slate-50/50">
                        ₹{calc.baseAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* GST Amount (100% of Base Price * GST%) */}
                      <td className="py-2.5 px-3 text-right font-mono text-xs font-semibold text-emerald-700 border-r border-slate-200 bg-emerald-50/30">
                        ₹{calc.gstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Total Amount (Taxable + GST) */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 border-r border-slate-200 bg-indigo-50/30">
                        ₹{calc.totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Delete Action */}
                      <td className="py-2.5 px-2 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(originalIndex)}
                          className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                          title="Remove Line Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}

                {filteredLineItems.length === 0 && (
                  <tr>
                    <td colSpan={13} className="py-12 text-center text-slate-500 text-xs">
                      {searchTerm ? (
                        <div>
                          <p className="font-medium text-slate-700">No items match "{searchTerm}"</p>
                          <button onClick={() => setSearchTerm('')} className="text-indigo-600 underline mt-1 text-xs">
                            Clear search filter
                          </button>
                        </div>
                      ) : (
                        <p>No line items found. Click 'Add Item' above to insert bill items.</p>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Enterprise Totals Breakdown Card */}
          <div className="bg-slate-50 border-t border-slate-200 p-6 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="space-y-1.5 max-w-md text-xs text-slate-500">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                Calculation Rules & Verification
              </h4>
              <p>• Taxable Base Amount is calculated at <strong>{stage}</strong> release of (Billed Qty × Unit Rate).</p>
              <p>• GST is charged at the specified item rate (standard 18%) on the taxable base value.</p>
              <p>• Changes made here update the official RA bill ledger, contractor ledgers, and site audit logs.</p>
            </div>

            {/* Enterprise Summary Slip */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm w-full md:w-80 space-y-3">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Total Items</span>
                <span className="font-semibold text-slate-800">{lineItems.length} Items</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Taxable Base Value ({stage})</span>
                <span className="font-mono font-medium text-slate-800">
                  ₹{billCalculations.subtotalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Total GST Amount</span>
                <span className="font-mono font-medium text-slate-800">
                  ₹{billCalculations.totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="h-px bg-slate-200" />
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-1">
                <span>Grand Total Due</span>
                <span className="font-mono text-indigo-700 text-base">
                  ₹{billCalculations.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Floating Enterprise Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] z-20 pl-4 md:pl-72">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span className="font-bold text-slate-800">{invoiceData?.invoiceNumber || 'Bill'}</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">{lineItems.length} Items</span>
            <span>•</span>
            <span className="font-mono font-bold text-indigo-700 text-sm">
              ₹{billCalculations.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={() => router.back()} 
              disabled={loading}
              className="text-xs font-semibold h-9"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-5 flex items-center gap-2 shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Save & Update Bill
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
