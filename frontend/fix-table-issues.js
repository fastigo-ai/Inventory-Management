const fs = require('fs');
const files = [
  '/Users/Apple/Desktop/Inventory-Management/frontend/src/app/site-portal/jmc-register/new/page.tsx',
  '/Users/Apple/Desktop/Inventory-Management/frontend/src/app/site-portal/wip-required/new/page.tsx',
  '/Users/Apple/Desktop/Inventory-Management/frontend/src/app/site-portal/wip-register/new/page.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // 1. Add loaSrNo to newRows mapping and sort
  content = content.replace(
    /const newRows = activityItems\.map\(ai => \(\{\n\s*activity:/g,
    `const newRows = activityItems.map(ai => ({
                      loaSrNo: ai.dynamicData?.loaSrNo || ai.dynamicData?.loaSerialNo || '',
                      activity:`
  );
  
  // 1b. Add loaSrNo to default empty row in addItem
  content = content.replace(
    /items: \[\n\s*\.\.\.formData\.items,\n\s*\{\n\s*activity:/g,
    `items: [
        ...formData.items,
        {
          loaSrNo: "",
          activity:`
  );

  content = content.replace(
    /items: \[\n\s*\{\n\s*activity:/g,
    `items: [
      {
        loaSrNo: "",
        activity:`
  );
  
  // Sort newRows
  content = content.replace(
    /const newRows = activityItems\.map([\s\S]*?remarks: (''|"")\n\s*\}\)\);/g,
    `const newRows = activityItems.map$1}));
                    newRows.sort((a, b) => {
                      const numA = parseFloat(a.tempCode || a.loaSrNo || '0');
                      const numB = parseFloat(b.tempCode || b.loaSrNo || '0');
                      return numA - numB;
                    });`
  );
  
  // 2. Fix table header: add LOA SR NO
  content = content.replace(
    /<th className="px-4 py-3 border-r w-24">Temp Code<\/th>/g,
    `<th className="px-4 py-3 border-r w-24">LOA Sr No</th>
                  <th className="px-4 py-3 border-r w-24">Temp Code</th>`
  );
  
  // 3. Fix table body: add LOA SR NO cell and fix description width
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
  
  // Make Description textarea instead of input
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
console.log("Fixed JMC and WIP table mapping, sorting, and display issues.");
