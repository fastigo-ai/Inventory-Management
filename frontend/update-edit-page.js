const fs = require('fs');
const file = '/Users/Apple/Desktop/Inventory-Management/frontend/src/app/site-portal/mhrov/edit/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace imports
content = content.replace(
  /getInwardFilterOptions/g,
  'getMhrovDIFilterOptions'
);

// Add circle param to fetch call
content = content.replace(
  /const data = await getMhrovDIFilterOptions\(\);/g,
  'const data = await getMhrovDIFilterOptions({ circle: user?.assignedCircle || "" });'
);

// Remove Invoice No column header and filter
content = content.replace(
  /<th className="px-4 py-3 align-top min-w-\[120px\]">\s*<div className="mb-2">Invoice No<\/div>\s*<select\s*className="w-full h-8 px-2 py-1 text-xs font-normal border rounded bg-white"\s*value=\{filters.invoiceNo\}\s*onChange=\{\(e\) => handleFilterChange\("invoiceNo", e.target.value\)\}\s*>\s*<option value="all">All<\/option>\s*\{filterOptions.invoiceNos\.map\(\(inv, i\) => \(\s*<option key=\{i\} value=\{inv\}>\{inv\}<\/option>\s*\)\)\}\s*<\/select>\s*<\/th>/g,
  ''
);

// Remove invoiceNo from state
content = content.replace(
  /invoiceNo: "all",\s*/g,
  ''
);

// Remove invoiceNo from API call
content = content.replace(
  /invoiceNo: filters.invoiceNo,\s*/g,
  ''
);

// Remove invoice data from table body
content = content.replace(
  /<td className="px-4 py-3 text-slate-500">\{entry.invoiceNumber || entry.inwardId\}<br \/><span className="text-\[11px\] text-slate-400">\{new Date\(entry.invoiceDate\)\.toLocaleDateString\(\)\}<\/span><\/td>/g,
  ''
);

fs.writeFileSync(file, content);
console.log("Updated edit page");
