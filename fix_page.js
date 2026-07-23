const fs = require('fs');
const file = 'frontend/src/app/items/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('import { useEffect, useState } from "react";', 'import React, { useEffect, useState, useRef } from "react";');

content = content.replace(
  '  const [isDeletingBulk, setIsDeletingBulk] = useState(false);',
  '  const [isDeletingBulk, setIsDeletingBulk] = useState(false);\n  const [selectedItemsData, setSelectedItemsData] = useState<Record<string, any>>({});\n  const filterTimeoutRef = useRef<NodeJS.Timeout>();'
);

const handleColAndUseEffectRegex = /  const handleColumnFilterChange = \(columnName: string, value: string\) => {[\s\S]*?}, \[columnFilters, searchParams\]\);/;
const replacementCode = `
  const handleColumnFilterChange = (columnName: string, value: string) => {
    setColumnFilters(prev => {
      const next = { ...prev, [columnName]: value };
      
      if (filterTimeoutRef.current) clearTimeout(filterTimeoutRef.current);
      
      filterTimeoutRef.current = setTimeout(() => {
        const updates: Record<string, string | null> = { page: '1' };
        Object.entries(next).forEach(([key, val]) => {
          updates[\`filter_\${key}\`] = val || null;
        });
        updateUrl(updates);
      }, 500);
      
      return next;
    });
  };`;
content = content.replace(handleColAndUseEffectRegex, replacementCode.trim());

content = content.replace(
  '      setSelectedIds([]);\n      fetchItemsData();',
  '      setSelectedIds([]);\n      setSelectedItemsData({});\n      fetchItemsData();'
);

const handleDeleteSelectedRegex = /  const handleDeleteSelected = async \(\) => {[\s\S]*?  };/;
const selectionChangeCode = `
  const handleSelectionChange = (newIds: string[]) => {
    setSelectedIds(newIds);
    setSelectedItemsData(prev => {
      const next = { ...prev };
      items.forEach(item => {
        if (newIds.includes(item._id)) next[item._id] = item;
      });
      Object.keys(next).forEach(id => {
        if (!newIds.includes(id)) delete next[id];
      });
      return next;
    });
  };

  const totalSelectedQty = Object.values(selectedItemsData).reduce((sum: number, item: any) => sum + (Number(item?.dynamicData?.stock) || 0), 0);
`;
content = content.replace(handleDeleteSelectedRegex, match => match + '\n' + selectionChangeCode);

const bannerRegex = /<div className="text-sm text-indigo-800 font-medium">\s*\{selectedIds\.length\} item\{selectedIds\.length > 1 \? 's' : ''\} selected\s*<\/div>/;
const bannerReplacement = `
          <div className="flex flex-col">
            <span className="text-sm text-indigo-800 font-medium">
              {selectedIds.length} item{selectedIds.length > 1 ? 's' : ''} selected
            </span>
            <span className="text-xs text-indigo-600 mt-0.5 font-medium">
              Total Stock Quantity: {totalSelectedQty}
            </span>
          </div>`;
content = content.replace(bannerRegex, bannerReplacement.trim());

content = content.replace(
  'onClick={() => setSelectedIds([])}',
  'onClick={() => { setSelectedIds([]); setSelectedItemsData({}); }}'
);

content = content.replace(
  'onSelectionChange={setSelectedIds}',
  'onSelectionChange={handleSelectionChange}'
);

fs.writeFileSync(file, content);
console.log('Successfully updated page.tsx');
