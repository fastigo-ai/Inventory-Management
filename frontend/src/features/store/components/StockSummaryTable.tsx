import React from 'react';
import { Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface StockSummaryTableProps {
  data: any[];
  isLoading: boolean;
}

export function StockSummaryTable({ data, isLoading }: StockSummaryTableProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 bg-white rounded-lg border border-slate-200 shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="text-slate-500 font-medium">No stock summary data available</div>
        <div className="text-sm text-slate-400 mt-1">Try selecting a different Circle or Package</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      <div className="overflow-x-auto w-full">
        <Table className="min-w-[2000px] border-collapse text-sm">
          <TableHeader className="bg-orange-100/50">
            <TableRow className="border-b border-orange-200">
              <TableHead className="font-semibold text-slate-800 border-r border-orange-200 text-center w-12">Sr.</TableHead>
              <TableHead className="font-semibold text-slate-800 border-r border-orange-200">HSN Code</TableHead>
              <TableHead className="font-semibold text-slate-800 border-r border-orange-200 min-w-[200px]">Description of Material</TableHead>
              <TableHead className="font-semibold text-slate-800 border-r border-orange-200 min-w-[120px]">PO Number</TableHead>
              <TableHead className="font-semibold text-slate-800 border-r border-orange-200 min-w-[120px]">PO Date</TableHead>
              <TableHead className="font-semibold text-slate-800 border-r border-orange-200 min-w-[150px]">Vendor Name</TableHead>
              <TableHead className="font-semibold text-slate-800 border-r border-orange-200 min-w-[120px]">Invoice No.</TableHead>
              <TableHead className="font-semibold text-slate-800 border-r border-orange-200 min-w-[120px]">Invoice Date</TableHead>
              <TableHead className="font-semibold text-slate-800 border-r border-orange-200 min-w-[150px]">Transport Name</TableHead>
              <TableHead className="font-semibold text-slate-800 border-r border-orange-200 min-w-[120px]">Truck No.</TableHead>
              <TableHead className="font-semibold text-slate-800 border-r border-orange-200 min-w-[120px]">GR No.</TableHead>
              <TableHead className="font-semibold text-slate-800 border-r border-orange-200 min-w-[120px]">GR Date</TableHead>
              <TableHead className="font-semibold text-slate-800 border-r border-orange-200 min-w-[120px]">Bilty No.</TableHead>
              <TableHead className="font-semibold text-slate-800 border-r border-orange-200 min-w-[120px]">Received Date</TableHead>
              <TableHead className="font-semibold text-slate-800 border-r border-orange-200 min-w-[100px]">Pack Type</TableHead>
              <TableHead className="font-semibold text-slate-800 border-r border-orange-200 min-w-[80px]">Pack Qty</TableHead>
              <TableHead className="font-semibold text-slate-800 border-r border-orange-200 min-w-[100px]">Rate</TableHead>
              <TableHead className="font-semibold text-slate-800 border-r border-orange-200 min-w-[120px]">Taxable Amt</TableHead>
              <TableHead className="font-semibold text-slate-800 border-r border-orange-200 min-w-[80px]">GST</TableHead>
              <TableHead className="font-semibold text-slate-800 border-r border-orange-200 text-center">Unit</TableHead>
              <TableHead className="font-semibold text-slate-800 border-r border-orange-200 text-right">Challan Qty</TableHead>
              <TableHead className="font-semibold text-slate-800 border-r border-orange-200 text-right">Received Qty</TableHead>
              <TableHead className="font-semibold text-slate-800 border-r border-orange-200 text-right">Rejected Qty</TableHead>
              <TableHead className="font-semibold text-slate-800 border-r border-orange-200 text-right whitespace-nowrap">Accepted Qty/Taken in Stock</TableHead>
              <TableHead className="font-semibold text-slate-800 border-r border-orange-200 text-right whitespace-nowrap">Received From Other Store</TableHead>
              <TableHead className="font-semibold text-slate-800 border-r border-orange-200 text-right whitespace-nowrap">Total in Stock After Receive</TableHead>
              <TableHead className="font-semibold text-slate-800 border-r border-orange-200 text-right whitespace-nowrap">Transfer To Other Store</TableHead>
              <TableHead className="font-semibold text-slate-800 border-r border-orange-200 text-right whitespace-nowrap">Contractors Issued Qty</TableHead>
              <TableHead className="font-semibold text-slate-800 border-r border-orange-200 text-right whitespace-nowrap">Contractors Return Qty</TableHead>
              <TableHead className="font-semibold text-slate-800 border-r border-orange-200 text-right whitespace-nowrap">Contractors Actual Issued</TableHead>
              <TableHead className="font-semibold text-slate-800 border-r border-orange-200 text-right whitespace-nowrap">Total Balance Qty.</TableHead>
              <TableHead className="font-semibold text-slate-800">Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, idx) => (
              <TableRow key={row.itemId} className="hover:bg-slate-50 border-b border-slate-200">
                <TableCell className="border-r border-slate-200 text-center font-medium">{row.sr}</TableCell>
                <TableCell className="border-r border-slate-200 font-mono text-xs">{row.hsnCode}</TableCell>
                <TableCell className="border-r border-slate-200 font-medium">{row.description}</TableCell>
                
                {/* New GRN Detail Columns */}
                <TableCell className="border-r border-slate-200">{row.poNumber || '-'}</TableCell>
                <TableCell className="border-r border-slate-200 whitespace-nowrap">{row.poDate ? new Date(row.poDate).toLocaleDateString() : '-'}</TableCell>
                <TableCell className="border-r border-slate-200">{row.vendorName || '-'}</TableCell>
                <TableCell className="border-r border-slate-200 font-mono text-xs">{row.invoiceNumber || '-'}</TableCell>
                <TableCell className="border-r border-slate-200 whitespace-nowrap">{row.invoiceDate ? new Date(row.invoiceDate).toLocaleDateString() : '-'}</TableCell>
                <TableCell className="border-r border-slate-200">{row.transportName || '-'}</TableCell>
                <TableCell className="border-r border-slate-200 font-mono">{row.truckNumber || '-'}</TableCell>
                <TableCell className="border-r border-slate-200 font-mono text-xs">{row.grNumber || '-'}</TableCell>
                <TableCell className="border-r border-slate-200 whitespace-nowrap">{row.grDate ? new Date(row.grDate).toLocaleDateString() : '-'}</TableCell>
                <TableCell className="border-r border-slate-200 font-mono text-xs">{row.biltyNumber || '-'}</TableCell>
                <TableCell className="border-r border-slate-200 whitespace-nowrap">{row.receivedDate ? new Date(row.receivedDate).toLocaleDateString() : '-'}</TableCell>
                <TableCell className="border-r border-slate-200">{row.packType || '-'}</TableCell>
                <TableCell className="border-r border-slate-200 text-right">{row.packQty || 0}</TableCell>
                <TableCell className="border-r border-slate-200 text-right font-mono text-slate-700">{row.rate ? `₹${Number(row.rate).toFixed(2)}` : '-'}</TableCell>
                <TableCell className="border-r border-slate-200 text-right font-mono text-slate-700">{row.taxableAmount ? `₹${Number(row.taxableAmount).toFixed(2)}` : '-'}</TableCell>
                <TableCell className="border-r border-slate-200 text-right">{row.gst || '-'}</TableCell>

                <TableCell className="border-r border-slate-200 text-center">{row.unit}</TableCell>
                
                <TableCell className="border-r border-slate-200 text-right font-mono text-slate-700">{Number(row.challanQty).toFixed(3)}</TableCell>
                <TableCell className="border-r border-slate-200 text-right font-mono text-slate-700">{Number(row.receivedQty).toFixed(3)}</TableCell>
                <TableCell className="border-r border-slate-200 text-right font-mono text-slate-700">{Number(row.rejectedQty).toFixed(3)}</TableCell>
                <TableCell className="border-r border-slate-200 text-right font-mono font-medium text-green-700 bg-green-50/30">{Number(row.acceptedQty).toFixed(3)}</TableCell>
                
                <TableCell className="border-r border-slate-200 text-right font-mono text-slate-700">{Number(row.receivedFromOtherStore).toFixed(3)}</TableCell>
                <TableCell className="border-r border-slate-200 text-right font-mono font-semibold text-slate-800 bg-slate-50/50">{Number(row.totalInStockAfterReceive).toFixed(3)}</TableCell>
                
                <TableCell className="border-r border-slate-200 text-right font-mono text-slate-700">{Number(row.transferToOtherStore).toFixed(3)}</TableCell>
                <TableCell className="border-r border-slate-200 text-right font-mono text-slate-700">{Number(row.contractorsIssuedQty).toFixed(3)}</TableCell>
                <TableCell className="border-r border-slate-200 text-right font-mono text-slate-700">{Number(row.contractorsReturnQty).toFixed(3)}</TableCell>
                <TableCell className="border-r border-slate-200 text-right font-mono font-medium text-orange-700 bg-orange-50/30">{Number(row.contractorsActualIssued).toFixed(3)}</TableCell>
                
                <TableCell className="border-r border-slate-200 text-right font-mono font-bold text-[#0076f2] bg-blue-50/30">{Number(row.totalBalanceQty).toFixed(3)}</TableCell>
                
                <TableCell className="text-slate-600 italic text-xs">{row.remarks}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
