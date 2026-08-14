import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface ItemSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: any[];
  onSelect: (selectedItems: any[]) => void;
  isWorkOrderContext?: boolean;
}

export function ItemSelectionModal({
  isOpen,
  onClose,
  items,
  onSelect,
  isWorkOrderContext = false,
}: ItemSelectionModalProps) {
  const [searchFilters, setSearchFilters] = useState({
    name: '',
    activity: '',
    tempCode: '',
    loaSrNo: '',
  });

  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchFilters({ name: '', activity: '', tempCode: '', loaSrNo: '' });
      setSelectedItemIds(new Set());
    }
  }, [isOpen]);

  const filteredItems = useMemo(() => {
    return items.filter(i => {
      const name = (isWorkOrderContext ? i.itemName : (i.dynamicData?.itemName || i.dynamicData?.name || i.dynamicData?.description || i.name || '')).toLowerCase();
      const activity = (i.activity || i.dynamicData?.activity || '').toLowerCase();
      const tempCode = (i.tempCode || i.dynamicData?.tempCode || '').toLowerCase();
      const loaSrNo = (i.loaSrNo || i.dynamicData?.loaSrNo || i.dynamicData?.loaSerialNo || i.dynamicData?.loaSerialNumber || i.dynamicData?.sku || i.sku || '').toLowerCase();
      
      const matchesTempCode = searchFilters.tempCode ? tempCode === searchFilters.tempCode.toLowerCase() : true;
      const matchesLoaSrNo = searchFilters.loaSrNo ? loaSrNo === searchFilters.loaSrNo.toLowerCase() : true;

      return (
        name.includes(searchFilters.name.toLowerCase()) &&
        activity.includes(searchFilters.activity.toLowerCase()) &&
        matchesTempCode &&
        matchesLoaSrNo
      );
    });
  }, [items, searchFilters, isWorkOrderContext]);

  const handleFilterChange = (field: keyof typeof searchFilters, value: string) => {
    setSearchFilters(prev => ({ ...prev, [field]: value }));
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedItemIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItemIds(newSelected);
  };

  const handleAddSelected = () => {
    const selectedItemsArray = items.filter(i => {
      const id = isWorkOrderContext ? i.itemId : i._id;
      return selectedItemIds.has(id);
    });
    
    if (selectedItemsArray.length > 0) {
      onSelect(selectedItemsArray);
      onClose();
    }
  };

  const displayedItems = filteredItems.slice(0, 100);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[90vw] md:max-w-5xl lg:max-w-6xl max-h-[85vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Select Items</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-4">
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">
                  </th>
                  <th className="px-4 py-3">
                    <div className="mb-2">Item Name</div>
                    <Input 
                      placeholder="Search Name..." 
                      value={searchFilters.name} 
                      onChange={(e) => handleFilterChange('name', e.target.value)}
                      className="h-8 text-xs font-normal"
                    />
                  </th>
                  <th className="px-4 py-3">
                    <div className="mb-2">Activity</div>
                    <Input 
                      placeholder="Search Activity..." 
                      value={searchFilters.activity} 
                      onChange={(e) => handleFilterChange('activity', e.target.value)}
                      className="h-8 text-xs font-normal"
                    />
                  </th>
                  <th className="px-4 py-3 w-40">
                    <div className="mb-2">Temp Code</div>
                    <Input 
                      placeholder="Search Code..." 
                      value={searchFilters.tempCode} 
                      onChange={(e) => handleFilterChange('tempCode', e.target.value)}
                      className="h-8 text-xs font-normal"
                    />
                  </th>
                  <th className="px-4 py-3 w-40">
                    <div className="mb-2">LOA Sr No</div>
                    <Input 
                      placeholder="Search LOA..." 
                      value={searchFilters.loaSrNo} 
                      onChange={(e) => handleFilterChange('loaSrNo', e.target.value)}
                      className="h-8 text-xs font-normal"
                    />
                  </th>
                  <th className="px-4 py-3">
                    <div className="mb-2">Package / Circle</div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      No items found.
                    </td>
                  </tr>
                ) : (
                  <>
                    {displayedItems.map((item, idx) => {
                    const id = isWorkOrderContext ? item.itemId : item._id;
                    const name = isWorkOrderContext ? item.itemName : (item.dynamicData?.itemName || item.dynamicData?.name || item.dynamicData?.description || item.name || 'Unknown Item');
                    const activity = isWorkOrderContext ? item.activity : (item.dynamicData?.activity || 'N/A');
                    const tempCode = isWorkOrderContext ? item.tempCode : (item.dynamicData?.tempCode || 'N/A');
                    const loaSrNo = isWorkOrderContext ? item.loaSrNo : (item.dynamicData?.loaSrNo || item.dynamicData?.loaSerialNo || item.dynamicData?.loaSerialNumber || item.dynamicData?.sku || item.sku || 'N/A');
                    const pkg = isWorkOrderContext ? item.package : (item.dynamicData?.package || 'N/A');
                    const circle = isWorkOrderContext ? item.circle : (item.dynamicData?.circle || 'N/A');
                    
                    const isSelected = selectedItemIds.has(id);

                    return (
                      <tr
                        key={`${id}-${idx}`}
                        className={`hover:bg-slate-50 cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50/50' : ''}`}
                        onClick={() => toggleSelect(id)}
                      >
                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <Checkbox 
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(id)}
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800 max-w-[300px] truncate" title={name}>{name}</td>
                        <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate" title={activity}>{activity}</td>
                        <td className="px-4 py-3 text-slate-600">{tempCode}</td>
                        <td className="px-4 py-3 text-slate-600">{loaSrNo}</td>
                        <td className="px-4 py-3 text-slate-600">{pkg} / {circle}</td>
                      </tr>
                    );
                  })
                  }
                  {filteredItems.length > 100 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-4 text-center text-slate-500 bg-slate-50 font-medium">
                        Showing 100 of {filteredItems.length} results. Please use the search filters above to refine your search.
                      </td>
                    </tr>
                  )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        <DialogFooter className="px-6 py-4 border-t bg-slate-50">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAddSelected} disabled={selectedItemIds.size === 0} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            Add Selected Items ({selectedItemIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
