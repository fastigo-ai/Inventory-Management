const fs = require('fs');
const files = [
  '/Users/Apple/Desktop/Inventory-Management/frontend/src/app/site-portal/jmc-register/new/page.tsx',
  '/Users/Apple/Desktop/Inventory-Management/frontend/src/app/site-portal/wip-required/new/page.tsx',
  '/Users/Apple/Desktop/Inventory-Management/frontend/src/app/site-portal/wip-register/new/page.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/Number\(ai\.dynamicData\?\.loaQty \|\| ai\.dynamicData\?\.totalLoaQuantity \|\| ai\.dynamicData\?\.qty \|\| ai\.dynamicData\?\.quantity \|\| 0\)/g, "Number(ai.dynamicData?.loaQty || ai.dynamicData?.loaQuantity || ai.dynamicData?.totalLoaQuantity || ai.dynamicData?.qty || ai.dynamicData?.quantity || 0)");
  fs.writeFileSync(file, content);
}
console.log("Fixed LOA Qty field mappings.");
