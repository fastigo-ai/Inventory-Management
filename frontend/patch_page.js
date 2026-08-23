const fs = require('fs');
const file = 'src/app/reports/item-summary/page.tsx';
let code = fs.readFileSync(file, 'utf8');

const lines = code.split('\n');
let start = -1;
let end = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('<table className="w-full text-left border-collapse text-[11px]">')) {
    start = i;
  }
  if (start !== -1 && lines[i].includes('</table>')) {
    end = i;
    break;
  }
}

const newTable = `            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 divide-x divide-slate-200 sticky top-0 z-20">
                  <th className="p-2 min-w-[40px] text-center bg-slate-100">
                    <input 
                      type="checkbox"
                      checked={data.length > 0 && selectedItems.size === data.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems(new Set(data.map((r, i) => r.tempCode || String(i))));
                        } else {
                          setSelectedItems(new Set());
                        }
                      }}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                    />
                  </th>
                  <th className="p-2 min-w-[40px] text-center bg-slate-100">Sr. No.</th>
                  <th className="p-2 min-w-[80px] bg-slate-100">Temp Code</th>
                  <th className="p-2 min-w-[220px] bg-slate-100">Item Name</th>
                  <th className="p-2 min-w-[120px] bg-slate-100">Package</th>
                  <th className="p-2 min-w-[100px] bg-slate-100">Circle</th>

                  <th className="p-2 min-w-[100px] bg-amber-50 text-right font-bold text-amber-900">LOA Quantity</th>
                  <th className="p-2 min-w-[100px] bg-amber-50 text-right font-bold text-amber-900">BOM Quantity</th>
                  
                  <th className="p-2 min-w-[100px] bg-blue-50 text-right font-bold text-blue-900">Total DI Done</th>
                  <th className="p-2 min-w-[100px] bg-emerald-50 text-right font-bold text-emerald-900">Total PI Done (IR)</th>
                  <th className="p-2 min-w-[100px] bg-cyan-50 text-right font-bold text-cyan-900">Total MRHOV Done</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-slate-400 font-sans">
                      No summary items found matching selected filters.
                    </td>
                  </tr>
                ) : (
                  data.map((r, idx) => {
                    const c = String(r.circle || '').toLowerCase();
                    
                    // Compute dynamic values based on the item's circle
                    const loaQty = r.solanLoaQty || r.nahanLoaQty || r.rampurLoaQty || r.rohruLoaQty || 0;
                    const bomQty = r.solanBomQty || r.nahanBomQty || r.rampurBomQty || r.rohruBomQty || 0;
                    
                    const diQty = r.dispatchedSolan || r.dispatchedNahan || r.dispatchedRampur || r.dispatchedRohru || r.dispatched?.solan || r.dispatched?.nahan || r.dispatched?.rampur || r.dispatched?.rohru || 0;
                    
                    const piQty = r.inwardSolan || r.inwardNahan || r.inwardRampur || r.inwardRohru || r.inward?.solan || r.inward?.nahan || r.inward?.rampur || r.inward?.rohru || 0;
                    
                    const mhrovQty = r.mhrovSolan || r.mhrovNahan || r.mhrovRampur || r.mhrovRohru || r.mhrov?.solan || r.mhrov?.nahan || r.mhrov?.rampur || r.mhrov?.rohru || 0;

                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 border-r bg-white sticky left-0 z-10 text-center">
                          <input 
                            type="checkbox" 
                            checked={selectedItems.has(r.tempCode || String(idx))}
                            onChange={(e) => {
                              const newSet = new Set(selectedItems);
                              if (e.target.checked) newSet.add(r.tempCode || String(idx));
                              else newSet.delete(r.tempCode || String(idx));
                              setSelectedItems(newSet);
                            }}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3 h-3 cursor-pointer"
                          />
                        </td>
                        <td className="p-2 text-center text-slate-500 border-r">{idx + 1 + (page - 1) * limit}</td>
                        <td className="p-2 text-slate-700 border-r">{r.tempCode}</td>
                        <td className="p-2 font-medium text-slate-900 border-r max-w-[220px] truncate" title={r.itemName || r.name}>{r.itemName || r.name}</td>
                        <td className="p-2 text-slate-700 border-r">{r.package}</td>
                        <td className="p-2 text-slate-700 border-r">{r.circle}</td>

                        <td className="p-2 text-right text-amber-900 font-medium bg-amber-50/20">{loaQty || '-'}</td>
                        <td className="p-2 text-right text-amber-900 font-medium bg-amber-50/20">{bomQty || '-'}</td>

                        <td className="p-2 text-right text-blue-900 font-medium bg-blue-50/20">{diQty || '-'}</td>
                        <td className="p-2 text-right text-emerald-900 font-medium bg-emerald-50/20">{piQty || '-'}</td>
                        <td className="p-2 text-right text-cyan-900 font-medium bg-cyan-50/20">{mhrovQty || '-'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="sticky bottom-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                {!loading && data.length > 0 && (() => {
                  let totalLoa = 0;
                  let totalBom = 0;
                  let totalDi = 0;
                  let totalPi = 0;
                  let totalMhrov = 0;

                  data.forEach(r => {
                    if (selectedItems.size > 0 && !selectedItems.has(r.tempCode || '')) return;
                    totalLoa += (r.solanLoaQty || r.nahanLoaQty || r.rampurLoaQty || r.rohruLoaQty || 0);
                    totalBom += (r.solanBomQty || r.nahanBomQty || r.rampurBomQty || r.rohruBomQty || 0);
                    totalDi += (r.dispatchedSolan || r.dispatchedNahan || r.dispatchedRampur || r.dispatchedRohru || r.dispatched?.solan || r.dispatched?.nahan || r.dispatched?.rampur || r.dispatched?.rohru || 0);
                    totalPi += (r.inwardSolan || r.inwardNahan || r.inwardRampur || r.inwardRohru || r.inward?.solan || r.inward?.nahan || r.inward?.rampur || r.inward?.rohru || 0);
                    totalMhrov += (r.mhrovSolan || r.mhrovNahan || r.mhrovRampur || r.mhrovRohru || r.mhrov?.solan || r.mhrov?.nahan || r.mhrov?.rampur || r.mhrov?.rohru || 0);
                  });

                  return (
                    <tr className="bg-slate-800 text-white font-bold divide-x divide-slate-700 text-[11px]">
                      <td colSpan={6} className="p-2 text-right font-sans">
                        {selectedItems.size > 0 ? \`TOTAL (Selected \${selectedItems.size} items)\` : 'TOTAL (Current Page)'}
                      </td>
                      <td className="p-2 text-right text-amber-300">{totalLoa}</td>
                      <td className="p-2 text-right text-amber-300">{totalBom}</td>
                      <td className="p-2 text-right text-blue-300">{totalDi}</td>
                      <td className="p-2 text-right text-emerald-300">{totalPi}</td>
                      <td className="p-2 text-right text-cyan-300">{totalMhrov}</td>
                    </tr>
                  );
                })()}
              </tfoot>
            </table>`;

if (start !== -1 && end !== -1) {
  lines.splice(start, end - start + 1, newTable);
  fs.writeFileSync(file, lines.join('\n'));
  console.log('Successfully reverted back to flat layout!');
} else {
  console.log('Failed to find table block bounds.', start, end);
}
