import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { createContractorInvoice } from '@/features/contractor-billing/api/contractor-billing.api';
import * as XLSX from 'xlsx';
import { api } from '@/shared/api/axios';
import { 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Loader2, 
  Upload, 
  ChevronDown, 
  ChevronUp,
  FileSpreadsheet
} from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface UnmatchedErrorItem {
  rowNumber: number;
  loaSrNo: string;
  tempCode: string;
  description: string;
  qty: number;
  errorReason: string;
}

export function ContractorBillBulkUploadModal({ open, onOpenChange, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');

  // References
  const [contractors, setContractors] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [existingInvoices, setExistingInvoices] = useState<any[]>([]);
  const [fetchingRefs, setFetchingRefs] = useState(false);

  // Form Fields (auto-detected or manually adjusted)
  const [selectedContractorId, setSelectedContractorId] = useState('');
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState('');
  const [selectedStage, setSelectedStage] = useState('60%');
  const [selectedCategory, setSelectedCategory] = useState<'Contractor Bill' | 'Erection Bill'>('Contractor Bill');
  const [drawingNumber, setDrawingNumber] = useState('');
  const [supplyRaBillNo, setSupplyRaBillNo] = useState('');
  const [detectedCircle, setDetectedCircle] = useState('');
  const [detectedPackage, setDetectedPackage] = useState('');
  const [detectedContractorAddress, setDetectedContractorAddress] = useState('');
  const [detectedContractorPhone, setDetectedContractorPhone] = useState('');

  // Parsed Analysis State
  const [validLineItems, setValidLineItems] = useState<any[]>([]);
  const [unmatchedErrors, setUnmatchedErrors] = useState<UnmatchedErrorItem[]>([]);
  const [skippedHeaderCount, setSkippedHeaderCount] = useState(0);
  const [existingBillMatch, setExistingBillMatch] = useState<any | null>(null);
  const [showErrorDetails, setShowErrorDetails] = useState(true);

  // Fetch reference data when modal opens
  useEffect(() => {
    if (!open) {
      resetState();
      return;
    }

    setFetchingRefs(true);
    Promise.all([
      api.get('/ho-billing/contractor-work-orders?limit=1000').catch(() => ({ data: null })),
      api.get('/contractors?limit=1000').catch(() => ({ data: null })),
      api.get('/items?limit=50000').catch(() => ({ data: null })),
      api.get('/contractor-billing/invoices?limit=500').catch(() => ({ data: null }))
    ])
      .then(([woRes, conRes, itemsRes, invRes]) => {
        const wos = Array.isArray(woRes.data?.data?.data)
          ? woRes.data.data.data
          : Array.isArray(woRes.data?.data)
          ? woRes.data.data
          : [];
        setWorkOrders(wos);

        const cons = Array.isArray(conRes.data?.data?.contractors)
          ? conRes.data.data.contractors
          : Array.isArray(conRes.data?.data)
          ? conRes.data.data
          : [];
        setContractors(cons);

        const itms = Array.isArray(itemsRes.data?.data?.items)
          ? itemsRes.data.data.items
          : Array.isArray(itemsRes.data?.data)
          ? itemsRes.data.data
          : [];
        setItems(itms);

        const invs = Array.isArray(invRes.data?.data)
          ? invRes.data.data
          : Array.isArray(invRes.data)
          ? invRes.data
          : [];
        setExistingInvoices(invs);
      })
      .finally(() => {
        setFetchingRefs(false);
      });
  }, [open]);

  const resetState = () => {
    setFile(null);
    setValidLineItems([]);
    setUnmatchedErrors([]);
    setSkippedHeaderCount(0);
    setExistingBillMatch(null);
    setSelectedContractorId('');
    setSelectedWorkOrderId('');
    setSelectedStage('60%');
    setSelectedCategory('Contractor Bill');
    setDrawingNumber('');
    setSupplyRaBillNo('');
    setDetectedCircle('');
    setDetectedPackage('');
    setDetectedContractorAddress('');
    setDetectedContractorPhone('');
  };

  // Re-check for existing bills when contractor, RA bill, or circle changes
  useEffect(() => {
    if (!supplyRaBillNo || existingInvoices.length === 0) {
      setExistingBillMatch(null);
      return;
    }

    const circleStr = (detectedCircle || 'Rohru').toLowerCase();
    const raStr = supplyRaBillNo.trim().toLowerCase();

    const matched = existingInvoices.find((inv: any) => {
      const invRa = String(inv.supplyRaBillNo || inv.legacyMetadata?.raBillNo || '').trim().toLowerCase();
      const invCircle = String(inv.legacyMetadata?.circle || inv.workOrderId?.circle || '').trim().toLowerCase();
      const invContractorId = String(inv.contractorId?._id || inv.contractorId || '');

      const isSameContractor = selectedContractorId ? invContractorId === String(selectedContractorId) : true;
      const isSameRa = invRa === raStr || (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(raStr));
      const isSameCircle = invCircle ? invCircle === circleStr : true;

      return isSameRa && isSameCircle && isSameContractor;
    });

    setExistingBillMatch(matched || null);
  }, [supplyRaBillNo, detectedCircle, selectedContractorId, existingInvoices]);

  // Filter work orders based on selected contractor
  const filteredWorkOrders = selectedContractorId
    ? workOrders.filter((w: any) => {
        const cId = typeof w.contractorId === 'object' ? w.contractorId?._id : w.contractorId;
        return String(cId) === String(selectedContractorId);
      })
    : workOrders;

  // Generate and download sample template
  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    const templateData = [
      ['Name Of Circle :', 'Rohru'],
      ['Name Of Sub Circle :', ''],
      ['WorkOrder', ''],
      ['Billing Stage(90%/10%)', '', '', '', '', '90'],
      ['Billing Category', 'Contractor Bill'],
      ['Drawing No :', ''],
      ['RA Supply Bill No.', 'RA1'],
      ['Name of Contractor', 'Harvinder Singh'],
      [], // blank row
      ['LOA SR.NO.', 'Description', 'Unit', 'Temp Code', 'JMC QTY', 'Rate', 'GST%', 'Amount'],
      ['1', 'AB Cabling works ,33KV,22KV,11KV & LT Line overhead Line', '', '', '', '', '', ''],
      ['2', 'LT AB Cable', '', '', '', '', '', ''],
      ['3', 'LT AB Cable on poles [Size: (3x95 Sq, mm )', '', '', '', '', '', ''],
      ['4', 'LT AB Cable on poles [Size: (3x95 Sq, mm ) +70sqmm(Insulated)', 'km', '4', 3.610, '', '', ''],
      ['5', 'Steel Tubular Poles (9 m, Working Load > 200 kgf/m²)', 'No', '5', 72.000, '', '', ''],
      ['6', 'Muffs with concerete filling', 'No', '6', 72.000, '', '', ''],
      ['7', 'Stay Set Complete', 'No', '7', 28.000, '', '', '']
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);

    ws['!cols'] = [
      { wch: 14 },
      { wch: 45 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Contractor_Bill');
    XLSX.writeFile(wb, 'Contractor_Bill_Sample_Template.xlsx');
    toast.success('Sample template downloaded');
  };

  // Inspect and parse Excel file on selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    setValidLineItems([]);
    setUnmatchedErrors([]);
    setSkippedHeaderCount(0);
    setExistingBillMatch(null);

    if (!selectedFile) return;

    try {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

      if (!rawData || rawData.length === 0) {
        toast.error('The selected file appears to be empty.');
        return;
      }

      // 1. Scan metadata anywhere in the first 25 rows
      let detectedWo = '';
      let detectedContractor = '';
      let detectedStage = '';
      let detectedDrawing = '';
      let detectedRaBill = '';
      let detectedCategory = '';
      let foundCircle = '';
      let foundPackage = '';
      let foundAddress = '';
      let foundPhone = '';

      const isHeaderLabel = (text: string) => {
        const t = text.trim().toLowerCase();
        return /^(ra\s*supply|ra\s*bill|drawing|contractor|stage|work\s*order|wo\s*no|circle|package|category|agency|bill\s*no|name\s*of|sl\.?\s*no|loa|description|temp\s*code|qty|rate|amount|nil|none|n\/?a)$/i.test(t) ||
               t.includes('ra supply bill') || t.includes('drawing no') || t.includes('name of contractor');
      };

      for (let r = 0; r < Math.min(rawData.length, 25); r++) {
        const row = rawData[r] || [];
        for (let c = 0; c < row.length; c++) {
          const cell = String(row[c] || '').trim();
          if (!cell) continue;

          const cellLower = cell.toLowerCase();

          const getVal = () => {
            if (cell.includes(':')) {
              const parts = cell.split(':');
              if (parts[1] && parts[1].trim() && !isHeaderLabel(parts[1].trim())) {
                return parts[1].trim();
              }
            }
            for (let nextC = c + 1; nextC < row.length; nextC++) {
              if (row[nextC] !== undefined && String(row[nextC]).trim() !== '') {
                const val = String(row[nextC]).trim();
                if (!isHeaderLabel(val)) return val;
              }
            }
            return '';
          };

          if (!detectedWo && (cellLower.includes('work order') || cellLower.includes('wo no') || cellLower === 'w.o.' || cellLower === 'wo' || cellLower === 'workorder')) {
            detectedWo = getVal();
          } else if (!detectedContractor && (cellLower.includes('contractor') || cellLower.includes('agency') || cellLower.includes('billed by') || cellLower === 'vendor')) {
            detectedContractor = getVal();
          } else if (!detectedStage && (cellLower.includes('stage') || cellLower.includes('bill type'))) {
            detectedStage = getVal();
          } else if (!detectedDrawing && (cellLower.includes('drawing') || cellLower.includes('drg no'))) {
            detectedDrawing = getVal();
          } else if (!detectedRaBill && (cellLower.includes('ra bill') || cellLower.includes('supply ra') || cellLower.includes('ra supply') || cellLower === 'bill no')) {
            detectedRaBill = getVal();
          } else if (!detectedCategory && (cellLower.includes('category') || cellLower.includes('billing category'))) {
            detectedCategory = getVal();
          } else if (!foundCircle && cellLower.includes('circle') && !cellLower.includes('sub')) {
            foundCircle = getVal();
          } else if (!foundPackage && cellLower.includes('package')) {
            foundPackage = getVal();
          } else if (!foundAddress && (cellLower.includes('address') || cellLower.includes('location'))) {
            foundAddress = getVal();
          } else if (!foundPhone && (cellLower.includes('phone') || cellLower.includes('mobile') || cellLower.includes('contact'))) {
            foundPhone = getVal();
          }
        }
      }

      if (foundCircle) setDetectedCircle(foundCircle);
      if (foundPackage) setDetectedPackage(foundPackage);
      if (foundAddress) setDetectedContractorAddress(foundAddress);
      if (foundPhone) setDetectedContractorPhone(foundPhone);

      // Auto-match Contractor
      let matchedContractorId = '';
      if (detectedContractor && contractors.length > 0) {
        const matchedC = contractors.find((c: any) => {
          const name = String(c.dynamicData?.displayName || c.dynamicData?.companyName || c.name || c.vendorName || '').toLowerCase();
          return name.includes(detectedContractor.toLowerCase()) || detectedContractor.toLowerCase().includes(name);
        });
        if (matchedC) {
          matchedContractorId = matchedC._id;
          setSelectedContractorId(matchedC._id);
        }
      }

      // Auto-match Work Order
      if (detectedWo && workOrders.length > 0) {
        const matched = workOrders.find((w: any) =>
          String(w.workOrderNumber).trim().toLowerCase() === detectedWo.toLowerCase()
        );
        if (matched) {
          setSelectedWorkOrderId(matched._id);
          const cId = typeof matched.contractorId === 'object' ? matched.contractorId?._id : matched.contractorId;
          if (cId) setSelectedContractorId(String(cId));
        }
      }

      // Auto-match Stage
      if (detectedStage) {
        let s = detectedStage.trim();
        if (!isNaN(Number(s)) && Number(s) <= 1 && Number(s) > 0) {
          s = `${Math.round(Number(s) * 100)}%`;
        } else if (!s.includes('%') && !isNaN(Number(s))) {
          s = `${s}%`;
        }
        if (['60%', '70%', '90%', '100%', 'Advance', 'Amount'].includes(s)) {
          setSelectedStage(s);
        }
      }

      if (detectedDrawing && !isHeaderLabel(detectedDrawing)) {
        setDrawingNumber(detectedDrawing);
      } else {
        setDrawingNumber('');
      }
      if (detectedRaBill) setSupplyRaBillNo(detectedRaBill);
      if (detectedCategory && detectedCategory.toLowerCase().includes('erection')) {
        setSelectedCategory('Erection Bill');
      }

      // 2. Locate Table Header Row Dynamically
      let headerRowIdx = -1;
      let colLoa = -1;
      let colDesc = -1;
      let colUnit = -1;
      let colTemp = -1;
      let colQty = -1;
      let colRate = -1;
      let colGst = -1;
      let colAmount = -1;

      for (let r = 0; r < Math.min(rawData.length, 30); r++) {
        const row = (rawData[r] || []).map((c: any) => String(c || '').trim().toLowerCase());
        const hasLoa = row.some(h => h.includes('loa') || h.includes('serial') || h === 'sl no' || h === 'sl.no');
        const hasDesc = row.some(h => h.includes('desc') || h.includes('item') || h.includes('particular'));
        const hasQty = row.some(h => h.includes('qty') || h.includes('quantity') || h.includes('jmc') || h.includes('erected'));

        if ((hasLoa && hasDesc) || (hasLoa && hasQty) || (hasDesc && hasQty)) {
          headerRowIdx = r;
          row.forEach((h: string, colIdx: number) => {
            if (h.includes('loa') || h.includes('serial') || h === 'sl no' || h === 'sl.no') colLoa = colIdx;
            else if (h.includes('temp') || h === 'tc') colTemp = colIdx;
            else if (h.includes('desc') || h.includes('particular') || h.includes('item name')) colDesc = colIdx;
            else if (h.includes('unit') || h === 'uom') colUnit = colIdx;
            else if (h.includes('jmc') || h.includes('qty') || h.includes('quantity') || h.includes('billed') || h.includes('erected')) colQty = colIdx;
            else if (h.includes('gst') || h.includes('tax')) colGst = colIdx;
            else if (h === 'rate' || h === 'unit rate' || h === 'contractor rate' || h === 'boq rate' || h === 'item rate' || h.includes('price') || (h.includes('rate') && !h.includes('gst') && !h.includes('tax'))) colRate = colIdx;
            else if (h === 'amount' || h === 'final bill amount' || h === 'base amount' || h === 'bill amount' || h === 'total amount' || (h.includes('amount') && !h.includes('gst') && !h.includes('tax') && !h.includes('ra bill') && !h.includes('bill no'))) colAmount = colIdx;
          });
          break;
        }
      }

      // Default column positions if header detection didn't find specific columns
      if (colLoa === -1) colLoa = 0;
      if (colDesc === -1) colDesc = 1;
      if (colUnit === -1) colUnit = 2;
      if (colTemp === -1) colTemp = 3;
      if (colQty === -1) colQty = 4;

      const startRow = headerRowIdx !== -1 ? headerRowIdx + 1 : 9;

      // 3. Process Line Items and Categorize into Valid vs Errors
      const valid: any[] = [];
      const errors: UnmatchedErrorItem[] = [];
      let skippedCount = 0;

      for (let i = startRow; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length === 0) continue;

        const loaSrNo = colLoa !== -1 && row[colLoa] ? String(row[colLoa]).trim() : '';
        const tempCode = colTemp !== -1 && row[colTemp] ? String(row[colTemp]).trim() : '';
        const desc = colDesc !== -1 && row[colDesc] ? String(row[colDesc]).trim() : '';

        // End of table check
        if (!loaSrNo && !desc && !tempCode) continue;

        const jmcQty = colQty !== -1 && row[colQty] !== undefined ? Number(row[colQty]) || 0 : 0;

        // 1. Fetch Rate and Amount directly from parsed data (Excel row)
        let parsedRate = colRate !== -1 && row[colRate] !== undefined && row[colRate] !== '' ? Number(row[colRate]) : 0;
        let parsedAmount = colAmount !== -1 && row[colAmount] !== undefined && row[colAmount] !== '' ? Number(row[colAmount]) : 0;

        if (isNaN(parsedRate)) parsedRate = 0;
        if (isNaN(parsedAmount)) parsedAmount = 0;

        // Section header / non-billable row check
        if (isNaN(jmcQty) || jmcQty <= 0) {
          skippedCount++;
          continue;
        }

        // Match with master items
        let matchedItem = items.find((itm: any) => {
          const d = itm.dynamicData || {};
          const iLoa = String(d.loaSerialNo || d.loaSrNo || d.sku || itm.sku || itm.loaSerialNo || '').trim();
          const iTc = String(d.tempCode || itm.tempCode || '').trim();
          const iCircle = String(d.circle || itm.circle || '').trim();

          const circleMatch = foundCircle ? iCircle.toLowerCase() === foundCircle.toLowerCase() : true;

          if (loaSrNo && tempCode) {
            return iLoa.toLowerCase() === loaSrNo.toLowerCase() && iTc === tempCode && circleMatch;
          }
          if (tempCode) {
            return iTc === tempCode && circleMatch;
          }
          if (loaSrNo) {
            return iLoa.toLowerCase() === loaSrNo.toLowerCase() && circleMatch;
          }
          return false;
        });

        // Fallback without circle restriction
        if (!matchedItem) {
          matchedItem = items.find((itm: any) => {
            const d = itm.dynamicData || {};
            const iLoa = String(d.loaSerialNo || d.loaSrNo || d.sku || itm.sku || itm.loaSerialNo || '').trim();
            const iTc = String(d.tempCode || itm.tempCode || '').trim();

            if (tempCode && loaSrNo) return iLoa.toLowerCase() === loaSrNo.toLowerCase() && iTc === tempCode;
            if (tempCode) return iTc === tempCode;
            if (loaSrNo) return iLoa.toLowerCase() === loaSrNo.toLowerCase();
            return false;
          });
        }

        // Fallback description match
        if (!matchedItem && desc) {
          const descLower = desc.toLowerCase();
          matchedItem = items.find((itm: any) => {
            const d = itm.dynamicData || {};
            const iName = String(d.name || d.itemName || d.description || itm.name || itm.itemName || '').trim().toLowerCase();
            return iName.includes(descLower) || descLower.includes(iName);
          });
        }

        if (!matchedItem) {
          errors.push({
            rowNumber: i + 1,
            loaSrNo,
            tempCode,
            description: desc || 'Unknown Item',
            qty: jmcQty,
            errorReason: `Not found in master inventory BOM (LOA: "${loaSrNo}", TempCode: "${tempCode}")`
          });
          continue;
        }

        const d = matchedItem.dynamicData || {};
        const finalLoa = loaSrNo || d.loaSerialNo || d.loaSrNo || d.sku || matchedItem.sku || '';
        const finalTempCode = tempCode || d.tempCode || matchedItem.tempCode || '';

        // If rate is provided but amount is missing in parsed data
        if (parsedRate > 0 && parsedAmount <= 0 && jmcQty > 0) {
          parsedAmount = Number((parsedRate * jmcQty).toFixed(2));
        }

        // If amount is provided but rate is missing in parsed data
        if (parsedAmount > 0 && parsedRate <= 0 && jmcQty > 0) {
          parsedRate = Number((parsedAmount / jmcQty).toFixed(2));
        }

        let rate = parsedRate;
        let baseAmount = parsedAmount;

        // Check if this is a Contractor Bill or Erection Bill
        const isContractorBill = detectedCategory === 'Contractor Bill' || (!detectedCategory && selectedCategory === 'Contractor Bill');

        // Edge case: For Contractor Bill, NEVER fetch rate from master item erection rate!
        // Rate is fetched ONLY from the Work Order if selected; otherwise 0 so site user inputs it
        if (rate <= 0 && baseAmount <= 0) {
          if (isContractorBill) {
            const selectedWo = selectedWorkOrderId ? workOrders.find((w: any) => String(w._id) === String(selectedWorkOrderId)) : null;
            const woItem = selectedWo?.items?.find((wi: any) => 
              String(wi.itemId?._id || wi.itemId) === String(matchedItem._id) ||
              (wi.tempCode && String(wi.tempCode).trim() === finalTempCode) ||
              (wi.loaSrNo && String(wi.loaSrNo).trim().toLowerCase() === finalLoa.toLowerCase())
            );
            rate = Number(woItem?.contractorErectionRate || woItem?.rate || 0);
            baseAmount = rate > 0 ? Number((rate * jmcQty).toFixed(2)) : 0;
          } else {
            // Erection Bill
            rate = Number(d.erectionRateWithGst || d.erectionRate || d.contractorErectionRate || 0);
            baseAmount = rate > 0 ? Number((rate * jmcQty).toFixed(2)) : 0;
          }
        }

        // Full 100% work/material base value
        const fullBaseAmt = (rate > 0 && jmcQty > 0) ? Number((rate * jmcQty).toFixed(2)) : baseAmount;

        let stagePercentage = 100;
        if (detectedStage && !detectedStage.includes('Advance') && !detectedStage.includes('Amount') && !detectedStage.includes('Adhoc')) {
          const num = parseInt(detectedStage.replace('%', ''));
          if (!isNaN(num) && num > 0) stagePercentage = num;
        }

        // Payable base amount at stage percentage
        if (stagePercentage < 100 && fullBaseAmt > 0 && (baseAmount <= 0 || baseAmount === fullBaseAmt)) {
          baseAmount = Number((fullBaseAmt * (stagePercentage / 100)).toFixed(2));
        }

        // Rule: GST is strictly 18% calculated on 100% of the Base Price (NOT reduced by stage percentage)
        const gstRate = 18;
        const gstAmount = Number((fullBaseAmt * 0.18).toFixed(2));

        valid.push({
          itemId: matchedItem._id,
          activity: d.activity || matchedItem.activity || 'Contractor Work',
          description: desc || d.name || d.itemName || matchedItem.name || 'Contractor Item',
          tempCode: finalTempCode,
          loaSrNo: finalLoa,
          loaSerialNo: finalLoa,
          loaQty: Number(d.loaQuantity || 0),
          rate: rate || 0,
          baseAmount: baseAmount || 0,
          gstRate: gstRate || 0,
          gstAmount: gstAmount || 0,
          totalAmount: Number((baseAmount + gstAmount).toFixed(2)),
          jmcDoneQty: jmcQty,
          erectedQty: isContractorBill ? 0 : jmcQty,
          billingCategory: isContractorBill ? 'JMC Done' : 'Erection',
          legacyData: {
            loaSerialNo: finalLoa,
            unit: String(row[colUnit] || d.unit || '').trim(),
            finalBillAmount: baseAmount || 0
          }
        });
      }

      setValidLineItems(valid);
      setUnmatchedErrors(errors);
      setSkippedHeaderCount(skippedCount);

      // Check if this RA Bill already exists
      const circleToCheck = (foundCircle || 'Rohru').toLowerCase();
      const raToCheck = (detectedRaBill || 'RA1').trim().toLowerCase();
      const existingMatch = existingInvoices.find((inv: any) => {
        const invRa = String(inv.supplyRaBillNo || inv.legacyMetadata?.raBillNo || '').trim().toLowerCase();
        const invCircle = String(inv.legacyMetadata?.circle || inv.workOrderId?.circle || '').trim().toLowerCase();
        const invContractorId = String(inv.contractorId?._id || inv.contractorId || '');

        const isSameContractor = matchedContractorId ? invContractorId === String(matchedContractorId) : true;
        const isSameRa = invRa === raToCheck || (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(raToCheck));
        const isSameCircle = invCircle ? invCircle === circleToCheck : true;

        return isSameRa && isSameCircle && isSameContractor;
      });

      setExistingBillMatch(existingMatch || null);
    } catch (err: any) {
      console.error('Error pre-parsing file:', err);
      toast.error('Failed to parse Excel file. Please verify file format.');
    }
  };

  // Upload handler with options
  const handleExecuteUpload = async (options: { skipErrors?: boolean; updateExisting?: boolean }) => {
    if (!file) {
      toast.error('Please select an Excel file to upload.');
      return;
    }

    if (!selectedContractorId) {
      toast.error('Please select a Contractor.');
      return;
    }

    if (!selectedStage) {
      toast.error('Please select a Billing Stage.');
      return;
    }

    if (validLineItems.length === 0) {
      toast.error('No valid matched line items found in spreadsheet to upload.');
      return;
    }

    setLoading(true);
    setStatusText(options.updateExisting ? 'Updating existing Contractor Bill...' : 'Submitting Contractor Bill...');

    try {
      const CIRCLE_PACKAGE_MAP: Record<string, string> = {
        'Rohru': 'Package 2(R/R)',
        'Rampur': 'Package 2(R/R)',
        'Solan': 'Package 1(S/N)',
        'Nahan': 'Package 1(S/N)',
      };
      const circleVal = detectedCircle || 'Rohru';
      const pkgVal = detectedPackage || CIRCLE_PACKAGE_MAP[circleVal] || 'Package 2(R/R)';

      const cleanDrawing = (drawingNumber && !/ra\s*supply|ra\s*bill|drawing/i.test(drawingNumber)) ? drawingNumber.trim() : '';

      const payload: any = {
        contractorId: selectedContractorId,
        stage: selectedStage,
        drawingNumber: cleanDrawing,
        supplyRaBillNo: supplyRaBillNo || '1',
        billingCategory: selectedCategory,
        lineItems: validLineItems,
        updateExisting: options.updateExisting ?? false,
        legacyMetadata: {
          circle: circleVal,
          package: pkgVal,
          raBillNo: supplyRaBillNo || '1',
          contractorAddress: detectedContractorAddress || undefined,
          contractorPhone: detectedContractorPhone || undefined
        }
      };

      if (selectedWorkOrderId) {
        payload.workOrderId = selectedWorkOrderId;
      } else {
        payload.isLegacyBulkUpload = true;
      }

      await createContractorInvoice(payload);

      if (options.updateExisting) {
        toast.success(`Contractor Bill updated successfully with ${validLineItems.length} items!`);
      } else {
        toast.success(`Contractor Bill created successfully with ${validLineItems.length} items!`);
      }

      if (options.skipErrors && unmatchedErrors.length > 0) {
        toast.info(`${unmatchedErrors.length} unmatched rows were skipped.`);
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Upload Error:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to process Contractor Bill');
    } finally {
      setLoading(false);
      setStatusText('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              Bulk Upload Contractor Bill
            </DialogTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              Download Template
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* File Picker */}
          <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-lg border border-slate-200">
            <Label className="text-xs font-bold text-slate-700">Select Excel File (.xlsx, .xls)</Label>
            <Input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              disabled={loading}
              className="bg-white text-xs"
            />
          </div>

          {/* Form Configuration Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            {/* Contractor */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Contractor *</Label>
              <select
                className="w-full h-9 rounded-md border border-slate-200 px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={selectedContractorId}
                onChange={(e) => {
                  setSelectedContractorId(e.target.value);
                  setSelectedWorkOrderId('');
                }}
                disabled={loading || fetchingRefs}
              >
                <option value="">-- Select Contractor --</option>
                {contractors.map((c: any) => {
                  const name = c.dynamicData?.displayName || c.dynamicData?.companyName || c.name || c.vendorName || 'Unnamed';
                  return (
                    <option key={c._id} value={c._id}>
                      {name}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Work Order */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Work Order {selectedWorkOrderId ? '*' : '(Optional)'}
              </Label>
              <select
                className="w-full h-9 rounded-md border border-slate-200 px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={selectedWorkOrderId}
                onChange={(e) => setSelectedWorkOrderId(e.target.value)}
                disabled={loading || fetchingRefs}
              >
                <option value="">-- None / Legacy Bulk Mode --</option>
                {filteredWorkOrders.map((wo: any) => (
                  <option key={wo._id} value={wo._id}>
                    {wo.workOrderNumber} {wo.circle ? `(${wo.circle})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Stage */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Billing Stage *</Label>
              <select
                className="w-full h-9 rounded-md border border-slate-200 px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                disabled={loading}
              >
                <option value="60%">60% (Supply / Material)</option>
                <option value="70%">70%</option>
                <option value="90%">90% (Erection / Installation)</option>
                <option value="100%">100% (Final)</option>
                <option value="Advance">Advance</option>
                <option value="Amount">Amount</option>
              </select>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Billing Category</Label>
              <select
                className="w-full h-9 rounded-md border border-slate-200 px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as any)}
                disabled={loading}
              >
                <option value="Contractor Bill">Contractor Bill (Supply)</option>
                <option value="Erection Bill">Erection Bill (Services)</option>
              </select>
            </div>

            {/* Supply RA Bill No */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Supply RA Bill No</Label>
              <Input
                placeholder="e.g. 1 or RA-01"
                value={supplyRaBillNo}
                onChange={(e) => setSupplyRaBillNo(e.target.value)}
                disabled={loading}
                className="h-9 text-xs bg-white"
              />
            </div>

            {/* Drawing Number */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Drawing No (Optional)</Label>
              <Input
                placeholder="e.g. DRG-102"
                value={drawingNumber}
                onChange={(e) => setDrawingNumber(e.target.value)}
                disabled={loading}
                className="h-9 text-xs bg-white"
              />
            </div>
          </div>

          {/* PARSING & ERROR INSPECTION SECTION */}
          {file && (
            <div className="space-y-3 pt-2">
              {/* Summary Stats Bar */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-md">
                  <span className="block font-bold text-emerald-700 text-sm">{validLineItems.length}</span>
                  <span className="text-emerald-600">Valid Items</span>
                </div>
                <div className={`p-2 border rounded-md ${unmatchedErrors.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                  <span className={`block font-bold text-sm ${unmatchedErrors.length > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                    {unmatchedErrors.length}
                  </span>
                  <span className={unmatchedErrors.length > 0 ? 'text-amber-600' : 'text-slate-500'}>Unmatched / Errors</span>
                </div>
                <div className="p-2 bg-slate-50 border border-slate-200 rounded-md">
                  <span className="block font-bold text-slate-700 text-sm">{skippedHeaderCount}</span>
                  <span className="text-slate-500">Headers / Zero Qty</span>
                </div>
              </div>

              {/* Existing Bill Notice (if detected) */}
              {existingBillMatch && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 text-blue-800 font-bold">
                    <RefreshCw className="w-4 h-4 text-blue-600" />
                    <span>Existing Bill Detected: {existingBillMatch.invoiceNumber}</span>
                  </div>
                  <p className="text-blue-700">
                    A bill for this contractor with RA Bill No &apos;{supplyRaBillNo || existingBillMatch.supplyRaBillNo}&apos; already exists in <strong>{existingBillMatch.status}</strong> status (Grand Total: ₹{Number(existingBillMatch.grandTotal || 0).toLocaleString('en-IN')}).
                  </p>
                  <p className="text-blue-600 font-medium">
                    You can either <strong>Update Existing Bill</strong> or upload as a new bill version.
                  </p>
                </div>
              )}

              {/* Error Visitor (Unmatched Items Details) */}
              {unmatchedErrors.length > 0 && (
                <div className="border border-amber-300 rounded-lg bg-amber-50/60 overflow-hidden text-xs">
                  <div 
                    className="p-2.5 flex items-center justify-between cursor-pointer hover:bg-amber-100/50 transition-colors"
                    onClick={() => setShowErrorDetails(!showErrorDetails)}
                  >
                    <div className="flex items-center gap-2 text-amber-800 font-bold">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{unmatchedErrors.length} Unmatched Row(s) in Excel (Click to inspect errors)</span>
                    </div>
                    {showErrorDetails ? <ChevronUp className="w-4 h-4 text-amber-700" /> : <ChevronDown className="w-4 h-4 text-amber-700" />}
                  </div>

                  {showErrorDetails && (
                    <div className="p-2.5 border-t border-amber-200 max-h-48 overflow-y-auto space-y-1.5 bg-white">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500">
                            <th className="py-1 px-1.5">Row #</th>
                            <th className="py-1 px-1.5">LOA SR</th>
                            <th className="py-1 px-1.5">Temp Code</th>
                            <th className="py-1 px-1.5">Description</th>
                            <th className="py-1 px-1.5">Qty</th>
                            <th className="py-1 px-1.5">Issue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {unmatchedErrors.map((err, idx) => (
                            <tr key={idx} className="hover:bg-amber-50/40">
                              <td className="py-1 px-1.5 font-medium text-slate-700">#{err.rowNumber}</td>
                              <td className="py-1 px-1.5 font-mono text-slate-600">{err.loaSrNo || '-'}</td>
                              <td className="py-1 px-1.5 font-mono text-slate-600">{err.tempCode || '-'}</td>
                              <td className="py-1 px-1.5 text-slate-800 max-w-[140px] truncate" title={err.description}>
                                {err.description}
                              </td>
                              <td className="py-1 px-1.5 font-semibold text-slate-700">{err.qty}</td>
                              <td className="py-1 px-1.5 text-amber-700">{err.errorReason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Status Message */}
          {loading && (
            <div className="p-3 bg-indigo-50 rounded-md border border-indigo-100 flex items-center gap-2 text-indigo-700 text-xs font-medium animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              <span>{statusText}</span>
            </div>
          )}
        </div>

        {/* DIALOG FOOTER WITH THE 3 USER-REQUESTED OPTIONS */}
        <DialogFooter className="flex-col sm:flex-row gap-2 pt-3 border-t border-slate-100">
          {/* Option 2: Stop Upload / Cancel */}
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={() => onOpenChange(false)} 
            disabled={loading}
            className="text-xs text-rose-700 border-rose-200 hover:bg-rose-50 hover:text-rose-800"
          >
            <XCircle className="w-3.5 h-3.5 mr-1 text-rose-600" />
            Stop Upload (Fix Excel)
          </Button>

          <div className="flex items-center gap-2 ml-auto">
            {/* Option 3: Update Existing Bill (Only if existing bill detected) */}
            {existingBillMatch && (
              <Button
                type="button"
                size="sm"
                onClick={() => handleExecuteUpload({ skipErrors: true, updateExisting: true })}
                disabled={loading || validLineItems.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium"
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                )}
                Update Existing Bill ({existingBillMatch.invoiceNumber})
              </Button>
            )}

            {/* Option 1: Upload with Skip Items (or standard upload) */}
            <Button
              type="button"
              size="sm"
              onClick={() => handleExecuteUpload({ skipErrors: true, updateExisting: false })}
              disabled={!file || !selectedContractorId || validLineItems.length === 0 || loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  {unmatchedErrors.length > 0 
                    ? `Upload with Skip Items (${validLineItems.length} valid)` 
                    : `Upload Bill (${validLineItems.length} items)`}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
