const fs = require('fs');
const files = [
  '/Users/Apple/Desktop/Inventory-Management/frontend/src/app/site-portal/wip-required/new/page.tsx',
  '/Users/Apple/Desktop/Inventory-Management/frontend/src/app/site-portal/wip-register/new/page.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // 1. User syncing
  const useEffectBlock = `
  useEffect(() => {
    if (user && isNew) {
      setFormData(prev => ({
        ...prev,
        package: prev.package || user.assignedPackage || "",
        circle: prev.circle || user.assignedCircle || ""
      }));
    }
  }, [user, isNew]);

  useEffect(() => {
    if (formData.package && formData.circle) {`;

  content = content.replace(/  useEffect\(\(\) => \{\n    if \(formData\.package && formData\.circle\) \{/, useEffectBlock);

  // 2. Select Overflow
  content = content.replace(
    /styles=\{\{\s*control:\s*\(base\)\s*=>\s*\(\{\s*\.\.\.base,\s*minHeight:\s*'32px',\s*height:\s*'32px',\s*fontSize:\s*'13px',\s*backgroundColor:\s*'white',\s*border:\s*'1px solid #cbd5e1',\s*boxShadow:\s*'none'\s*\}\)\s*\}\}/g,
    `styles={{
                    control: (base) => ({ ...base, minHeight: '32px', height: '32px', fontSize: '13px', backgroundColor: 'white', border: '1px solid #cbd5e1', boxShadow: 'none' }),
                    menuPortal: base => ({ ...base, zIndex: 9999 })
                  }}
                  menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                  menuPosition="fixed"`
  );

  // 3. LOA Sr No mapping
  content = content.replace(/tempCode: "",\n\s*description:/g, 'tempCode: "",\n          loaSrNo: "",\n          description:');
  
  // 4. newRows mapping
  content = content.replace(
    /tempCode: ai\.dynamicData\?\.tempCode \|\| '',\n\s*description:/g, 
    "tempCode: ai.dynamicData?.tempCode || '',\n                      loaSrNo: ai.dynamicData?.loaSrNo || ai.dynamicData?.loaSerialNo || '',\n                      description:"
  );
  
  // 5. Replace exact setFormData inside the onChange of Select
  const sortBlock = `
                    newRows.sort((a, b) => {
                      const numA = parseFloat(a.tempCode || a.loaSrNo || '0');
                      const numB = parseFloat(b.tempCode || b.loaSrNo || '0');
                      return numA - numB;
                    });
                    
                    setFormData(prev => ({`;
  content = content.replace(/setFormData\(prev => \(\{/g, (match, offset) => {
    // Only replace the one that happens after newRows mapping (in the onChange)
    if (content.substring(offset - 100, offset).includes('newRows')) {
      return sortBlock;
    }
    return match;
  });

  // 6. Fix headers
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
  
  // Remove duplicates
  content = content.replace(
    /<th className="px-4 py-3 border-r w-24">LOA Sr No<\/th>\s*<th className="px-4 py-3 border-r w-24">LOA Sr No<\/th>\s*<th className="px-4 py-3 border-r w-24">Temp Code<\/th>/g,
    `<th className="px-4 py-3 border-r w-24">LOA Sr No</th>
                  <th className="px-4 py-3 border-r w-24">Temp Code</th>`
  );
  content = content.replace(
    /<th className="px-4 py-3 border-r w-\[150px\]">LOA SR\.NO\.<\/th>/g,
    ``
  );
  
  // 7. Fix body cells
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
  
  // 8. Replace description Input with textarea
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

  fs.writeFileSync(file, content);
}
console.log("Restored and fixed WIP tables safely.");
