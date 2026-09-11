const fs = require('fs');

const files = [
  'frontend/src/app/pd-portal/demand-notes/[id]/print/page.tsx',
  'frontend/src/app/site-portal/demand-notes/[id]/print/page.tsx',
  'frontend/src/app/pm-portal/demand-notes/[id]/print/page.tsx',
  'frontend/src/app/store/demand-notes/[id]/print/page.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace fixed with absolute and move it inside the bg-white container
  content = content.replace(
    /<div className="print:hidden fixed top-6 left-6 z-50">([\s\S]*?)<\/div>\n    <div className="bg-white min-h-screen w-full print:p-0 p-8 flex justify-center text-black font-serif">/,
    '<div className="bg-white min-h-screen w-full print:p-0 p-8 flex justify-center text-black font-serif relative">\n      <div className="print:hidden absolute top-8 left-8 z-50">$1</div>'
  );
  
  fs.writeFileSync(file, content);
  console.log(`Updated ${file}`);
});

// For client-billing
const cbFile = 'frontend/src/app/billing/client-billing/[id]/print/page.tsx';
let cbContent = fs.readFileSync(cbFile, 'utf8');
cbContent = cbContent.replace(
  /<div className="print:hidden fixed top-6 left-6 z-50">/,
  '<div className="print:hidden fixed top-6 left-72 z-50">' // For client billing, it has no wrapper so just offset it by sidebar width (left-72) or similar, wait.
);
fs.writeFileSync(cbFile, cbContent);

