const fs = require('fs');
const filePath = 'frontend/src/app/site-portal/jmc-register/new/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add tempCode to the default item structure
content = content.replace(/activity: "",\n\s*description: "",/g, 'activity: "",\n        tempCode: "",\n        description: "",');

// 2. Add tempCode to the activity item mapping
content = content.replace(/activity: ai\.dynamicData\?\.activity \|\| '',/g, 'activity: ai.dynamicData?.activity || \'\',\n                      tempCode: ai.dynamicData?.tempCode || \'\',');

// 3. Update table headers
const oldThead = `<th className="px-4 py-3 border-r w-[200px]">Activity</th>
                  <th className="px-4 py-3 border-r w-[250px]">Description</th>`;
const newThead = `<th className="px-4 py-3 border-r w-[200px]">Activity</th>
                  <th className="px-4 py-3 border-r w-[150px]">Temp Code</th>
                  <th className="px-4 py-3 border-r w-[250px]">Description</th>`;
content = content.replace(oldThead, newThead);

// 4. Update table rows
const oldRow = `<td className="px-4 py-2 border-r border-slate-100">
                      <Input 
                        value={item.activity || ''} 
                        onChange={e => handleItemChange(index, 'activity', e.target.value)} 
                        className="h-8 text-sm bg-slate-50"
                      />
                    </td>
                    <td className="px-4 py-2 border-r border-slate-100">
                      <Input 
                        value={item.description} 
                        onChange={e => handleItemChange(index, 'description', e.target.value)} 
                        className="h-8 text-sm"
                        placeholder="Description of work"
                      />
                    </td>`;
const newRow = `<td className="px-4 py-2 border-r border-slate-100">
                      <Input 
                        value={item.activity || ''} 
                        onChange={e => handleItemChange(index, 'activity', e.target.value)} 
                        className="h-8 text-sm bg-slate-50"
                      />
                    </td>
                    <td className="px-4 py-2 border-r border-slate-100">
                      <Input 
                        value={item.tempCode || ''} 
                        onChange={e => handleItemChange(index, 'tempCode', e.target.value)} 
                        className="h-8 text-sm"
                        placeholder="Code"
                      />
                    </td>
                    <td className="px-4 py-2 border-r border-slate-100">
                      <Input 
                        value={item.description} 
                        onChange={e => handleItemChange(index, 'description', e.target.value)} 
                        className="h-8 text-sm"
                        placeholder="Description of work"
                      />
                    </td>`;
content = content.replace(oldRow, newRow);

// 5. Update colSpan in the empty state
content = content.replace(/colSpan=\{10\}/, 'colSpan={11}');

fs.writeFileSync(filePath, content);
