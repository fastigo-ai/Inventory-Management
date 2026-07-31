"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Settings, UploadCloud, ChevronDown, User, Table as TableIcon, Trash2, Paperclip, FileText, Plus, Loader2, Search } from "lucide-react";
import Link from "next/link";
import { getPurchaseInvoiceById, updatePurchaseInvoice, deletePurchaseInvoice } from "@/features/purchases/api/purchases.api";
import { getVendors } from "@/features/vendors/api/vendors.api";
import { getPurchaseOrders } from "@/features/purchases/api/purchases.api";
import { getItems } from "@/features/items/api/items.api";
import { uploadDocument } from "@/features/documents/api/documents.api";
import { getBillingCompanies } from "@/features/settings/api/billingCompanies.api";
import { getDIs } from "@/features/di/api/di.api";
import { getDocumentAllocation } from "@/features/allocations/api/allocations.api";
import { AuditTimeline } from "@/shared/components/audit/AuditTimeline";
import { toast } from "sonner";
import Select from "react-select";

const customSelectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    minHeight: '40px',
    height: '40px',
    borderRadius: '0.375rem',
    borderColor: state.isFocused ? '#0076f2' : '#cbd5e1',
    boxShadow: state.isFocused ? '0 0 0 1px #0076f2' : 'none',
    '&:hover': { borderColor: state.isFocused ? '#0076f2' : '#94a3b8' },
    fontSize: '13px',
    backgroundColor: state.isDisabled ? '#f8fafc' : 'white',
  }),
  valueContainer: (base: any) => ({ ...base, padding: '0 12px' }),
  input: (base: any) => ({ ...base, margin: 0, padding: 0 }),
  dropdownIndicator: (base: any) => ({ ...base, padding: '4px 8px' }),
  menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
  menu: (base: any) => ({
    ...base,
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    borderRadius: '0.5rem',
    overflow: 'hidden',
    zIndex: 9999
  }),
  option: (base: any, state: any) => ({
    ...base,
    fontSize: '13px',
    backgroundColor: state.isSelected ? '#eff6ff' : state.isFocused ? '#f8fafc' : 'white',
    color: state.isSelected ? '#1d4ed8' : '#334155',
    cursor: 'pointer',
    '&:active': { backgroundColor: '#e2e8f0' }
  })
};

