const fs = require('fs');
const filePath = 'frontend/src/app/site-portal/jmc-register/new/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update the state structure for items to include totalLoaQty
content = content.replace(/amount: 0,/g, 'amount: 0,\n        totalLoaQty: 0,');

// 2. Add the global Add Activity dropdown and keep Add Item button
const tableHeaderRegex = /<h2 className="text-sm font-bold text-slate-700 uppercase">JMC Items<\/h2>[\s\S]*?<Button onClick=\{addItem\}/;
const newTableHeader = `<h2 className="text-sm font-bold text-slate-700 uppercase">JMC Items</h2>
            <div className="flex items-center gap-4">
              <div className="w-[300px]">
                <Select
                  options={Array.from(new Set(availableItems.map(ai => ai.dynamicData?.activity).filter(Boolean))).map(act => ({ value: act, label: act }))}
                  placeholder="Add by Activity..."
                  onChange={(selected: any) => {
                    if (!selected) return;
                    const activityItems = availableItems.filter(ai => ai.dynamicData?.activity === selected.value);
                    const newRows = activityItems.map(ai => ({
                      activity: ai.dynamicData?.activity || '',
                      description: ai.dynamicData?.description || ai.dynamicData?.itemDescription || ai.dynamicData?.name || '',
                      unit: ai.dynamicData?.unit || ai.dynamicData?.uom || '',
                      totalLoaQty: Number(ai.dynamicData?.totalLoaQuantity || ai.dynamicData?.qty || ai.dynamicData?.quantity || 0),
                      claimedQty: 0,
                      approvedQty: 0,
                      rate: 0,
                      amount: 0,
                      remarks: ''
                    }));
                    setFormData(prev => ({
                      ...prev,
                      items: [...prev.items, ...newRows]
                    }));
                  }}
                  styles={{
                    control: (base) => ({ ...base, minHeight: '32px', height: '32px', fontSize: '13px', backgroundColor: 'white', border: '1px solid #cbd5e1', boxShadow: 'none' })
                  }}
                />
              </div>
              <Button onClick={addItem}`;

content = content.replace(tableHeaderRegex, newTableHeader);

// 3. Update table columns
const theadRegex = /<th className="px-4 py-3 border-r">Activity<\/th>[\s\S]*?<th className="px-4 py-3 border-r w-\[250px\]">Description<\/th>[\s\S]*?<th className="px-4 py-3 border-r w-24">Unit<\/th>/;
const newThead = `<th className="px-4 py-3 border-r w-[200px]">Activity</th>
                  <th className="px-4 py-3 border-r w-[250px]">Description</th>
                  <th className="px-4 py-3 border-r w-20">Unit</th>
                  <th className="px-4 py-3 border-r w-24">LOA Qty</th>`;
content = content.replace(theadRegex, newThead);

// 4. Update the tbody rows
const rowActivityRegex = /<td className="px-4 py-2 border-r border-slate-100">\s*<Select[\s\S]*?<\/td>/;
const newRowActivity = `<td className="px-4 py-2 border-r border-slate-100">
                      <Input 
                        value={item.activity || ''} 
                        onChange={e => handleItemChange(index, 'activity', e.target.value)} 
                        className="h-8 text-sm bg-slate-50"
                      />
                    </td>`;
content = content.replace(rowActivityRegex, newRowActivity);

const rowUnitRegex = /<td className="px-4 py-2 border-r border-slate-100">\s*<Input \n\s*value=\{item.unit\}[\s\S]*?<\/td>/;
const newRowUnit = `<td className="px-4 py-2 border-r border-slate-100">
                      <Input 
                        value={item.unit || ''} 
                        onChange={e => handleItemChange(index, 'unit', e.target.value)} 
                        className="h-8 text-sm"
                        placeholder="e.g. Mtr"
                      />
                    </td>
                    <td className="px-4 py-2 border-r border-slate-100 bg-slate-50 text-center font-medium text-slate-700">
                      {item.totalLoaQty || 0}
                    </td>`;
content = content.replace(rowUnitRegex, newRowUnit);

fs.writeFileSync(filePath, content);
console.log('Patched JMC2 successfully.');
