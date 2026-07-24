import React, { useState, useMemo } from 'react';
import { Loader2, Search, TrendingUp, AlertCircle, PackageCheck, Calculator, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface StockSummaryTableProps {
  data: any[];
  isLoading: boolean;
}

export function StockSummaryTable({ data, isLoading }: StockSummaryTableProps) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // PAGINATION STATE
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(30);

  // AGGREGATION STATE
  const [selectedAggregateCol, setSelectedAggregateCol] = useState('acceptedQty');

  const numericalColumns = [
    { id: 'packQty', label: 'Pack Qty' },
    { id: 'rate', label: 'Rate' },
    { id: 'taxableAmount', label: 'Taxable Amount' },
    { id: 'challanQty', label: 'Challan Qty' },
    { id: 'receivedQty', label: 'Received Qty' },
    { id: 'rejectedQty', label: 'Rejected Qty' },
    { id: 'acceptedQty', label: 'Accepted In Stock' },
    { id: 'receivedFromOtherStore', label: 'Received (Inter-Store)' },
    { id: 'transferToOtherStore', label: 'Transfer (Inter-Store)' },
    { id: 'contractorsIssuedQty', label: 'Contractors Issued' },
    { id: 'contractorsReturnQty', label: 'Contractors Return' },
    { id: 'contractorsActualIssued', label: 'Contractors Actual Issued' },
    { id: 'totalBalanceQty', label: 'Total Balance Qty' },
  ];

  // 1. FILTERING LOGIC
  const filteredData = useMemo(() => {
    if (!data) return [];
    return data.filter(row => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        const rowValue = String(row[key] || '').toLowerCase();
        return rowValue.includes(value.toLowerCase());
      });
    });
  }, [data, filters]);

  // 2. SELECTION LOGIC
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredData.map(d => d.itemId)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (itemId: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) newSet.add(itemId);
    else newSet.delete(itemId);
    setSelectedIds(newSet);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to page 1 on filter
  };

  // 3. PAGINATION LOGIC
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredData.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredData, currentPage, rowsPerPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // 4. ANALYTICS & AGGREGATION LOGIC
  const activeDataForAggregation = selectedIds.size > 0 
    ? filteredData.filter(d => selectedIds.has(d.itemId))
    : filteredData;

  const totalInventoryValue = useMemo(() => {
    return filteredData.reduce((sum, item) => sum + (Number(item.totalBalanceQty) || 0) * (Number(item.rate) || 0), 0);
  }, [filteredData]);

  const criticalStockCount = useMemo(() => {
    return filteredData.filter(item => (Number(item.totalBalanceQty) || 0) <= 0).length;
  }, [filteredData]);

  const aggregatedTotals = useMemo(() => {
    return activeDataForAggregation.reduce((acc, row) => {
      acc.totalBalanceQty += Number(row.totalBalanceQty) || 0;
      acc.totalValue += (Number(row.totalBalanceQty) || 0) * (Number(row.rate) || 0);
      acc.customCol += Number(row[selectedAggregateCol]) || 0;
      return acc;
    }, { totalBalanceQty: 0, totalValue: 0, customCol: 0 });
  }, [activeDataForAggregation, selectedAggregateCol]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 rounded-lg">
        <div className="text-slate-500 font-medium">No stock summary data available</div>
      </div>
    );
  }

  const FilterInput = ({ columnKey, placeholder }: { columnKey: string, placeholder?: string }) => (
    <div className="mt-3 flex items-center bg-slate-100 border border-transparent rounded-md px-2 h-8 transition-colors focus-within:bg-white focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
      <Search className="w-3.5 h-3.5 text-slate-400 mr-2" />
      <input
        className="w-full text-[13px] outline-none bg-transparent font-medium text-slate-700 placeholder-slate-400"
        placeholder={placeholder || "Search..."}
        value={filters[columnKey] || ''}
        onChange={(e) => handleFilterChange(columnKey, e.target.value)}
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      
      {/* FUTURISTIC ANALYTICS DASHBOARD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1 */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-md relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-110 transition-transform duration-500"></div>
          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className="text-blue-100 text-sm font-medium mb-1">Total Inventory Value</p>
              <h3 className="text-3xl font-bold tracking-tight">₹{totalInventoryValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</h3>
              <p className="text-blue-100/80 text-xs mt-2 flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" /> Estimated Real-Time Value
              </p>
            </div>
            <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
              <Calculator className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 text-white shadow-md relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-xl group-hover:scale-110 transition-transform duration-500"></div>
          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className="text-slate-400 text-sm font-medium mb-1">Active SKUs</p>
              <h3 className="text-3xl font-bold tracking-tight">{filteredData.length}</h3>
              <p className="text-slate-500 text-xs mt-2 flex items-center">
                <PackageCheck className="w-3 h-3 mr-1" /> Currently tracking in warehouse
              </p>
            </div>
            <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm border border-white/5">
              <PackageCheck className="w-6 h-6 text-slate-300" />
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className={`bg-gradient-to-br ${criticalStockCount > 0 ? 'from-red-500 to-red-600' : 'from-emerald-500 to-emerald-600'} rounded-xl p-5 text-white shadow-md relative overflow-hidden group`}>
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-110 transition-transform duration-500"></div>
          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className="text-white/80 text-sm font-medium mb-1">Critical Stock Alerts</p>
              <h3 className="text-3xl font-bold tracking-tight">{criticalStockCount}</h3>
              <p className="text-white/70 text-xs mt-2 flex items-center">
                <AlertCircle className="w-3 h-3 mr-1" /> Items requiring immediate attention
              </p>
            </div>
            <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm border border-white/10">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* EXCEL-LIKE INTERACTIVE GRID */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative">
        <div className="overflow-x-auto w-full max-h-[600px] custom-scrollbar">
          <Table className="min-w-[2500px] border-collapse text-[13px] relative">
            <TableHeader className="bg-slate-50 sticky top-0 z-20 shadow-sm">
              <TableRow className="border-b border-slate-200">
                <TableHead className="font-semibold text-slate-700 border-r border-slate-200 text-center w-12 align-top pt-4 pb-4">
                  <div className="flex flex-col items-center justify-between h-full gap-3">
                    <span className="text-[11px] uppercase tracking-wider text-slate-500">#</span>
                    <Checkbox 
                      checked={selectedIds.size === filteredData.length && filteredData.length > 0} 
                      onCheckedChange={handleSelectAll} 
                      className="border-slate-300 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                    />
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-slate-700 border-r border-slate-200 align-top pt-4 pb-4 min-w-[140px]">
                  HSN Code
                  <FilterInput columnKey="hsnCode" />
                </TableHead>
                <TableHead className="font-semibold text-slate-700 border-r border-slate-200 min-w-[280px] align-top pt-4 pb-4">
                  Description of Material
                  <FilterInput columnKey="description" />
                </TableHead>
                <TableHead className="font-semibold text-slate-700 border-r border-slate-200 min-w-[140px] align-top pt-4 pb-4">
                  PO Number
                  <FilterInput columnKey="poNumber" />
                </TableHead>
                <TableHead className="font-semibold text-slate-700 border-r border-slate-200 min-w-[160px] align-top pt-4 pb-4">
                  Vendor Name
                  <FilterInput columnKey="vendorName" />
                </TableHead>
                <TableHead className="font-semibold text-slate-700 border-r border-slate-200 min-w-[130px] align-top pt-4 pb-4">Invoice No.</TableHead>
                <TableHead className="font-semibold text-slate-700 border-r border-slate-200 min-w-[120px] align-top pt-4 pb-4">Invoice Date</TableHead>
                <TableHead className="font-semibold text-slate-700 border-r border-slate-200 min-w-[160px] align-top pt-4 pb-4">Transport Name</TableHead>
                <TableHead className="font-semibold text-slate-700 border-r border-slate-200 min-w-[130px] align-top pt-4 pb-4">Truck No.</TableHead>
                <TableHead className="font-semibold text-slate-700 border-r border-slate-200 min-w-[130px] align-top pt-4 pb-4">GR No.</TableHead>
                <TableHead className="font-semibold text-slate-700 border-r border-slate-200 min-w-[120px] align-top pt-4 pb-4">Received Date</TableHead>
                <TableHead className="font-semibold text-slate-700 border-r border-slate-200 min-w-[100px] align-top pt-4 pb-4">Pack Type</TableHead>
                <TableHead className="font-semibold text-slate-700 border-r border-slate-200 min-w-[100px] align-top pt-4 pb-4 text-right">Rate</TableHead>
                <TableHead className="font-semibold text-slate-700 border-r border-slate-200 min-w-[130px] align-top pt-4 pb-4 text-right">Taxable Amt</TableHead>
                <TableHead className="font-semibold text-slate-700 border-r border-slate-200 text-center align-top pt-4 pb-4 min-w-[80px]">Unit</TableHead>
                <TableHead className="font-semibold text-slate-700 border-r border-slate-200 text-right align-top pt-4 pb-4 min-w-[110px]">Challan Qty</TableHead>
                <TableHead className="font-semibold text-slate-700 border-r border-slate-200 text-right align-top pt-4 pb-4 min-w-[110px]">Received Qty</TableHead>
                <TableHead className="font-semibold text-slate-700 border-r border-slate-200 text-right whitespace-nowrap align-top pt-4 pb-4 min-w-[140px]">Accepted In Stock</TableHead>
                <TableHead className="font-semibold text-slate-700 border-r border-slate-200 text-right whitespace-nowrap align-top pt-4 pb-4 min-w-[150px]">Received (Inter-Store)</TableHead>
                <TableHead className="font-semibold text-slate-700 border-r border-slate-200 text-right whitespace-nowrap align-top pt-4 pb-4 min-w-[150px]">Transfer (Inter-Store)</TableHead>
                <TableHead className="font-semibold text-slate-700 border-r border-slate-200 text-right whitespace-nowrap align-top pt-4 pb-4 min-w-[140px]">Contractors Issued</TableHead>
                <TableHead className="font-semibold text-slate-700 border-r border-slate-200 text-right whitespace-nowrap align-top pt-4 pb-4 min-w-[140px]">Total Balance Qty.</TableHead>
                <TableHead className="font-semibold text-slate-700 align-top pt-4 pb-4 min-w-[200px]">Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={23} className="h-32 text-center text-slate-500">
                    No matching records found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row, idx) => (
                  <TableRow 
                    key={row.itemId || idx} 
                    className={`even:bg-slate-50/50 hover:bg-blue-50/30 border-b border-slate-200 transition-colors ${selectedIds.has(row.itemId) ? 'bg-blue-50/80 even:bg-blue-50/80' : ''}`}
                  >
                    <TableCell className="border-r border-slate-200 text-center">
                      <Checkbox 
                        checked={selectedIds.has(row.itemId)} 
                        onCheckedChange={(c) => handleSelectRow(row.itemId, c as boolean)} 
                        className="border-slate-300 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                      />
                    </TableCell>
                    <TableCell className="border-r border-slate-200 font-mono text-xs text-slate-600">{row.hsnCode}</TableCell>
                    <TableCell className="border-r border-slate-200 font-medium text-slate-800">{row.description}</TableCell>
                    
                    <TableCell className="border-r border-slate-200 text-slate-600">{row.poNumber || '-'}</TableCell>
                    <TableCell className="border-r border-slate-200 text-slate-600">{row.vendorName || '-'}</TableCell>
                    <TableCell className="border-r border-slate-200 font-mono text-xs text-slate-500">{row.invoiceNumber || '-'}</TableCell>
                    <TableCell className="border-r border-slate-200 text-slate-500 whitespace-nowrap">{row.invoiceDate ? new Date(row.invoiceDate).toLocaleDateString() : '-'}</TableCell>
                    <TableCell className="border-r border-slate-200 text-slate-600">{row.transportName || '-'}</TableCell>
                    <TableCell className="border-r border-slate-200 font-mono text-slate-600">{row.truckNumber || '-'}</TableCell>
                    <TableCell className="border-r border-slate-200 font-mono text-xs text-slate-500">{row.grNumber || '-'}</TableCell>
                    <TableCell className="border-r border-slate-200 text-slate-500 whitespace-nowrap">{row.receivedDate ? new Date(row.receivedDate).toLocaleDateString() : '-'}</TableCell>
                    <TableCell className="border-r border-slate-200 text-slate-600">{row.packType || '-'}</TableCell>
                    <TableCell className="border-r border-slate-200 text-right font-mono text-slate-700">{row.rate ? `₹${Number(row.rate).toFixed(2)}` : '-'}</TableCell>
                    <TableCell className="border-r border-slate-200 text-right font-mono text-slate-700">{row.taxableAmount ? `₹${Number(row.taxableAmount).toFixed(2)}` : '-'}</TableCell>
                    
                    <TableCell className="border-r border-slate-200 text-center text-slate-500">{row.unit}</TableCell>
                    
                    <TableCell className="border-r border-slate-200 text-right font-mono text-slate-600">{Number(row.challanQty).toFixed(3)}</TableCell>
                    <TableCell className="border-r border-slate-200 text-right font-mono text-slate-600">{Number(row.receivedQty).toFixed(3)}</TableCell>
                    <TableCell className="border-r border-slate-200 text-right font-mono font-medium text-green-700 bg-green-50/20">{Number(row.acceptedQty).toFixed(3)}</TableCell>
                    
                    <TableCell className="border-r border-slate-200 text-right font-mono text-slate-600">{Number(row.receivedFromOtherStore).toFixed(3)}</TableCell>
                    <TableCell className="border-r border-slate-200 text-right font-mono text-slate-600">{Number(row.transferToOtherStore).toFixed(3)}</TableCell>
                    <TableCell className="border-r border-slate-200 text-right font-mono text-slate-600">{Number(row.contractorsActualIssued).toFixed(3)}</TableCell>
                    
                    <TableCell className="border-r border-slate-200 text-right font-mono font-bold text-[#0076f2] bg-blue-50/40 text-[13px]">{Number(row.totalBalanceQty).toFixed(3)}</TableCell>
                    
                    <TableCell className="text-slate-500 italic text-xs">{row.remarks}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* PAGINATION CONTROLS */}
        <div className="bg-slate-50 border-t border-slate-200 p-3 flex flex-col sm:flex-row items-center justify-between text-sm text-slate-600 gap-4">
          <div className="flex items-center gap-3">
            <span>Show</span>
            <select 
              value={rowsPerPage} 
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none focus:border-blue-500"
            >
              <option value={10}>10</option>
              <option value={30}>30</option>
              <option value={60}>60</option>
              <option value={100}>100</option>
            </select>
            <span>entries</span>
          </div>

          <div>
            Showing {filteredData.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0} to {Math.min(currentPage * rowsPerPage, filteredData.length)} of {filteredData.length} entries
          </div>

          <div className="flex items-center gap-1">
            <button 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 font-medium rounded">
              {currentPage} / {totalPages || 1}
            </span>
            <button 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* DYNAMIC AGGREGATION FOOTER */}
        <div className="bg-white text-slate-800 p-4 sticky bottom-0 z-30 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] border-t border-slate-200 flex items-center justify-between rounded-b-xl">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
              {selectedIds.size > 0 ? `${selectedIds.size} Items Selected` : `Showing ${filteredData.length} Items`}
            </span>
            <span className="text-slate-300 mx-2">|</span>
            <span className="text-slate-500 flex items-center gap-1.5">
              <Calculator className="w-4 h-4" /> Live Aggregation
            </span>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200">
              <select 
                value={selectedAggregateCol}
                onChange={(e) => setSelectedAggregateCol(e.target.value)}
                className="bg-white text-slate-700 border border-slate-200 rounded px-2 py-1.5 text-xs font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm"
              >
                {numericalColumns.map(col => (
                  <option key={col.id} value={col.id}>Sum of {col.label}</option>
                ))}
              </select>
              <div className="font-mono font-bold text-slate-800 text-lg min-w-[80px] text-right">
                {aggregatedTotals.customCol.toFixed(3)}
              </div>
            </div>

            <div className="w-px h-10 bg-slate-200"></div>
            <div className="text-right">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Sum of Balance Qty</div>
              <div className="font-mono font-bold text-blue-600 text-xl">{aggregatedTotals.totalBalanceQty.toFixed(3)}</div>
            </div>
            <div className="w-px h-10 bg-slate-200"></div>
            <div className="text-right">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Calculated Value</div>
              <div className="font-mono font-bold text-slate-900 text-xl">₹{aggregatedTotals.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