export default function EditPurchaseInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const prId = params.id as string;
  
  // Data State
  const [vendors, setVendors] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [dis, setDis] = useState<any[]>([]);
  
  // Form State
  const [vendorName, setVendorName] = useState("");
  const [purchaseOrderInput, setPurchaseOrderInput] = useState("");
  const [PurchaseInvoiceNumber, setPurchaseInvoiceNumber] = useState("");
  const [receiveDate, setReceiveDate] = useState("");
  const [billingFrom, setBillingFrom] = useState("");
  const [billingCompanies, setBillingCompanies] = useState<any[]>([]);
  const [status, setStatus] = useState<string>("Draft");
  const [isLocked, setIsLocked] = useState(false);
  
  // Extra fields
  const [diNo, setDiNo] = useState("");
  const [diDate, setDiDate] = useState("");
  const [notes, setNotes] = useState("");
  
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [dropdownSearchQueries, setDropdownSearchQueries] = useState<{[key: number]: string}>({});

  // Bulk Add Modal State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkSearchQuery, setBulkSearchQuery] = useState('');
  const [bulkFilters, setBulkFilters] = useState({ sku: '', tempCode: '', name: '', package: '', circle: '' });
  const [selectedBulkItems, setSelectedBulkItems] = useState<string[]>([]);

  const [uploadedDocs, setUploadedDocs] = useState<any[]>([]);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Close dropdowns when clicking outside
    const handleClickOutside = () => {
      setOpenDropdownId(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    Promise.all([
      getVendors({ limit: 100 }).then(res => setVendors(res.vendors || res)),
      getPurchaseOrders().then(res => setPurchaseOrders(Array.isArray(res.data) ? res.data : (res.data?.pos || res.data || []))),
      getItems({ limit: 10000 }).then(res => setItemsList(res.items || res.data || res)),
      getDIs({ limit: 10000 }).then(res => {
        if (res.data) {
          setDis(Array.isArray(res.data) ? res.data : (res.data.dis || []));
        } else {
          setDis([]);
        }
      }),
      getBillingCompanies().then(res => setBillingCompanies(res.data || [])),
      getPurchaseInvoiceById(prId).then(data => {
        setVendorName(data.vendorName || "");
        setPurchaseOrderInput(data.purchaseOrderNumber || "");
        setPurchaseInvoiceNumber(data.PurchaseInvoiceNumber || "");
        setReceiveDate(data.receiveDate ? new Date(data.receiveDate).toISOString().split('T')[0] : "");
        setBillingFrom(data.billingFrom || "");
        setDiNo(data.diNo || "");
        setDiDate(data.diDate ? new Date(data.diDate).toISOString().split('T')[0] : "");
        setNotes(data.notes || "");
        setStatus(data.status || "Draft");
        setIsLocked(data.isLocked || false);
        
        if (data.lineItems) {
          setLineItems(data.lineItems);
        }
        if (data.attachments) {
          setUploadedDocs(data.attachments.map((a: any) => ({ _id: a._id || Math.random().toString(), fileName: a.name, url: a.url })));
        }
      })
    ]).finally(() => {
      setIsLoading(false);
      // Allow the PO auto-fetching logic to run only after initial data is set
      setTimeout(() => setInitialLoadDone(true), 500);
    });
  }, [prId]);

  // Auto-hydrator for missing tempCode or loaSerialNo
  useEffect(() => {
    if (itemsList.length === 0 || lineItems.length === 0) return;

    const getDVal = (d: any, ...keys: string[]): string => {
      if (!d) return '';
      for (const key of keys) {
        if (d[key] !== undefined && d[key] !== null && d[key] !== '') return String(d[key]);
        const alphaNumKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        const found = Object.keys(d).find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === alphaNumKey);
        if (found && d[found] !== undefined && d[found] !== null && d[found] !== '') return String(d[found]);
      }
      return '';
    };

    const findMatchForItem = (item: any): any => {
      if (item.itemId) {
         const match = itemsList.find(i => i._id === item.itemId);
         if (match) return match;
      }
      
      return itemsList.find((i: any) => {
        const d = i.dynamicData || {};
        let matchCount = 0;
        let checkCount = 0;

        if (item.tempCode) {
          checkCount++;
          const dbTemp = getDVal(d, 'tempCode', 'sku', 'itemCode').trim();
          const rowTemp = String(item.tempCode).trim();
          if (dbTemp === rowTemp) matchCount++;
          else return false;
        }
        if (item.loaSerialNo) {
          checkCount++;
          const dbLoa = getDVal(d, 'loaSerialNo', 'loaSerial', 'sku').trim();
          const rowLoa = String(item.loaSerialNo).trim();
          if (dbLoa === rowLoa) matchCount++;
          else return false;
        }
        if (item.circle) {
          checkCount++;
          const dbCirc = getDVal(d, 'circle').trim().toLowerCase();
          const rowCirc = String(item.circle).trim().toLowerCase();
          if (dbCirc === rowCirc) matchCount++;
          else return false;
        }
        if (item.package) {
          checkCount++;
          const dbPkg = getDVal(d, 'package').replace(/\s+/g, '').toLowerCase();
          const rowPkg = String(item.package).replace(/\s+/g, '').toLowerCase();
          if (dbPkg && (rowPkg.includes(dbPkg) || dbPkg.includes(rowPkg))) matchCount++;
          else return false;
        }
        if (item.itemName) {
          checkCount++;
          const dbName = getDVal(d, 'name', 'itemName', 'itemDescription').trim().toLowerCase();
          const rowName = String(item.itemName).trim().toLowerCase();
          if (dbName && (dbName.includes(rowName) || rowName.includes(dbName))) matchCount++;
          else return false;
        }

        return checkCount > 0 && matchCount === checkCount;
      });
    };

    let changed = false;
    const updated = lineItems.map((item: any) => {
      if (item.loaSerialNo && item.tempCode) return item;

      const match = findMatchForItem(item);
      if (match) {
        const d = match.dynamicData || {};
        let newTempCode = item.tempCode || getDVal(d, 'tempCode', 'sku', 'itemCode');
        let newLoa = item.loaSerialNo || getDVal(d, 'loaSerialNo', 'loaSerial', 'sku');

        if (newTempCode !== item.tempCode || newLoa !== item.loaSerialNo) {
           changed = true;
           return { ...item, tempCode: newTempCode, loaSerialNo: newLoa, itemId: item.itemId || match._id };
        }
      }
      return item;
    });

    if (changed) setLineItems(updated);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsList, lineItems]);

  const populateLineItemsFromPO = (poNum: string) => {
    const po = purchaseOrders.find(p => p.purchaseOrderNumber === poNum);
    if (po && po.lineItems) {
      if (diNo) {
        setLineItems((prev: any[]) => {
          let changed = false;
          const updated = prev.map(item => {
            const poMatch = po.lineItems.find((pItem: any) => 
              !pItem.isCanceled &&
              String(pItem.loaSerialNo || '').trim() === String(item.loaSerialNo || '').trim() &&
              String(pItem.package || '').trim() === String(item.package || '').trim() &&
              String(pItem.circle || '').trim() === String(item.circle || '').trim()
            );
            if (poMatch) {
              const poQty = poMatch.quantity || 0;
              const poDate = poMatch.poDate || '';
              if (item.poQuantity !== poQty || item.poDate !== poDate) {
                changed = true;
                return { ...item, poQuantity: poQty, poDate: poDate };
              }
            }
            return item;
          });
          return changed ? updated : prev;
        });
      } else {
        setLineItems(po.lineItems.map((item: any) => ({
          itemId: item.itemId,
          loaSerialNo: item.loaSerialNo || '',
          itemName: item.itemName,
          itemDescription: item.description || '',
          tempCode: item.tempCode || '',
          package: item.package || '',
          circle: item.circle || '',
          poQuantity: item.quantity || 0,
          diQuantity: 0,
          invoiceQuantity: 0,
          srt: 0,
          act: 0,
          totalInvoiceQuantity: 0,
          unit: item.unit || '',
          rate: item.rate || 0,
          amount: 0,
          gstType: item.gstType || 'Intra State',
          cgst: item.cgst || 0,
          sgst: item.sgst || 0,
          igst: item.igst || 0,
          totalAmount: 0
        })));
      }
    } else if (!diNo) {
      setLineItems([]);
    }
  };

  const handleVendorChange = (newVendor: string) => {
    setVendorName(newVendor);
    if (!receiveDate) {
      setReceiveDate(new Date().toISOString().split('T')[0]);
    }
    const vendorPOs = purchaseOrders.filter(po => po.vendorName === newVendor);
    if (vendorPOs.length > 0) {
      const newPO = vendorPOs[0].purchaseOrderNumber;
      setPurchaseOrderInput(newPO);
      populateLineItemsFromPO(newPO);
    } else {
      setPurchaseOrderInput(""); 
      setLineItems([]);
    }
  };

  const handlePOChange = (newPO: string) => {
    setPurchaseOrderInput(newPO);
    populateLineItemsFromPO(newPO);
  };

  const handleDIChange = async (newDi: string) => {
    setDiNo(newDi);
    const di = dis.find(d => d.diNumber === newDi);
    if (di) {
      if (di.vendorName && di.vendorName !== vendorName) {
         setVendorName(di.vendorName);
      }
      if (di.poNumber) {
         setPurchaseOrderInput(di.poNumber);
      }
      if (di.date) {
         setDiDate(new Date(di.date).toISOString().split('T')[0]);
      }
      
      let allocationMap = new Map();
      try {
        const allocations = await getDocumentAllocation(di._id, 'DI', prId as string);
        allocations.forEach((alloc: any) => {
          allocationMap.set(alloc.lineId, alloc.remainingQuantity);
        });
      } catch (error) {
        console.error("Failed to fetch DI allocations", error);
      }
      
      if (di.lineItems && di.lineItems.length > 0) {
        const itemsWithBalance = di.lineItems.filter((item: any) => {
           const remaining = allocationMap.get(item._id);
           return remaining === undefined || remaining > 0;
        });

        const po = di.poNumber ? purchaseOrders.find(p => p.purchaseOrderNumber === di.poNumber) : null;
        setLineItems(itemsWithBalance.map((item: any) => {
          let poQty = 0;
          let poDate = '';
          if (po && po.lineItems) {
            const poMatch = po.lineItems.find((pItem: any) => 
              !pItem.isCanceled &&
              String(pItem.loaSerialNo || '').trim() === String(item.loaSerialNo || item.sku || '').trim() &&
              String(pItem.package || '').trim() === String(item.package || '').trim() &&
              String(pItem.circle || '').trim() === String(item.circle || '').trim()
            );
            if (poMatch) {
              poQty = poMatch.quantity || 0;
              poDate = poMatch.poDate || '';
            }
          }
          const remaining = allocationMap.get(item._id) !== undefined ? allocationMap.get(item._id) : (item.quantity || 0);
          return {
            itemId: item.itemId,
            diId: di._id,
            diLineId: item._id,
            package: item.package || '',
            circle: item.circle || '',
            tempCode: item.tempCode || '',
            itemName: item.itemName,
            itemDescription: item.description || item.itemName || '',
            loaSerialNo: item.loaSerialNo || item.sku || '',
            hsnCode: item.hsnCode || '',
            poQuantity: poQty,
            diQuantity: remaining,
            poDate: poDate,
            srt: 0,
            act: 0,
            totalInvoiceQuantity: 0,
            unit: item.unit || '',
            gstType: item.gstType || 'Intra State',
            cgst: item.cgst || 0,
            sgst: item.sgst || 0,
            igst: item.igst || 0,
            invoiceQuantity: item.quantity || 0,
            rate: item.rate || 0,
            amount: 0,
            totalAmount: 0
          };
        }));
      }
    }
  };

  // Recalculate amount when quantityToReceive or rate changes
  const updateLineItem = (index: number, field: string, value: any) => {
    const newItems = [...lineItems];
    newItems[index][field] = value;
    
    // Auto calculate amount and total quantity
    if (field === 'srt' || field === 'act' || field === 'rate' || field === 'cgst' || field === 'sgst' || field === 'igst' || field === 'gstType') {
      const srt = Number(newItems[index].srt) || 0;
      const act = Number(newItems[index].act) || 0;
      const rate = Number(newItems[index].rate) || 0;
      newItems[index].totalInvoiceQuantity = srt + act;
      newItems[index].invoiceQuantity = (Number(newItems[index].diQuantity) || 0) - newItems[index].totalInvoiceQuantity;
      newItems[index].amount = newItems[index].totalInvoiceQuantity * rate;

      const cgst = Number(newItems[index].cgst) || 0;
      const sgst = Number(newItems[index].sgst) || 0;
      const igst = Number(newItems[index].igst) || 0;
      const taxRate = newItems[index].gstType === 'Intra State' ? (cgst + sgst) : igst;
      newItems[index].totalAmount = newItems[index].amount + (newItems[index].amount * taxRate / 100);
    }

    // Auto fill LOA Serial No based on package, circle, tempCode, itemName
    if (['package', 'circle', 'tempCode', 'itemName', 'itemDescription'].includes(field)) {
       const updatedItem = newItems[index];
       if (!updatedItem.loaSerialNo) {
          const getDVal = (d: any, ...keys: string[]): string => {
            if (!d) return '';
            for (const key of keys) {
              if (d[key] !== undefined && d[key] !== null && d[key] !== '') return String(d[key]);
              const found = Object.keys(d).find(k => k.toLowerCase() === key.toLowerCase());
              if (found && d[found] !== undefined && d[found] !== null && d[found] !== '') return String(d[found]);
            }
            return '';
          };
          
          const filtered = itemsList.filter(i => {
            const d = i.dynamicData || {};
            if (updatedItem.tempCode) {
              const dbTemp = getDVal(d, 'tempCode').trim();
              const rowTemp = String(updatedItem.tempCode).trim();
              if (!dbTemp || dbTemp !== rowTemp) return false;
            }
            if (updatedItem.itemName) {
              const dbName = getDVal(d, 'name', 'itemName', 'itemDescription').trim().toLowerCase();
              const rowName = String(updatedItem.itemName).trim().toLowerCase();
              if (!dbName || (!dbName.includes(rowName) && !rowName.includes(dbName))) return false;
            }
            if (updatedItem.package) {
              const dbPkg = getDVal(d, 'package').replace(/\s+/g, '').toLowerCase();
              const rowPkg = String(updatedItem.package).replace(/\s+/g, '').toLowerCase();
              if (!dbPkg || (!rowPkg.includes(dbPkg) && !dbPkg.includes(rowPkg))) return false;
            }
            if (updatedItem.circle) {
              const dbCirc = getDVal(d, 'circle').trim().toLowerCase();
              const rowCirc = String(updatedItem.circle).trim().toLowerCase();
              if (!dbCirc || dbCirc !== rowCirc) return false;
            }
            if (updatedItem.itemDescription) {
              const dbDesc = getDVal(d, 'description', 'itemDescription').trim().toLowerCase();
              const rowDesc = String(updatedItem.itemDescription).trim().toLowerCase();
              if (dbDesc && (!dbDesc.includes(rowDesc) && !rowDesc.includes(dbDesc))) return false;
            }
            return true;
          });

          if (filtered.length > 0) {
            const loaSerialNos = Array.from(new Set(
              filtered.map(i => {
                const d = i.dynamicData || {};
                const loaKey = Object.keys(d).find(k => {
                  const normalized = k.toLowerCase().replace(/[^a-z0-9]/g, '');
                  return normalized === 'loaserialno' || normalized === 'loaserial';
                });
                return loaKey ? String(d[loaKey]) : (d.sku ? String(d.sku) : null);
              }).filter(v => v && v.trim() !== '')
            ));

            if (loaSerialNos.length === 1) {
              newItems[index].loaSerialNo = loaSerialNos[0];
            }
          }
       }
    }

    setLineItems(newItems);
  };

  const handleSubmit = async (submitStatus: 'Draft' | 'Received') => {
    if (isLocked) {
      alert("This invoice is locked from editing because the Store Manager has already begun processing it.");
      return;
    }

    if (!vendorName || !PurchaseInvoiceNumber || !receiveDate) {
      alert("Please fill in the required fields");
      return;
    }

    const hasInvalidQuantity = lineItems.some(item => (Number(item.totalInvoiceQuantity) || 0) > (Number(item.invoiceQuantity) || 0));
    if (hasInvalidQuantity) {
      alert("Total Invoice Quantity cannot be greater than Invoice Quantity");
      return;
    }

    try {
      const matchedPo = purchaseOrders.find(p => p.purchaseOrderNumber === purchaseOrderInput);
      const payload = {
        vendorName,
        purchaseOrderId: matchedPo ? matchedPo._id : undefined,
        purchaseOrderNumber: purchaseOrderInput || undefined,
        PurchaseInvoiceNumber,
        receiveDate,
        billingFrom,
        diNo, diDate, 
        notes,
        lineItems,
        status: submitStatus === 'Draft' ? 'Draft' : 'Unpaid',
        receiptStatus: submitStatus === 'Received' ? 'Received' : 'Pending Receipt',
        attachments: uploadedDocs.map(doc => ({ name: doc.fileName, url: doc.url }))
      };

      await updatePurchaseInvoice(prId, payload);
      router.push('/purchases/invoices');
    } catch (error) {
      console.error("Failed to update PR", error);
      alert("Failed to update Purchase Invoice");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this Purchase Receive?")) return;
    try {
      await deletePurchaseInvoice(prId);
      toast.success("Purchase Receive deleted successfully");
      router.push('/purchases/invoices');
    } catch (error) {
      console.error("Failed to delete PR", error);
      toast.error("Failed to delete Purchase Receive");
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sourceType", "Purchase Invoice");
      formData.append("sourceId", PurchaseInvoiceNumber); // Use PR number as sourceId reference

      const res = await uploadDocument(formData);
      if (res.data) {
        setUploadedDocs([...uploadedDocs, res.data]);
      }
    } catch (error) {
      console.error("Upload failed", error);
      alert("Failed to upload document");
    } finally {
      setIsUploadingDoc(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#fcfcfc]">
        <Loader2 className="w-8 h-8 animate-spin text-[#4285f4]" />
      </div>
    );
  }

  const handleAddItem = () => {
    setLineItems([
      ...lineItems,
      {
        isManual: true,
        itemId: '',
        loaSerialNo: '',
        itemName: '',
        itemDescription: '',
        package: '',
        circle: '',
        poQuantity: 0,
        invoiceQuantity: 0,
        srt: 0,
        act: 0,
        totalInvoiceQuantity: 0,
        amount: 0,
        gstType: 'Intra State',
        cgst: 0,
        sgst: 0,
        igst: 0,
        totalAmount: 0
      }
    ]);
  };

  const isBlurred = !vendorName;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex-none h-16 border-b border-slate-200 flex items-center justify-between px-6 shrink-0 bg-[#f8f9fa]">
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
          <h1 className="text-xl text-slate-800 font-semibold tracking-tight">Edit Purchase Invoice</h1>
        </div>
        <Link href="/purchases/invoices">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:bg-slate-200 rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-10 py-8 bg-[#fcfcfc]">
        <div className="max-w-[1200px] mx-auto bg-white p-8 shadow-sm border border-slate-200 rounded-lg">
          
          {isLocked && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start text-red-700">
              <svg className="w-5 h-5 mr-3 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="font-semibold text-sm">Invoice Locked</h3>
                <p className="text-xs mt-1">This invoice is locked from editing because the Store Manager has already begun processing the inward entries. Changes to quantities or items are not permitted.</p>
              </div>
            </div>
          )}

          {/* Top Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6 mb-8">
            
            <div className="col-span-1">
              <label className="block text-[13px] font-medium text-slate-700 mb-2">Vendor Name <span className="text-red-500">*</span></label>
              <Select
                options={vendors.map(v => {
                  const label = v.dynamicData?.companyName || v.dynamicData?.displayName || v._id;
                  return { label, value: label };
                })}
                value={vendorName ? { label: vendorName, value: vendorName } : null}
                onChange={(selected: any) => handleVendorChange(selected ? selected.value : '')}
                placeholder="Select a Vendor"
                styles={customSelectStyles}
                isClearable
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                isDisabled={isLocked}
              />
            </div>
            <div className="col-span-2"></div>

            <div className="col-span-1">
              <label className="block text-[13px] font-medium text-slate-700 mb-2">Purchase Order#</label>
              <Select
                options={purchaseOrders
                  .filter(po => !vendorName || po.vendorName === vendorName)
                  .map(po => ({ label: po.purchaseOrderNumber, value: po.purchaseOrderNumber }))}
                value={purchaseOrderInput ? { label: purchaseOrderInput, value: purchaseOrderInput } : null}
                onChange={(selected: any) => handlePOChange(selected ? selected.value : '')}
                isDisabled={isLocked}
                placeholder="Select a Purchase Order"
                styles={customSelectStyles}
                isClearable
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              />
            </div>

            <div className="col-span-1">
              <label className="block text-[13px] font-medium text-slate-700 mb-2">Received Date <span className="text-red-500">*</span></label>
              <Input 
                type="date"
                className="h-10 text-[13px] rounded-md border-slate-300"
                value={receiveDate}
                onChange={(e) => setReceiveDate(e.target.value)}
              />
            </div>
            <div className="col-span-1">
              <label className="block text-[13px] font-medium text-slate-700 mb-2">Billing From</label>
              <div className="relative">
                <select 
                  className="w-full h-10 rounded-md text-[13px] border border-slate-300 px-3 bg-white focus:outline-none focus:border-[#0076f2] focus:ring-1 focus:ring-[#0076f2] appearance-none"
                  value={billingFrom}
                  onChange={(e) => setBillingFrom(e.target.value)}
                >
                  <option value="">Select Billing Company</option>
                  {billingCompanies.map(c => (
                    <option key={c._id} value={c.name}>{c.name}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            </div>

          </div>

          {/* Blurred / Active Section */}
          <div className={`transition-all duration-500 ${isBlurred ? 'opacity-40 blur-[2px] pointer-events-none select-none' : 'opacity-100'}`}>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6 mb-12 border-b border-slate-100 pb-8">
              
              <div className="col-span-1">
                <label className="block text-[13px] font-medium text-slate-700 mb-2">Purchase Invoice#</label>
                <div className="relative">
                  <Input 
                    className="h-10 text-[13px] pr-8 rounded-md border-slate-300 bg-slate-50"
                    value={PurchaseInvoiceNumber}
                    onChange={(e) => setPurchaseInvoiceNumber(e.target.value)}
                    disabled // PR number is usually not editable once created
                  />
                  <Settings className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                </div>
              </div>

              <div className="col-span-1">
                <label className="block text-[13px] font-medium text-slate-700 mb-2">DI No</label>
                <Select
                  options={dis.map(di => ({ label: di.diNumber, value: di.diNumber }))}
                  value={diNo ? { label: diNo, value: diNo } : null}
                  onChange={(selected: any) => handleDIChange(selected ? selected.value : '')}
                  placeholder="Select DI No"
                  styles={customSelectStyles}
                  isClearable
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                  isDisabled={isLocked}
                />
              </div>
              
              <div className="col-span-1">
                <label className="block text-[13px] font-medium text-slate-700 mb-2">DI Date</label>
                <Input 
                  type="date" 
                  className="h-10 text-[13px] rounded-md border-slate-300" 
                  value={diDate} 
                  onChange={e => setDiDate(e.target.value)} 
                />
              </div>
            </div>

            {/* Item Table */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <TableIcon className="w-5 h-5 text-blue-500" />
                  <h3 className="text-[15px] font-semibold text-slate-700">Item Table</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleAddItem} className="h-8 text-blue-600 border-blue-200 hover:bg-blue-50">
                    <Plus className="w-4 h-4 mr-1" /> Add Item
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setBulkFilters({ sku: '', tempCode: '', name: '', package: '', circle: '' }); setSelectedBulkItems([]); setIsBulkModalOpen(true); }} className="h-8 text-blue-600 border-blue-200 hover:bg-blue-50">
                    <Plus className="w-4 h-4 mr-1" /> Add Items in Bulk
                  </Button>
                </div>
              </div>
              <div className="border border-slate-200 rounded-lg overflow-x-auto shadow-sm">
                <table className="w-full text-sm text-left whitespace-nowrap min-w-[2200px]">
                  <thead className="bg-[#f8f9fa] border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 w-12 text-center">#</th>
                      <th className="px-3 py-3 min-w-[120px]">Package</th>
                      <th className="px-3 py-3 min-w-[120px]">Circle</th>
                      <th className="px-3 py-3 min-w-[140px]">Temp Code</th>
                      <th className="px-3 py-3 min-w-[180px]">Item Name</th>
                      <th className="px-3 py-3 min-w-[200px]">Description</th>
                      <th className="px-3 py-3 min-w-[120px]">LOA Serial No</th>
                      <th className="px-3 py-3 min-w-[100px]">HSN Code</th>
                      <th className="px-3 py-3 min-w-[100px] text-right">PO Qty</th>
                      <th className="px-3 py-3 min-w-[120px]">PO Date</th>
                      <th className="px-3 py-3 min-w-[100px] text-right">DI Qty</th>
                      <th className="px-3 py-3 min-w-[100px] text-center">Balance Qty</th>
                      <th className="px-3 py-3 min-w-[80px]">Unit</th>
                      <th className="px-3 py-3 min-w-[80px] text-right">SRT</th>
                      <th className="px-3 py-3 min-w-[80px] text-right">ACT</th>
                      <th className="px-3 py-3 min-w-[100px] text-right">Tot Inv Qty</th>
                      <th className="px-3 py-3 min-w-[120px] text-right">Rate</th>
                      <th className="px-4 py-3 min-w-[120px] text-right">Amount</th>
                      <th className="px-3 py-3 min-w-[120px]">GST Type</th>
                      <th className="px-3 py-3 min-w-[80px] text-right">CGST %</th>
                      <th className="px-3 py-3 min-w-[80px] text-right">SGST %</th>
                      <th className="px-3 py-3 min-w-[80px] text-right">IGST %</th>
                      <th className="px-4 py-3 min-w-[120px] text-right">Total Amount</th>
                      <th className="px-4 py-3 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.length === 0 ? (
                      <tr>
                        <td colSpan={20} className="px-4 py-8 text-center text-slate-500 text-[13px]">
                          Select a Purchase Order or click 'Add Item' to begin.
                        </td>
                      </tr>
                    ) : (
                      lineItems.map((item, index) => {
                        const allPackages = Array.from(new Set(itemsList.map(i => i.dynamicData?.package).filter(Boolean)));
                        const circles = Array.from(new Set(itemsList.map(i => i.dynamicData?.circle).filter(Boolean)));
                        // tempCodes: only use actual tempCode field, NOT sku as fallback
                        const tempCodes = Array.from(new Set(itemsList.map(i => i.dynamicData?.tempCode).filter(Boolean)));
                        const itemNames = Array.from(new Set(itemsList.map(i => i.dynamicData?.name || i.dynamicData?.itemDescription || i._id)));

                        // Helper: get a value from dynamicData by multiple possible key names
                        const getDVal = (d: any, ...keys: string[]): string => {
                          if (!d) return '';
                          for (const key of keys) {
                            if (d[key] !== undefined && d[key] !== null && d[key] !== '') return String(d[key]);
                            const found = Object.keys(d).find(k => k.toLowerCase() === key.toLowerCase());
                            if (found && d[found] !== undefined && d[found] !== null && d[found] !== '') return String(d[found]);
                          }
                          return '';
                        };

                        // Strict AND filter: ALL provided row fields must match
                        const filteredItemsList = itemsList.filter(i => {
                          const d = i.dynamicData || {};

                          if (item.tempCode) {
                            const dbTemp = getDVal(d, 'tempCode').trim();
                            const rowTemp = String(item.tempCode).trim();
                            if (!dbTemp || dbTemp !== rowTemp) return false;
                          }

                          if (item.itemName) {
                            const dbName = getDVal(d, 'name', 'itemName', 'itemDescription').trim().toLowerCase();
                            const rowName = String(item.itemName).trim().toLowerCase();
                            if (!dbName || (!dbName.includes(rowName) && !rowName.includes(dbName))) return false;
                          }

                          if (item.package) {
                            const dbPkg = getDVal(d, 'package').replace(/\s+/g, '').toLowerCase();
                            const rowPkg = String(item.package).replace(/\s+/g, '').toLowerCase();
                            if (!dbPkg || (!rowPkg.includes(dbPkg) && !dbPkg.includes(rowPkg))) return false;
                          }

                          if (item.circle) {
                            const dbCirc = getDVal(d, 'circle').trim().toLowerCase();
                            const rowCirc = String(item.circle).trim().toLowerCase();
                            if (!dbCirc || dbCirc !== rowCirc) return false;
                          }

                          if (item.itemDescription) {
                            const dbDesc = getDVal(d, 'description', 'itemDescription').trim().toLowerCase();
                            const rowDesc = String(item.itemDescription).trim().toLowerCase();
                            if (dbDesc && (!dbDesc.includes(rowDesc) && !rowDesc.includes(dbDesc))) return false;
                          }

                          return true;
                        });

                        // Extract LOA serial numbers from matched items only
                        // In DB: 'sku' field holds the LOA Serial No
                        const loaSerialNos = Array.from(new Set(
                          (filteredItemsList.length > 0 ? filteredItemsList : []).map(i => {
                            const d = i.dynamicData || {};
                            const loaKey = Object.keys(d).find(k => {
                              const normalized = k.toLowerCase().replace(/[^a-z0-9]/g, '');
                              return normalized === 'loaserialno' || normalized === 'loaserial';
                            });
                            return loaKey ? String(d[loaKey]) : (d.sku ? String(d.sku) : null);
                          }).filter(v => v && v.trim() !== '')
                        ));

                        const handleItemSelection = (identifier: string, type: 'name' | 'tempCode' | 'description' | 'loaSerialNo') => {
                          const selectedItem = itemsList.find(i => {
                            if (type === 'name') return (i.dynamicData?.name || i.dynamicData?.itemDescription || i._id) === identifier;
                            if (type === 'tempCode') return (i.dynamicData?.tempCode || i.dynamicData?.sku || i.dynamicData?.itemCode) === identifier;
                            if (type === 'description') return (i.dynamicData?.description || i.dynamicData?.itemDescription) === identifier;
                            if (type === 'loaSerialNo') {
                              const d = i.dynamicData || {};
                              const loaKey = Object.keys(d).find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === 'loaserialno' || k.toLowerCase().replace(/[^a-z0-9]/g, '') === 'loaserial' || k.toLowerCase() === 'sku');
                              return (loaKey ? String(d[loaKey]) : '') === String(identifier);
                            }
                            return false;
                          });
                          if (selectedItem) {
                             const d = selectedItem.dynamicData || {};
                             const getVal = (key: string) => {
                               if (d[key] !== undefined) return d[key];
                               const lowerKey = key.toLowerCase();
                               let foundKey = Object.keys(d).find(k => k.toLowerCase() === lowerKey);
                               if (foundKey) return d[foundKey];
                               const alphaNumKey = lowerKey.replace(/[^a-z0-9]/g, '');
                               foundKey = Object.keys(d).find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === alphaNumKey);
                               if (foundKey) return d[foundKey];
                               if (key === 'loaSerialNo' && d['sku']) return d['sku'];
                               return '';
                             };
                             
                             let pkg = getVal('package');
                             if (pkg) {
                               const p = String(pkg).toLowerCase();
                               if (p.includes('1') || p.includes('s/n') || p.includes('solan') || p.includes('nahan')) pkg = 'Package 1 (S/N)';
                               else if (p.includes('2') || p.includes('r/r') || p.includes('rampur') || p.includes('rohru')) pkg = 'Package 2 (R/R)';
                             }
                             
                             let circ = getVal('circle');
                             if (circ) {
                               const c = String(circ).toLowerCase();
                               if (c.includes('solan')) circ = 'Solan';
                               else if (c.includes('nahan')) circ = 'Nahan';
                               else if (c.includes('rampur')) circ = 'Rampur';
                               else if (c.includes('rohru')) circ = 'Rohru';
                             }
                             const newItems = [...lineItems];
                             newItems[index] = {
                               ...newItems[index],
                               itemId: selectedItem._id,
                               itemName: getVal('name') || getVal('itemDescription') || selectedItem._id || newItems[index].itemName,
                               package: pkg || newItems[index].package,
                               circle: circ || newItems[index].circle,
                               tempCode: getVal('tempCode') || getVal('sku') || getVal('itemCode') || newItems[index].tempCode,
                               itemDescription: getVal('description') || getVal('itemDescription') || newItems[index].itemDescription,
                               loaSerialNo: getVal('loaSerialNo') || getVal('loaSerial') || getVal('sku') || (loaSerialNos.length === 1 ? loaSerialNos[0] : ''),
                               hsnCode: getVal('hsnCode') || getVal('hsn') || '',
                               unit: getVal('unit') || '',
                               gstType: newItems[index].gstType || 'Intra State',
                               cgst: Number(getVal('cgst')) || 0,
                               sgst: Number(getVal('sgst')) || 0,
                               igst: Number(getVal('igst')) || 0,
                               rate: Number(getVal('price') || getVal('costPrice') || getVal('sellingPrice')) || newItems[index].rate
                             };
                             newItems[index].amount = (Number(newItems[index].totalInvoiceQuantity) || 0) * (Number(newItems[index].rate) || 0);
                             const taxRate = newItems[index].gstType === 'Intra State' ? (newItems[index].cgst + newItems[index].sgst) : newItems[index].igst;
                             newItems[index].totalAmount = newItems[index].amount + (newItems[index].amount * taxRate / 100);
                             setLineItems(newItems);
                          } else {
                             updateLineItem(index, type === 'name' ? 'itemName' : type === 'tempCode' ? 'tempCode' : type === 'loaSerialNo' ? 'loaSerialNo' : 'itemDescription', identifier);
                          }
                        };

                        return (
                          <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 transition-colors bg-white">
                            <td className="px-4 py-2 text-center text-[13px] text-slate-500 font-medium">
                              {index + 1}
                            </td>
                            <td className="px-2 py-2">
                              {item.isManual ? (
                                <select className="w-full h-8 text-[12px] border border-slate-200 rounded px-2 focus:border-blue-500 outline-none bg-transparent"
                                  value={item.package || ''}
                                  onChange={e => updateLineItem(index, 'package', e.target.value)}
                                >
                                  <option value="">Select</option>
                                  {allPackages.map((p: any) => <option key={p} value={p}>{p}</option>)}
                                </select>
                              ) : (
                                <span className="text-[12px] px-2">{item.package || '-'}</span>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              {item.isManual ? (
                                <select className="w-full h-8 text-[12px] border border-slate-200 rounded px-2 focus:border-blue-500 outline-none bg-transparent"
                                  value={item.circle || ''}
                                  onChange={e => updateLineItem(index, 'circle', e.target.value)}
                                >
                                  <option value="">Select</option>
                                  {circles.map((c: any) => <option key={c} value={c}>{c}</option>)}
                                </select>
                              ) : (
                                <span className="text-[12px] px-2">{item.circle || '-'}</span>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              {item.isManual ? (
                                <Select
                                  options={tempCodes.map(tc => ({ value: tc, label: tc }))}
                                  value={item.tempCode ? { value: item.tempCode, label: item.tempCode } : null}
                                  onChange={(selected: any) => {
                                    if (selected) handleItemSelection(selected.value as string, 'tempCode');
                                    else updateLineItem(index, 'tempCode', '');
                                  }}
                                  onInputChange={(inputValue, { action }) => {
                                    if (action === 'input-change') updateLineItem(index, 'tempCode', inputValue);
                                  }}
                                  placeholder="Select"
                                  isClearable
                                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                                  styles={{
                                    control: (base) => ({ ...base, minHeight: '32px', height: '32px', fontSize: '12px', backgroundColor: 'transparent', border: '1px solid #e2e8f0', boxShadow: 'none' }),
                                    valueContainer: (base) => ({ ...base, padding: '0 8px' }),
                                    input: (base) => ({ ...base, margin: 0, padding: 0 }),
                                    indicatorsContainer: (base) => ({ ...base, height: '32px' }),
                                    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                    menu: (base) => ({ ...base, fontSize: '12px', minWidth: '200px' }),
                                    option: (base) => ({ ...base, padding: '8px 12px' })
                                  }}
                                />
                              ) : (
                                <span className="text-[12px] px-2">{item.tempCode || '-'}</span>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              {item.isManual ? (
                                <Select
                                  options={itemNames.map((n: any) => ({ value: n, label: n }))}
                                  value={item.itemName ? { value: item.itemName, label: item.itemName } : null}
                                  onChange={(selected: any) => {
                                    if (selected) handleItemSelection(selected.value as string, 'name');
                                    else updateLineItem(index, 'itemName', '');
                                  }}
                                  onInputChange={(inputValue, { action }) => {
                                    if (action === 'input-change') updateLineItem(index, 'itemName', inputValue);
                                  }}
                                  placeholder="Select Item"
                                  isClearable
                                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                                  styles={{
                                    control: (base) => ({ ...base, minHeight: '32px', height: '32px', fontSize: '12px', backgroundColor: 'transparent', border: '1px solid #e2e8f0', boxShadow: 'none' }),
                                    valueContainer: (base) => ({ ...base, padding: '0 8px' }),
                                    input: (base) => ({ ...base, margin: 0, padding: 0 }),
                                    indicatorsContainer: (base) => ({ ...base, height: '32px' }),
                                    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                    menu: (base) => ({ ...base, fontSize: '12px', minWidth: '300px' }),
                                    option: (base) => ({ ...base, padding: '8px 12px' })
                                  }}
                                />
                              ) : (
                                <span className="text-[12px] font-medium text-slate-700 px-2">{item.itemName || '-'}</span>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              <Select
                                options={Array.from(new Set(itemsList.map(i => i.dynamicData?.description || i.dynamicData?.itemDescription).filter(Boolean))).map(d => ({ value: d, label: String(d) }))}
                                value={item.itemDescription ? { value: item.itemDescription, label: item.itemDescription } : null}
                                onChange={(selected: any) => {
                                  if (selected) handleItemSelection(selected.value as string, 'description');
                                  else updateLineItem(index, 'itemDescription', '');
                                }}
                                onInputChange={(inputValue, { action }) => {
                                  if (action === 'input-change') updateLineItem(index, 'itemDescription', inputValue);
                                }}
                                placeholder="Desc"
                                isClearable
                                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                                styles={{
                                  control: (base) => ({ ...base, minHeight: '32px', height: '32px', fontSize: '12px', backgroundColor: 'transparent', border: '1px solid #e2e8f0', boxShadow: 'none' }),
                                  valueContainer: (base) => ({ ...base, padding: '0 8px' }),
                                  input: (base) => ({ ...base, margin: 0, padding: 0 }),
                                  indicatorsContainer: (base) => ({ ...base, height: '32px' }),
                                  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                  menu: (base) => ({ ...base, fontSize: '12px', minWidth: '300px' }),
                                  option: (base) => ({ ...base, padding: '8px 12px' })
                                }}
                              />
                            </td>
                            <td className="px-2 py-2" style={{ minWidth: '130px' }}>
                              {item.loaSerialNo ? (
                                <div className="flex items-center gap-1">
                                  <span className="inline-flex items-center px-2 py-1 rounded bg-blue-50 border border-blue-200 text-blue-800 text-[12px] font-semibold tracking-wide whitespace-nowrap">
                                    {item.loaSerialNo}
                                  </span>
                                  <button
                                    type="button"
                                    className="text-slate-400 hover:text-red-500 transition-colors ml-1"
                                    onClick={() => updateLineItem(index, 'loaSerialNo', '')}
                                    title="Clear LOA"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <input
                                  type="text"
                                  placeholder="LOA Serial No"
                                  className="w-full h-8 text-[12px] border border-slate-200 rounded px-2 focus:border-blue-500 outline-none bg-transparent text-slate-700"
                                  value={item.loaSerialNo || ''}
                                  onChange={e => updateLineItem(index, 'loaSerialNo', e.target.value)}
                                />
                              )}
                            </td>
                            <td className="px-2 py-2">
                              <Input placeholder="HSN" className="h-8 text-[12px] border-slate-200 bg-transparent px-2" value={item.hsnCode || ''} onChange={(e) => updateLineItem(index, 'hsnCode', e.target.value)} />
                            </td>
                            <td className="px-2 py-2">
                              <div className="h-8 flex items-center justify-end px-2 text-[12px] font-medium text-slate-700 bg-slate-50/50 rounded">
                                {item.poQuantity || 0}
                              </div>
                            </td>
                            <td className="px-2 py-2">
                              <div className="h-8 flex items-center justify-start px-2 text-[12px] text-slate-600 bg-slate-50/50 rounded">
                                {item.poDate ? String(item.poDate).split('T')[0] : '--'}
                              </div>
                            </td>
                            <td className="px-2 py-2">
                              <div className="h-8 flex items-center justify-end px-2 text-[12px] font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded shadow-sm">
                                {item.diQuantity || 0}
                              </div>
                            </td>
                            <td className="px-2 py-2">
                              <div className={`h-8 flex items-center justify-center px-2 text-[12px] font-bold border rounded ${(Number(item.invoiceQuantity) || 0) < 0 ? 'text-red-600 bg-red-50 border-red-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'}`}>
                                {item.invoiceQuantity || 0}
                              </div>
                            </td>
                            <td className="px-2 py-2">
                              <Input placeholder="Unit" className="h-8 text-[12px] border-slate-200 bg-transparent px-2" value={item.unit || ''} onChange={(e) => updateLineItem(index, 'unit', e.target.value)} />
                            </td>
                            <td className="px-2 py-2">
                              <Input type="number" placeholder="0" className="h-8 text-[12px] border-slate-200 bg-transparent px-2 text-right" value={item.srt || 0} onChange={(e) => updateLineItem(index, 'srt', e.target.value)} />
                            </td>
                            <td className="px-2 py-2">
                              <Input type="number" placeholder="0" className="h-8 text-[12px] border-slate-200 bg-transparent px-2 text-right" value={item.act || 0} onChange={(e) => updateLineItem(index, 'act', e.target.value)} />
                            </td>
                            <td className="px-2 py-2">
                              <div className={`h-8 flex items-center justify-end px-2 text-[12px] border border-slate-200 rounded bg-slate-50 ${(Number(item.totalInvoiceQuantity) || 0) > (Number(item.invoiceQuantity) || 0) ? 'text-red-500 font-bold border-red-200 bg-red-50' : 'text-slate-700'}`}>
                                {item.totalInvoiceQuantity || 0}
                              </div>
                            </td>
                            <td className="px-2 py-2">
                              <Input type="number" className="h-8 text-[12px] border-slate-200 px-2 text-right bg-transparent" value={item.rate || 0} onChange={(e) => updateLineItem(index, 'rate', e.target.value)} />
                            </td>
                            <td className="px-4 py-2 text-right font-medium text-slate-700 text-[13px]">
                              ₹{(Number(item.amount) || 0).toFixed(2)}
                            </td>
                            <td className="px-2 py-2">
                              <select 
                                className="w-full h-8 text-[12px] border border-slate-200 rounded px-2 focus:border-blue-500 outline-none bg-transparent"
                                value={item.gstType || 'Intra State'}
                                onChange={(e) => updateLineItem(index, 'gstType', e.target.value)}
                              >
                                <option value="Intra State">Intra State</option>
                                <option value="Inter State">Inter State</option>
                              </select>
                            </td>
                            <td className="px-2 py-2">
                              <Input type="number" placeholder="0" disabled={item.gstType === 'Inter State'} className={`h-8 text-[12px] border-slate-200 px-2 text-right ${item.gstType === 'Inter State' ? 'bg-slate-100 text-slate-400' : 'bg-transparent'}`} value={item.gstType === 'Inter State' ? '' : (item.cgst || 0)} onChange={(e) => updateLineItem(index, 'cgst', e.target.value)} />
                            </td>
                            <td className="px-2 py-2">
                              <Input type="number" placeholder="0" disabled={item.gstType === 'Inter State'} className={`h-8 text-[12px] border-slate-200 px-2 text-right ${item.gstType === 'Inter State' ? 'bg-slate-100 text-slate-400' : 'bg-transparent'}`} value={item.gstType === 'Inter State' ? '' : (item.sgst || 0)} onChange={(e) => updateLineItem(index, 'sgst', e.target.value)} />
                            </td>
                            <td className="px-2 py-2">
                              <Input type="number" placeholder="0" disabled={item.gstType === 'Intra State'} className={`h-8 text-[12px] border-slate-200 px-2 text-right ${item.gstType === 'Intra State' ? 'bg-slate-100 text-slate-400' : 'bg-transparent'}`} value={item.gstType === 'Intra State' ? '' : (item.igst || 0)} onChange={(e) => updateLineItem(index, 'igst', e.target.value)} />
                            </td>
                            <td className="px-4 py-2 text-right font-semibold text-blue-700 text-[13px]">
                              ₹{(Number(item.totalAmount) || 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-2 text-center">
                              <button className="text-red-400 hover:text-red-600 transition-colors p-1" onClick={() => {
                                const newItems = [...lineItems];
                                newItems.splice(index, 1);
                                setLineItems(newItems);
                              }}>
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* Notes */}
              <div>
                <label className="flex items-center text-[13px] text-slate-700 font-medium mb-3">
                  <FileText className="w-4 h-4 mr-2 text-blue-500" /> Notes (For Internal Use)
                </label>
                <Textarea 
                  className="min-h-[120px] text-[13px] resize-y rounded-lg border-slate-200" 
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Enter notes for internal use..."
                />
              </div>

              {/* Attachments */}
              <div>
                <label className="flex items-center text-[13px] text-slate-700 font-medium mb-3">
                  <Paperclip className="w-4 h-4 mr-2 text-blue-500" /> Attach File(s) to Purchase Invoice
                </label>
                
                {uploadedDocs.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {uploadedDocs.map(doc => (
                      <div key={doc._id} className="text-[13px] text-blue-600 flex items-center">
                        <a href={doc.url} target="_blank" rel="noreferrer" className="hover:underline">{doc.fileName}</a>
                      </div>
                    ))}
                  </div>
                )}

                <input 
                  type="file" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                />
                <div 
                  className="border border-dashed border-blue-300 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors bg-blue-50/30"
                  onClick={() => !isUploadingDoc && fileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center text-[13px] text-blue-600 font-medium">
                    {isUploadingDoc ? (
                      <Loader2 className="w-5 h-5 mb-2 animate-spin" />
                    ) : (
                      <UploadCloud className="w-5 h-5 mb-2" />
                    )}
                    {isUploadingDoc ? "Uploading..." : "Upload File"}
                    <span className="text-slate-400 font-normal mt-1 text-[12px]">or drag and drop</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-3">You can upload a maximum of 5 files, 10MB each</p>
              </div>
            </div>

            {prId && (
              <div className="mt-12 mb-8 bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-xl font-semibold text-slate-800 mb-8 border-b border-slate-100 pb-4">Audit History</h2>
                <AuditTimeline entityType="PurchaseInvoice" entityId={prId} />
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-200 mt-12">
              <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 bg-red-50/50" onClick={handleDelete} disabled={isLocked}>
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </Button>
              <div className="flex items-center space-x-3">
                <Button variant="outline" className="text-slate-700 font-medium hover:bg-slate-50 border-slate-300 rounded-md" onClick={() => handleSubmit('Draft')} disabled={isLocked}>
                  Save as Draft
                </Button>
                <div className="flex rounded-md shadow-sm">
                  <Button className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-medium rounded-r-none border-r border-[#1d4ed8] disabled:bg-blue-300 disabled:border-blue-300" onClick={() => handleSubmit('Received')} disabled={isLocked}>
                    Save Changes
                  </Button>
                  <Button className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-medium rounded-l-none px-2 disabled:bg-blue-300 disabled:border-blue-300" disabled={isLocked}>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </div>
                <Link href="/purchases/receives">
                  <Button variant="outline" className="text-slate-700 font-medium hover:text-slate-900 hover:bg-slate-100 border-slate-300 rounded-md">
                    Cancel
                  </Button>
                </Link>
              </div>
            </div>
            
          </div>
        </div>
      </div>

      {/* Bulk Add Items Modal */}
      {isBulkModalOpen && (() => {
        const filteredItems = itemsList.filter((item: any) => {
          const query = (bulkSearchQuery || '').toLowerCase();
          const skuRaw  = String(item.dynamicData?.sku || item.dynamicData?.loaSerialNo || item.dynamicData?.['LOA Serial No.'] || item.dynamicData?.loa || '');
          const nameRaw = String(item.dynamicData?.name || item.dynamicData?.itemDescription || '');
          const codeRaw = String(item.dynamicData?.tempCode || '');
          const pkgRaw  = String(item.dynamicData?.package || '');
          const circRaw = String(item.dynamicData?.circle || '');
          const matchesGlobal = !query || skuRaw.toLowerCase().includes(query) || nameRaw.toLowerCase().includes(query) || codeRaw.toLowerCase().includes(query);
          return matchesGlobal
            && (!bulkFilters.sku      || skuRaw  === bulkFilters.sku)
            && (!bulkFilters.tempCode || codeRaw === bulkFilters.tempCode)
            && (!bulkFilters.name     || nameRaw === bulkFilters.name)
            && (!bulkFilters.package  || pkgRaw  === bulkFilters.package)
            && (!bulkFilters.circle   || circRaw === bulkFilters.circle);
        });
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
                <h2 className="text-lg font-bold text-slate-800">Add Items in Bulk</h2>
                <button type="button" onClick={() => setIsBulkModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors bg-white rounded-full p-1 hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="px-6 py-3 border-b border-slate-200 bg-slate-50">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="text" placeholder="Search by LOA/SKU, name, or temp code..." className="w-full border border-slate-200 rounded-md pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white shadow-sm" value={bulkSearchQuery} onChange={e => setBulkSearchQuery(e.target.value)} />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-sm text-left relative">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-4 py-3 w-10">
                        <input type="checkbox" className="rounded cursor-pointer border-slate-300 text-blue-600 focus:ring-blue-500" onChange={e => { if (e.target.checked) setSelectedBulkItems(filteredItems.map((i: any) => i._id)); else setSelectedBulkItems([]); }} checked={selectedBulkItems.length === filteredItems.length && filteredItems.length > 0} />
                      </th>
                      <th className="px-2 py-3">
                        <div className="font-bold text-slate-600 mb-1.5 text-xs uppercase tracking-wider">LOA / SKU</div>
                        <select className="w-full border border-slate-200 rounded text-xs py-1.5 px-2 bg-white outline-none focus:border-blue-500 max-w-[120px]" value={bulkFilters.sku} onChange={e => setBulkFilters({...bulkFilters, sku: e.target.value})}>
                          <option value="">All</option>
                          {Array.from(new Set(itemsList.map((i: any) => String(i.dynamicData?.sku || i.dynamicData?.loaSerialNo || i.dynamicData?.['LOA Serial No.'] || i.dynamicData?.loa || '')).filter(Boolean))).sort().map((v: any) => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </th>
                      <th className="px-2 py-3">
                        <div className="font-bold text-slate-600 mb-1.5 text-xs uppercase tracking-wider">Temp Code</div>
                        <select className="w-full border border-slate-200 rounded text-xs py-1.5 px-2 bg-white outline-none focus:border-blue-500 max-w-[100px]" value={bulkFilters.tempCode} onChange={e => setBulkFilters({...bulkFilters, tempCode: e.target.value})}>
                          <option value="">All</option>
                          {Array.from(new Set(itemsList.map((i: any) => String(i.dynamicData?.tempCode || '')).filter(Boolean))).sort().map((v: any) => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </th>
                      <th className="px-2 py-3">
                        <div className="font-bold text-slate-600 mb-1.5 text-xs uppercase tracking-wider">Item Name</div>
                        <select className="w-full border border-slate-200 rounded text-xs py-1.5 px-2 bg-white outline-none focus:border-blue-500 max-w-[160px]" value={bulkFilters.name} onChange={e => setBulkFilters({...bulkFilters, name: e.target.value})}>
                          <option value="">All</option>
                          {Array.from(new Set(itemsList.map((i: any) => String(i.dynamicData?.name || i.dynamicData?.itemDescription || '')).filter(Boolean))).sort().map((v: any) => <option key={v} value={v} title={v}>{v}</option>)}
                        </select>
                      </th>
                      <th className="px-2 py-3">
                        <div className="font-bold text-slate-600 mb-1.5 text-xs uppercase tracking-wider">Package</div>
                        <select className="w-full border border-slate-200 rounded text-xs py-1.5 px-2 bg-white outline-none focus:border-blue-500 max-w-[110px]" value={bulkFilters.package} onChange={e => setBulkFilters({...bulkFilters, package: e.target.value})}>
                          <option value="">All</option>
                          {Array.from(new Set(itemsList.map((i: any) => String(i.dynamicData?.package || '')).filter(Boolean))).sort().map((v: any) => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </th>
                      <th className="px-2 py-3">
                        <div className="font-bold text-slate-600 mb-1.5 text-xs uppercase tracking-wider">Circle</div>
                        <select className="w-full border border-slate-200 rounded text-xs py-1.5 px-2 bg-white outline-none focus:border-blue-500 max-w-[100px]" value={bulkFilters.circle} onChange={e => setBulkFilters({...bulkFilters, circle: e.target.value})}>
                          <option value="">All</option>
                          {Array.from(new Set(itemsList.map((i: any) => String(i.dynamicData?.circle || '')).filter(Boolean))).sort().map((v: any) => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </th>
                      <th className="px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredItems.map((item: any) => (
                      <tr key={item._id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => setSelectedBulkItems(prev => prev.includes(item._id) ? prev.filter(id => id !== item._id) : [...prev, item._id])}>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" className="rounded cursor-pointer border-slate-300 text-blue-600 focus:ring-blue-500" checked={selectedBulkItems.includes(item._id)} onChange={e => { if (e.target.checked) setSelectedBulkItems([...selectedBulkItems, item._id]); else setSelectedBulkItems(selectedBulkItems.filter(id => id !== item._id)); }} />
                        </td>
                        <td className="px-4 py-3 text-slate-700 font-medium whitespace-nowrap">{item.dynamicData?.sku || item.dynamicData?.loaSerialNo || item.dynamicData?.['LOA Serial No.'] || item.dynamicData?.loa || '--'}</td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{item.dynamicData?.tempCode || '--'}</td>
                        <td className="px-4 py-3 text-slate-700 max-w-[200px] truncate" title={item.dynamicData?.name || ''}>{item.dynamicData?.name || item.dynamicData?.itemDescription || 'Unnamed'}</td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{item.dynamicData?.package || '--'}</td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{item.dynamicData?.circle || '--'}</td>
                        <td className="px-4 py-3 text-slate-400 max-w-[200px] truncate" title={item.dynamicData?.description || ''}>{item.dynamicData?.description || item.dynamicData?.itemDescription || '--'}</td>
                      </tr>
                    ))}
                    {filteredItems.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400 bg-slate-50/50">No items match your search or filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)] z-20">
                <span className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full">{selectedBulkItems.length} items selected</span>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setIsBulkModalOpen(false)} className="px-5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">Cancel</button>
                  <button type="button" disabled={selectedBulkItems.length === 0} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm" onClick={() => {
                    const newItems = selectedBulkItems.map(id => {
                      const it = itemsList.find((i: any) => i._id === id);
                      if (!it) return null;
                      const d = it.dynamicData || {};
                      return {
                        isManual: true, itemId: it._id,
                        package: d.package || '', circle: d.circle || '',
                        tempCode: d.tempCode || '',
                        itemName: d.name || d.itemDescription || '',
                        itemDescription: d.description || d.itemDescription || '',
                        loaSerialNo: d.sku || d.loaSerialNo || d['LOA Serial No.'] || d.loa || '',
                        hsnCode: '', poQuantity: 0, poDate: '',
                        srt: 0, act: 0, totalInvoiceQuantity: 0,
                        unit: d.unit || '', gstType: 'Intra State',
                        cgst: 0, sgst: 0, igst: 0,
                        invoiceQuantity: 0, rate: 0, amount: 0, totalAmount: 0
                      };
                    }).filter(Boolean);
                    if (newItems.length > 0) setLineItems((prev: any[]) => [...prev, ...newItems]);
                    setIsBulkModalOpen(false);
                    setSelectedBulkItems([]);
                  }}>Add Selected Items</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
