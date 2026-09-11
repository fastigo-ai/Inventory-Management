const fs = require('fs');

const buttonHtml = `
    <>
      <div className="print:hidden fixed top-6 left-6 z-50">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg shadow-lg transition-all font-sans text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back
        </button>
      </div>
`;

const demandNoteFiles = [
  'frontend/src/app/pd-portal/demand-notes/[id]/print/page.tsx',
  'frontend/src/app/site-portal/demand-notes/[id]/print/page.tsx',
  'frontend/src/app/pm-portal/demand-notes/[id]/print/page.tsx',
  'frontend/src/app/store/demand-notes/[id]/print/page.tsx'
];

demandNoteFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('router.back()')) {
    console.log(`Skipping ${file}, back button already present.`);
    return;
  }
  
  content = content.replace(
    /return \(\s*<div className="bg-white min-h-screen w-full print:p-0 p-8 flex justify-center text-black font-serif">/,
    'return (' + buttonHtml + '    <div className="bg-white min-h-screen w-full print:p-0 p-8 flex justify-center text-black font-serif">'
  );
  
  content = content.replace(
    /    <\/div>\n  \);\n}/,
    '    </div>\n    </>\n  );\n}'
  );
  
  fs.writeFileSync(file, content);
  console.log(`Updated ${file}`);
});

// For client-billing
const cbFile = 'frontend/src/app/billing/client-billing/[id]/print/page.tsx';
let cbContent = fs.readFileSync(cbFile, 'utf8');
if (!cbContent.includes('router.back()')) {
  cbContent = cbContent.replace(
    /return \(\s*<>\s*<style dangerouslySetInnerHTML={{__html: `/,
    'return (' + buttonHtml + '      <style dangerouslySetInnerHTML={{__html: `'
  );
  fs.writeFileSync(cbFile, cbContent);
  console.log(`Updated ${cbFile}`);
}

