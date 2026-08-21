const fs = require('fs');
const files = [
  '/Users/Apple/Desktop/Inventory-Management/frontend/src/app/site-portal/jmc-register/page.tsx',
  '/Users/Apple/Desktop/Inventory-Management/frontend/src/app/site-portal/wip-register/page.tsx',
  '/Users/Apple/Desktop/Inventory-Management/frontend/src/app/site-portal/wip-required/page.tsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  // Fix cell: any
  content = content.replace(/cell =>/g, '(cell: any) =>');
  
  // Fix fetchWipRequireds
  if (file.includes('wip-required')) {
    // Find what the fetch function is called
    const fetchMatches = content.match(/const (fetch\w+) = async \(\) => \{/);
    if (fetchMatches && fetchMatches[1]) {
      const realFetchName = fetchMatches[1];
      content = content.replace(/fetchWipRequireds\(\)/g, `${realFetchName}()`);
    }
  }

  fs.writeFileSync(file, content);
}
console.log("Fixed TS errors");
