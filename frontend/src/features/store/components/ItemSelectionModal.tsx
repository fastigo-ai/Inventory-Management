"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";
import { useAuthStore } from "@/shared/store/auth.store";
import { getItems } from "@/features/items/api/items.api";

interface ItemSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectItems: (items: any[]) => void;
}

export function ItemSelectionModal({ isOpen, onClose, onSelectItems }: ItemSelectionModalProps) {
  const { user } = useAuthStore();
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter states
  const [filters, setFilters] = useState({
    activity: "",
    tempCode: "",
    itemName: "",
    package: user?.assignedPackage || "",
    circle: user?.assignedCircle || "",
    unit: ""
  });

  const isCircleLocked = !!user?.assignedCircle;
  const isPackageLocked = !!user?.assignedPackage;

  useEffect(() => {
    if (isOpen) {
      fetchItems();
      setSelectedIds(new Set());
    }
  }, [isOpen]);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const res = await getItems({ limit: 2000 });
      setItems(res.data || []);
    } catch (error) {
      console.error("Failed to fetch items:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const activity = (item.dynamicData?.activity || item.dynamicData?.Activity || "").toLowerCase();
      const tempCode = (item.dynamicData?.tempCode || item.itemCode || "").toLowerCase();
      const itemName = (item.dynamicData?.name || item.dynamicData?.description || "").toLowerCase();
      const pkg = (item.dynamicData?.sku || item.dynamicData?.loaSrNo || item.dynamicData?.loaSerialNo || "").toLowerCase();
      const circle = (item.dynamicData?.circle || item.dynamicData?.Circle || "").toLowerCase();
      const unit = (item.dynamicData?.unit || item.dynamicData?.uom || item.unit || "").toLowerCase();

      return (
        activity.includes(filters.activity.toLowerCase()) &&
        tempCode.includes(filters.tempCode.toLowerCase()) &&
        itemName.includes(filters.itemName.toLowerCase()) &&
        pkg.includes(filters.package.toLowerCase()) &&
        circle.includes(filters.circle.toLowerCase()) &&
        unit.includes(filters.unit.toLowerCase())
      );
    });
  }, [items, filters]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(i => i._id)));
    }
  };

  const handleConfirm = () => {
    const selectedItems = items.filter(i => selectedIds.has(i._id));
    onSelectItems(selectedItems);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b border-slate-200">
          <DialogTitle>Select Items to Return</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-6 bg-slate-50">
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col h-full">
            <div className="overflow-auto flex-1 max-h-[60vh]">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <input 
                        type="checkbox" 
                        checked={filteredItems.length > 0 && selectedIds.size === filteredItems.length}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-3 min-w-[150px]">
                      <div className="text-xs font-semibold text-slate-600 uppercase mb-2">Activity</div>
                      <Input 
                        placeholder="Filter Activity" 
                        value={filters.activity} 
                        onChange={(e) => handleFilterChange('activity', e.target.value)}
                        className="h-8 text-xs font-normal"
                      />
                    </th>
                    <th className="px-4 py-3 min-w-[120px]">
                      <div className="text-xs font-semibold text-slate-600 uppercase mb-2">Temp Code</div>
                      <Input 
                        placeholder="Filter Code" 
                        value={filters.tempCode} 
                        onChange={(e) => handleFilterChange('tempCode', e.target.value)}
                        className="h-8 text-xs font-normal"
                      />
                    </th>
                    <th className="px-4 py-3 min-w-[200px]">
                      <div className="text-xs font-semibold text-slate-600 uppercase mb-2">Item Name / Desc</div>
                      <Input 
                        placeholder="Filter Name" 
                        value={filters.itemName} 
                        onChange={(e) => handleFilterChange('itemName', e.target.value)}
                        className="h-8 text-xs font-normal"
                      />
                    </th>
                    <th className="px-4 py-3 min-w-[120px]">
                      <div className="text-xs font-semibold text-slate-600 uppercase mb-2">Package / LOA</div>
                      <Input 
                        placeholder="Filter Package" 
                        value={filters.package} 
                        onChange={(e) => handleFilterChange('package', e.target.value)}
                        disabled={isPackageLocked}
                        className="h-8 text-xs font-normal disabled:bg-slate-100 disabled:text-slate-500"
                      />
                    </th>
                    <th className="px-4 py-3 min-w-[120px]">
                      <div className="text-xs font-semibold text-slate-600 uppercase mb-2">Circle</div>
                      <Input 
                        placeholder="Filter Circle" 
                        value={filters.circle} 
                        onChange={(e) => handleFilterChange('circle', e.target.value)}
                        disabled={isCircleLocked}
                        className="h-8 text-xs font-normal disabled:bg-slate-100 disabled:text-slate-500"
                      />
                    </th>
                    <th className="px-4 py-3 min-w-[100px]">
                      <div className="text-xs font-semibold text-slate-600 uppercase mb-2">Unit</div>
                      <Input 
                        placeholder="Filter Unit" 
                        value={filters.unit} 
                        onChange={(e) => handleFilterChange('unit', e.target.value)}
                        className="h-8 text-xs font-normal"
                      />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="h-32 text-center">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
                      </td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="h-32 text-center text-slate-500">
                        No items found matching the filters.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
                      const activity = item.dynamicData?.activity || item.dynamicData?.Activity || '-';
                      const tempCode = item.dynamicData?.tempCode || item.itemCode || '-';
                      const itemName = item.dynamicData?.name || item.dynamicData?.description || '-';
                      const pkg = item.dynamicData?.sku || item.dynamicData?.loaSrNo || item.dynamicData?.loaSerialNo || '-';
                      const circle = item.dynamicData?.circle || item.dynamicData?.Circle || '-';
                      const unit = item.dynamicData?.unit || item.dynamicData?.uom || item.unit || 'Nos';

                      return (
                        <tr key={item._id} className="hover:bg-blue-50/50 cursor-pointer" onClick={() => toggleSelect(item._id)}>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox"
                              checked={selectedIds.has(item._id)}
                              onChange={() => toggleSelect(item._id)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3 text-slate-600">{activity}</td>
                          <td className="px-4 py-3 font-mono text-slate-700">{tempCode}</td>
                          <td className="px-4 py-3 font-medium text-slate-800 whitespace-normal min-w-[200px]">{itemName}</td>
                          <td className="px-4 py-3 text-slate-600">{pkg}</td>
                          <td className="px-4 py-3 text-slate-600">{circle}</td>
                          <td className="px-4 py-3 text-slate-600">{unit}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex justify-between items-center rounded-b-lg">
          <div className="text-sm text-slate-600">
            <span className="font-semibold text-blue-700">{selectedIds.size}</span> items selected
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleConfirm} disabled={selectedIds.size === 0} className="bg-blue-600 hover:bg-blue-700 text-white">Add Selected Items</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
