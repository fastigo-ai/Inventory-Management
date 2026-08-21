const fs = require('fs');

const sitePortalPage = fs.readFileSync('frontend/src/app/site-portal/demand-notes/[id]/page.tsx', 'utf8');

const detailsGridStartIndex = sitePortalPage.indexOf('{/* Details Grid */}');
// Instead of using lastIndexOf which might be fragile, we can just slice off the last 4 characters "  );\n}\n"
// Let's find the closing parenthesis of the return statement.
const modernViewContent = sitePortalPage.substring(detailsGridStartIndex);

// modernViewContent now contains everything to the end of the file, including the `  );\n}`!

const updatePortal = (portalName) => {
  const filePath = `frontend/src/app/${portalName}/demand-notes/[id]/page.tsx`;
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Add getStockSummary import
  if (!content.includes('getStockSummary')) {
    content = content.replace(
      `import { getDemandNoteById`,
      `import { getStockSummary } from '@/features/store/api/store.api';\nimport { getDemandNoteById`
    );
  }

  // 2. Add stockSummary state
  if (!content.includes('const [stockSummary')) {
    content = content.replace(
      'const [demandNote, setDemandNote] = useState<any>(null);',
      'const [demandNote, setDemandNote] = useState<any>(null);\n  const [stockSummary, setStockSummary] = useState<any[]>([]);'
    );
  }

  // 3. Add getStockSummary fetch logic
  if (!content.includes('getStockSummary({ circle })')) {
    content = content.replace(
      'setDemandNote(res.data.demandNote);',
      `setDemandNote(res.data.demandNote);\n        const circle = res.data.demandNote.circle;\n        if (circle) {\n          try {\n            const stockRes = await getStockSummary({ circle });\n            if (stockRes.success && stockRes.data) {\n              setStockSummary(stockRes.data);\n            }\n          } catch (err) {\n            console.error('Failed to fetch stock', err);\n          }\n        }`
    );
  }

  // 4. Fix Print Button URL
  content = content.replace(
    /window\.open\(\`\/site-portal\/demand-notes\/\$\{demandNote\._id\}\/print\`, '_blank'\)/g,
    `window.open(\`/${portalName}/demand-notes/\${demandNote._id}/print\`, '_blank')`
  );

  // 5. Replace PDF View Container with modern view
  const pdfViewStartIndex = content.indexOf('{/* PDF View Container */}');
  if (pdfViewStartIndex !== -1) {
    const headerPrefix = content.substring(0, pdfViewStartIndex);
    
    // newContent is just the header + modernViewContent (which already has the closing tags and );} )
    const newContent = headerPrefix + modernViewContent;
    
    fs.writeFileSync(filePath, newContent);
    console.log(`Updated ${portalName}`);
  }
};

updatePortal('pm-portal');
updatePortal('pd-portal');
