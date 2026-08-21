const fs = require('fs');
const files = [
  '/Users/Apple/Desktop/Inventory-Management/frontend/src/app/site-portal/wip-required/new/page.tsx',
  '/Users/Apple/Desktop/Inventory-Management/frontend/src/app/site-portal/wip-register/new/page.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Find the styles block for react-select and replace it to add menuPortalTarget and menuPosition
  content = content.replace(
    /styles=\{\{\s*control:\s*\(base\)\s*=>\s*\(\{\s*\.\.\.base,\s*minHeight:\s*'32px',\s*height:\s*'32px',\s*fontSize:\s*'13px',\s*backgroundColor:\s*'white',\s*border:\s*'1px solid #cbd5e1',\s*boxShadow:\s*'none'\s*\}\)\s*\}\}/g,
    `styles={{
                    control: (base) => ({ ...base, minHeight: '32px', height: '32px', fontSize: '13px', backgroundColor: 'white', border: '1px solid #cbd5e1', boxShadow: 'none' }),
                    menuPortal: base => ({ ...base, zIndex: 9999 })
                  }}
                  menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                  menuPosition="fixed"`
  );
  
  fs.writeFileSync(file, content);
}
console.log("Fixed overflow for React Select dropdowns.");
