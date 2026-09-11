const fs = require('fs');

const files = [
  'frontend/src/app/pd-portal/demand-notes/[id]/print/page.tsx',
  'frontend/src/app/site-portal/demand-notes/[id]/print/page.tsx',
  'frontend/src/app/pm-portal/demand-notes/[id]/print/page.tsx',
  'frontend/src/app/store/demand-notes/[id]/print/page.tsx',
  'frontend/src/app/billing/client-billing/[id]/print/page.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  content = content.replace(
    /onClick=\{\(\) => router\.back\(\)\}/g,
    'onClick={() => { window.history.length > 1 ? router.back() : window.close(); window.close(); }}'
  );
  
  // also change the text to "Close" if it makes more sense? "Back / Close"
  content = content.replace(
    />\s*Back\s*<\/button>/g,
    '>\n          Back / Close\n        </button>'
  );

  fs.writeFileSync(file, content);
  console.log(`Updated ${file}`);
});
