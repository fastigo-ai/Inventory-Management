import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { createContractorInvoice } from '@/features/contractor-billing/api/contractor-billing.api';
import * as XLSX from 'xlsx';
import { api } from '@/shared/api/axios';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ContractorBillBulkUploadModal({ open, onOpenChange, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setStatusText('Parsing Excel file...');
    try {
      // 1. Parse Excel
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // header: 1 returns 2D array
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      // Safe get function
      const getCell = (row: number, col: number) => {
        if (!rawData[row]) return '';
        return rawData[row][col] ? String(rawData[row][col]).trim() : '';
      };

      // Header metadata based on exact layout
      // C1 (Row 0, Col 2) - Circle (Ignored for payload, but good for logs)
      // C2 (Row 1, Col 2) - Sub Circle
      const workOrderStr = getCell(2, 2); // C3
      const stageStr = getCell(3, 2); // C4
      const categoryStr = getCell(4, 2); // C5
      const drawingNoStr = getCell(5, 2); // C6
      const supplyRaBillNoStr = getCell(6, 2); // C7
      const contractorStr = getCell(7, 2); // C8

      if (!workOrderStr || !contractorStr || !stageStr) {
        throw new Error('Missing mandatory header fields: WorkOrder, Stage, or Contractor Name.');
      }

      setStatusText('Fetching reference data (WorkOrders, Contractors, Items)...');
      
      // 2. Fetch references
      const [woRes, conRes, itemsRes] = await Promise.all([
        api.get('/work-orders'),
        api.get('/contractors'),
        api.get('/items?limit=10000') // Adjust if there's pagination
      ]);

      const workOrders = Array.isArray(woRes.data?.data) ? woRes.data.data : [];
      let contractors = Array.isArray(conRes.data?.data) ? conRes.data.data : [];
      if (conRes.data?.data?.contractors) contractors = conRes.data.data.contractors;
      
      let items = Array.isArray(itemsRes.data?.data) ? itemsRes.data.data : [];
      if (itemsRes.data?.data?.items) items = itemsRes.data.data.items;

      // 3. Resolve IDs
      const matchedWO = workOrders.find((w: any) => 
        String(w.workOrderNumber).toLowerCase() === workOrderStr.toLowerCase()
      );
      if (!matchedWO) throw new Error(`Work Order not found: ${workOrderStr}`);

      const matchedContractor = contractors.find((c: any) => {
        const name = String(c.dynamicData?.displayName || c.name || c.vendorName || '').toLowerCase();
        return name === contractorStr.toLowerCase();
      });
      if (!matchedContractor) throw new Error(`Contractor not found: ${contractorStr}`);

      setStatusText('Processing line items...');
      
      // 4. Process Line Items (Row 10 onwards, index 9)
      const lineItems = [];
      for (let i = 9; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length === 0) continue; // Skip empty rows

        const loaSrNo = row[0] ? String(row[0]).trim() : '';
        const tempCode = row[1] ? String(row[1]).trim() : '';
        const desc = row[2] ? String(row[2]).trim() : '';
        
        if (!loaSrNo && !desc) continue; // End of table

        const jmcQty = Number(row[4] || 0);
        const rate = Number(row[5] || 0);
        const gstRate = Number(row[6] || 0);
        
        if (jmcQty === 0) continue; // Skip items with 0 qty

        // Find item
        let matchedItem = items.find((itm: any) => {
          const iLoa = String(itm.dynamicData?.sku || itm.loaSerialNo || '').trim();
          const iTc = String(itm.dynamicData?.tempCode || itm.tempCode || '').trim();
          return iLoa === loaSrNo && iTc === tempCode;
        });

        // Fallback: match by description if Temp Code is empty
        if (!matchedItem && desc) {
          matchedItem = items.find((itm: any) => {
            const iDesc = String(itm.dynamicData?.itemName || itm.dynamicData?.description || itm.itemName || '').trim().toLowerCase();
            return iDesc === desc.toLowerCase();
          });
        }

        if (!matchedItem) {
          throw new Error(`Item not found in master list for LOA SR: ${loaSrNo}, Temp Code: ${tempCode}`);
        }

        lineItems.push({
          itemId: matchedItem._id,
          activity: matchedItem.dynamicData?.activity || matchedItem.activity || '',
          description: desc,
          tempCode,
          loaSerialNo: loaSrNo,
          loaQty: matchedItem.dynamicData?.loaQuantity || 0,
          rate: rate || matchedItem.dynamicData?.boqRate || matchedItem.boqRate || 0,
          jmcDoneQty: jmcQty,
          erectedQty: 0,
          gstRate,
          billingCategory: categoryStr || 'JMC Done'
        });
      }

      if (lineItems.length === 0) {
        throw new Error('No valid line items with JMC QTY > 0 found in the spreadsheet.');
      }

      setStatusText('Submitting Contractor Bill...');
      
      // 5. Submit Payload
      const payload = {
        contractorId: matchedContractor._id,
        workOrderId: matchedWO._id,
        stage: stageStr,
        drawingNumber: drawingNoStr,
        supplyRaBillNo: supplyRaBillNoStr,
        lineItems
      };

      await createContractorInvoice(payload);
      
      toast.success('Contractor Bill imported successfully!');
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to import Contractor Bill');
    } finally {
      setLoading(false);
      setStatusText('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Upload Contractor Bill</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="text-sm text-slate-500">
            Upload the standard Excel format with metadata at the top and line items below.
            <br/><br/>
            <strong>Important:</strong> Column B must be <span className="font-semibold text-slate-800">Temp Code</span> (insert it between LOA SR.NO. and Description).
          </div>
          
          <Input 
            type="file" 
            accept=".xlsx, .xls"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={loading}
          />

          {loading && (
            <div className="text-sm text-indigo-600 animate-pulse font-medium">
              {statusText}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!file || loading}>
            {loading ? 'Processing...' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
