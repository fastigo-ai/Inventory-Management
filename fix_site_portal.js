const fs = require('fs');

const p = 'frontend/src/app/site-portal/demand-notes/[id]/page.tsx';
let content = fs.readFileSync(p, 'utf8');

// 1. Add getStockSummary import
if (!content.includes('getStockSummary')) {
  content = content.replace(
    "import { getDemandNoteById } from '@/features/site-portal/api/demand-notes.api';",
    "import { getDemandNoteById } from '@/features/site-portal/api/demand-notes.api';\nimport { getStockSummary } from '@/features/store/api/store.api';"
  );
}

// 2. Add stockSummary state
if (!content.includes('const [stockSummary, setStockSummary]')) {
  content = content.replace(
    'const [demandNote, setDemandNote] = useState<any>(null);',
    'const [demandNote, setDemandNote] = useState<any>(null);\n  const [stockSummary, setStockSummary] = useState<any[]>([]);'
  );
}

// 3. Fetch stockSummary
if (!content.includes('getStockSummary({ circle })')) {
  content = content.replace(
    'setDemandNote(res.data.demandNote);',
    `setDemandNote(res.data.demandNote);\n          const circle = res.data.demandNote.circle;\n          if (circle) {\n            try {\n              const stockRes = await getStockSummary({ circle });\n              if (stockRes.success && stockRes.data) {\n                setStockSummary(stockRes.data);\n              }\n            } catch (err) {\n              console.error('Failed to fetch stock', err);\n            }\n          }`
  );
}

// 4. Add table headers
if (!content.includes('<th className="px-6 py-4">LOA Sr No</th>')) {
  content = content.replace(
    '<th className="px-6 py-4">Activity</th>',
    '<th className="px-6 py-4">Activity</th>\n                <th className="px-6 py-4">LOA Sr No</th>'
  );
  content = content.replace(
    '<th className="px-6 py-4 font-bold text-indigo-700 bg-indigo-50/50">Demand Qty</th>',
    '<th className="px-6 py-4 text-center">In Stock</th>\n                <th className="px-6 py-4 font-bold text-indigo-700 bg-indigo-50/50">Demand Qty</th>'
  );
}

// 5. Update map logic for items
if (!content.includes('const stockMatch = stockSummary.find')) {
  // First, target the start of map
  content = content.replace(
    'demandNote.items.map((item: any, idx: number) => (',
    `demandNote.items.map((item: any, idx: number) => {\n                  const stockMatch = stockSummary.find(s => \n                    s.loaSrNo === item.loaSrNo && \n                    s.activity === item.activity && \n                    (s.description === item.itemName || s.itemName === item.itemName)\n                  );\n                  const inStock = stockMatch ? stockMatch.totalBalanceQty : 0;\n                  return (`
  );

  // Then target the table data cells
  content = content.replace(
    '<td className="px-6 py-4 text-slate-500">{item.activity || \'-\'}</td>',
    '<td className="px-6 py-4 text-slate-500">{item.activity || \'-\'}</td>\n                    <td className="px-6 py-4 text-slate-500 font-mono">{item.loaSrNo || \'-\'}</td>'
  );

  content = content.replace(
    '<td className="px-6 py-4 font-bold text-indigo-600 bg-indigo-50/30">{item.demandQty}</td>',
    '<td className="px-6 py-4 text-center font-medium text-emerald-600">{inStock}</td>\n                    <td className="px-6 py-4 font-bold text-indigo-600 bg-indigo-50/30">{item.demandQty}</td>'
  );

  // Finally, fix the closing parenthesis
  content = content.replace(
    '</tr>\n                ))\n              ) : (',
    '</tr>\n                )})\n              ) : ('
  );
  
  // Fix the empty colSpan
  content = content.replace(
    '<td colSpan={6}',
    '<td colSpan={8}'
  );
}

fs.writeFileSync(p, content);
console.log('site-portal page updated');
