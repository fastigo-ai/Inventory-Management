const fs = require('fs');
const files = [
  '/Users/Apple/Desktop/Inventory-Management/frontend/src/app/site-portal/wip-required/new/page.tsx',
  '/Users/Apple/Desktop/Inventory-Management/frontend/src/app/site-portal/wip-register/new/page.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // 1. Add loaSrNo to state
  content = content.replace(/tempCode: "",\n\s*description:/g, 'tempCode: "",\n          loaSrNo: "",\n          description:');
  
  // 2. Add loaSrNo to newRows mapping and sort
  content = content.replace(/tempCode: ai\.dynamicData\?\.tempCode \|\| '',\n\s*description:/g, "tempCode: ai.dynamicData?.tempCode || '',\n                      loaSrNo: ai.dynamicData?.loaSrNo || ai.dynamicData?.loaSerialNo || '',\n                      description:");
  
  const sortBlock = `
                    newRows.sort((a, b) => {
                      const numA = parseFloat(a.tempCode || a.loaSrNo || '0');
                      const numB = parseFloat(b.tempCode || b.loaSrNo || '0');
                      return numA - numB;
                    });
                    
                    setFormData`;
  content = content.replace(/\n\s*setFormData/g, sortBlock);
  
  // 3. Fix headers
  content = content.replace(
    /<th className="px-4 py-3 border-r w-\[150px\]">Temp Code<\/th>/g,
    `<th className="px-4 py-3 border-r w-24">LOA Sr No</th>
                  <th className="px-4 py-3 border-r w-24">Temp Code</th>`
  );
  content = content.replace(
    /<th className="px-4 py-3 border-r w-24">Temp Code<\/th>/g,
    `<th className="px-4 py-3 border-r w-24">LOA Sr No</th>
                  <th className="px-4 py-3 border-r w-24">Temp Code</th>`
  );
  
  // 4. Fix body cells
  content = content.replace(
    /<td className="px-4 py-2 border-r border-slate-100">\n\s*<Input \n\s*value=\{item\.tempCode \|\| ''\}/g,
    `<td className="px-4 py-2 border-r border-slate-100">
                      <Input 
                        value={item.loaSrNo || ''} 
                        onChange={e => handleItemChange(index, 'loaSrNo', e.target.value)} 
                        className="h-8 text-sm"
                        placeholder="LOA Sr No"
                      />
                    </td>
                    <td className="px-4 py-2 border-r border-slate-100">
                      <Input 
                        value={item.tempCode || ''}`
  );
  
  // 5. Replace description Input with textarea
  content = content.replace(
    /<Input \n\s*value=\{item\.description\}\n\s*onChange=\{e => handleItemChange\(index, 'description', e\.target\.value\)\}\n\s*className="h-8 text-sm"\n\s*placeholder="Description of work"\n\s*\/>/g,
    `<textarea 
                        value={item.description || ''} 
                        onChange={e => handleItemChange(index, 'description', e.target.value)} 
                        className="w-full min-w-[250px] min-h-[40px] text-sm bg-transparent border border-slate-200 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
                        placeholder="Description of work"
                        title={item.description}
                      />`
  );
  
  // Remove duplicates from repeated setFormData replace if any
  content = content.replace(/newRows\.sort[\s\S]*?newRows\.sort/g, 'newRows.sort');

  fs.writeFileSync(file, content);
}
console.log("Fixed WIP tables.");
