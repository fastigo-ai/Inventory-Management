const fs = require('fs');

const detailPages = [
  'frontend/src/app/site-portal/demand-notes/[id]/page.tsx',
  'frontend/src/app/pm-portal/demand-notes/[id]/page.tsx',
  'frontend/src/app/pd-portal/demand-notes/[id]/page.tsx'
];

for (const p of detailPages) {
  let content = fs.readFileSync(p, 'utf8');
  
  if (!content.includes('getStockSummary')) {
    // Add the import statement
    content = content.replace(
      "import { getDemandNoteById } from '@/features/site-portal/api/demand-notes.api';", 
      "import { getDemandNoteById } from '@/features/site-portal/api/demand-notes.api';\nimport { getStockSummary } from '@/features/store/api/store.api';"
    ).replace(
      "import { getDemandNoteById } from '@/features/pm-portal/api/demand-notes.api';", 
      "import { getDemandNoteById } from '@/features/pm-portal/api/demand-notes.api';\nimport { getStockSummary } from '@/features/store/api/store.api';"
    ).replace(
      "import { getDemandNoteById } from '@/features/pd-portal/api/demand-notes.api';", 
      "import { getDemandNoteById } from '@/features/pd-portal/api/demand-notes.api';\nimport { getStockSummary } from '@/features/store/api/store.api';"
    );
  }

  if (!content.includes('const [stockSummary')) {
    content = content.replace(
      "const [demandNote, setDemandNote] = useState<any>(null);",
      "const [demandNote, setDemandNote] = useState<any>(null);\n  const [stockSummary, setStockSummary] = useState<any[]>([]);"
    );
  }

  if (!content.includes('getStockSummary({ circle })')) {
    content = content.replace(
      "setDemandNote(res.data.demandNote);",
      "setDemandNote(res.data.demandNote);\n          const circle = res.data.demandNote.circle;\n          if (circle) {\n            try {\n              const stockRes = await getStockSummary({ circle });\n              if (stockRes.success && stockRes.data) {\n                setStockSummary(stockRes.data);\n              }\n            } catch (err) {\n              console.error('Failed to fetch stock', err);\n            }\n          }"
    );
  }

  if (!content.includes('In Stock')) {
    content = content.replace(
      '<th className="px-6 py-4">Activity</th>',
      '<th className="px-6 py-4">Activity</th>\n                <th className="px-6 py-4">LOA Sr No</th>'
    ).replace(
      '<th className="px-6 py-4 font-bold text-indigo-700 bg-indigo-50/50">Demand Qty</th>',
      '<th className="px-6 py-4 text-center">In Stock</th>\n                <th className="px-6 py-4 font-bold text-indigo-700 bg-indigo-50/50">Demand Qty</th>'
    );
  }

  if (!content.includes('const stockMatch = stockSummary.find')) {
    const searchString = `            <tbody className="divide-y divide-slate-100">
              {demandNote.items && demandNote.items.length > 0 ? (
                demandNote.items.map((item: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-500">{idx + 1}</td>
                    <td className="px-6 py-4 font-medium text-slate-700">{item.tempCode || '-'}</td>
                    <td className="px-6 py-4 text-slate-700 max-w-sm truncate" title={item.itemName}>{item.itemName}</td>
                    <td className="px-6 py-4 text-slate-500">{item.activity || '-'}</td>
                    <td className="px-6 py-4 text-slate-500">{item.unit || '-'}</td>
                    <td className="px-6 py-4 font-bold text-indigo-600 bg-indigo-50/30">{item.demandQty}</td>
                  </tr>
                ))
              ) : (`;
              
    const replacement = `            <tbody className="divide-y divide-slate-100">
              {demandNote.items && demandNote.items.length > 0 ? (
                demandNote.items.map((item: any, idx: number) => {
                  const stockMatch = stockSummary.find(s => 
                    s.loaSrNo === item.loaSrNo && 
                    s.activity === item.activity && 
                    (s.description === item.itemName || s.itemName === item.itemName)
                  );
                  const inStock = stockMatch ? stockMatch.totalBalanceQty : 0;
                  return (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-500">{idx + 1}</td>
                    <td className="px-6 py-4 font-medium text-slate-700">{item.tempCode || '-'}</td>
                    <td className="px-6 py-4 text-slate-700 max-w-sm truncate" title={item.itemName}>{item.itemName}</td>
                    <td className="px-6 py-4 text-slate-500">{item.activity || '-'}</td>
                    <td className="px-6 py-4 text-slate-500 font-mono">{item.loaSrNo || '-'}</td>
                    <td className="px-6 py-4 text-slate-500">{item.unit || '-'}</td>
                    <td className="px-6 py-4 text-center font-medium text-emerald-600">{inStock}</td>
                    <td className="px-6 py-4 font-bold text-indigo-600 bg-indigo-50/30">{item.demandQty}</td>
                  </tr>
                )})
              ) : (`

    content = content.replace(searchString, replacement);
  }

  fs.writeFileSync(p, content);
}

console.log('Update complete');
