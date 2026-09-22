import fs from 'fs';
import path from 'path';

const file = path.join(__dirname, '../../frontend/src/app/store/demand-notes/[id]/page.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "import { getStockSummary } from '@/features/store/api/store.api';",
  "import { getStockSummary } from '@/features/store/api/store.api';\nimport { getContractorActivitySummary } from '@/features/contractors/api/contractors.api';"
);

content = content.replace(
  "const [stockSummary, setStockSummary] = useState<any[]>([]);",
  "const [stockSummary, setStockSummary] = useState<any[]>([]);\n  const [activitySummary, setActivitySummary] = useState<Record<string, any>>({});"
);

content = content.replace(
  "const stockRes = await getStockSummary({ circle, contractorId, contractorName });",
  "const [stockRes, actRes] = await Promise.all([\n              getStockSummary({ circle, contractorId, contractorName }),\n              getContractorActivitySummary(contractorId)\n            ]);\n            if (actRes?.data) setActivitySummary(actRes.data);"
);

// We need to replace the tbody mapping block with grouped rendering.
const tbodyStartIdx = content.indexOf('<tbody className="divide-y divide-slate-100">');
const tbodyEndIdx = content.indexOf('</tbody>', tbodyStartIdx);

const newTbody = `<tbody className="divide-y divide-slate-100">
              {demandNote.items && demandNote.items.length > 0 ? (
                Object.entries(
                  demandNote.items.reduce((acc: any, item: any, originalIdx: number) => {
                    const act = item.activity || 'Uncategorized Activity';
                    if (!acc[act]) acc[act] = [];
                    acc[act].push({ ...item, originalIdx });
                    return acc;
                  }, {})
                ).map(([activityName, itemsGroup]: [string, any], groupIdx) => (
                  <React.Fragment key={groupIdx}>
                    {/* Activity Separation Row */}
                    <tr className="bg-slate-100/80 border-y border-slate-200">
                      <td colSpan={15} className="px-6 py-3 font-semibold text-slate-700 uppercase tracking-wider text-xs dn-sticky-bg-header sticky left-0 z-20">
                        {activityName}
                      </td>
                    </tr>
                    
                    {/* Items for this activity */}
                    {itemsGroup.map((item: any, idx: number) => {
                      const stockMatch = stockSummary.find(s => {
                        if (item.tempCode && s.tempCode && String(item.tempCode).trim() === String(s.tempCode).trim()) return true;
                        return String(s.loaSrNo) === String(item.loaSrNo) && String(s.activity) === String(item.activity) && (s.description === item.itemName || s.itemName === item.itemName);
                      });
                      
                      const actKey = \`\${(item.tempCode || item.materialCode || '').trim().toLowerCase()}_\${(item.activity || '').trim().toLowerCase()}_\${(item.loaSrNo || item.loaSerialNo || '').trim().toLowerCase()}\`;
                      const actStats = activitySummary[actKey] || { tillIssued: 0, wipConsumed: 0, jmcDone: 0 };
                      
                      const inStock = stockMatch ? stockMatch.totalBalanceQty : 0;
                      const tillIssued = actStats.tillIssued || 0;
                      const consumption = actStats.wipConsumed || 0;
                      const jmcDone = actStats.jmcDone || 0;
                      
                      const circleLoaQty = stockMatch ? (stockMatch.circleLoaQty || 0) : 0;
                      const invoiceQty = stockMatch ? ((stockMatch.acceptedQty || 0) + (stockMatch.mhrovQty || 0)) : 0;
                      const contractorBalance = Number(tillIssued || 0) - Number(jmcDone || 0) - Number(consumption || 0);
                      
                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-sm text-slate-600 dn-sticky-sr dn-sticky-bg-white">{item.originalIdx + 1}</td>
                          <td className="px-6 py-4 font-medium text-slate-900 dn-sticky-mc dn-sticky-bg-white">{item.tempCode || '-'}</td>
                          <td className="px-6 py-4 text-sm text-slate-700 max-w-xs truncate dn-sticky-name dn-sticky-bg-white" title={item.itemName}>{item.itemName}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate dn-sticky-act dn-sticky-bg-white" title={item.activity}>{item.activity || '-'}</td>
                          <td className="px-6 py-4 text-sm text-slate-600 dn-sticky-loa dn-sticky-bg-white">{item.loaSrNo || '-'}</td>
                          <td className="px-6 py-4 text-center text-sm font-medium text-slate-700">{(circleLoaQty || circleLoaQty === 0) ? Math.round(Number(circleLoaQty)) : '-'}</td>
                          <td className="px-6 py-4 text-center text-sm font-medium text-slate-700">{(invoiceQty || invoiceQty === 0) ? Math.round(Number(invoiceQty)) : '-'}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{item.unit || 'Nos'}</td>
                          <td className={\`px-6 py-4 text-center font-bold \${inStock > 0 ? 'text-emerald-600' : 'text-rose-600'}\`}>
                            {Math.round(Number(inStock || 0))}
                          </td>
                          <td className="px-6 py-4 text-center font-medium text-blue-600">{Math.round(Number(tillIssued || 0))}</td>
                          <td className="px-6 py-4 text-center font-medium text-orange-600">{Math.round(Number(consumption || 0))}</td>
                          <td className="px-6 py-4 text-center font-medium text-purple-600">{Math.round(Number(jmcDone || 0))}</td>
                          <td className="px-6 py-4 text-center font-bold text-teal-600">{Math.round(contractorBalance)}</td>
                          <td className="px-6 py-4 font-bold text-indigo-600 bg-indigo-50/30">{Math.round(Number(item.demandQty || 0))}</td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan={15} className="px-6 py-8 text-center text-slate-500">
                    No items found in this Demand Note
                  </td>
                </tr>
              )}`;

content = content.slice(0, tbodyStartIdx) + newTbody + content.slice(tbodyEndIdx);

fs.writeFileSync(file, content);
console.log("store-portal demand notes updated");
