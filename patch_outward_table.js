const fs = require('fs');
const filePath = 'frontend/src/app/store/outward-register/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add to flatList mapping
const oldMapping = `              description: item.description,
              unit: item.unit,
              transferQty: item.dispatchedQty || item.requestedQty,`;
const newMapping = `              description: item.description,
              loaSerialNo: item.loaSerialNo || "-",
              loaQty: item.loaQty !== undefined && item.loaQty !== null ? item.loaQty : "-",
              unit: item.unit,
              transferQty: item.dispatchedQty || item.requestedQty,`;
content = content.replace(oldMapping, newMapping);

// 2. Add to table headers
const oldThead = `<th className="px-4 py-3 border-r border-slate-200">Description of Material</th>
                      <th className="px-4 py-3 border-r border-slate-200">Unit</th>`;
const newThead = `<th className="px-4 py-3 border-r border-slate-200">Description of Material</th>
                      <th className="px-4 py-3 border-r border-slate-200">LOA Serial No</th>
                      <th className="px-4 py-3 border-r border-slate-200">LOA Qty</th>
                      <th className="px-4 py-3 border-r border-slate-200">Unit</th>`;
content = content.replace(oldThead, newThead);

// 3. Add to table body
const oldTbody = `<td className="px-4 py-2 border-r border-slate-200 truncate max-w-[200px]" title={t.description}>{t.description}</td>
                          <td className="px-4 py-2 border-r border-slate-200">{t.unit}</td>`;
const newTbody = `<td className="px-4 py-2 border-r border-slate-200 truncate max-w-[200px]" title={t.description}>{t.description}</td>
                          <td className="px-4 py-2 border-r border-slate-200">{t.loaSerialNo}</td>
                          <td className="px-4 py-2 border-r border-slate-200 text-center">{t.loaQty}</td>
                          <td className="px-4 py-2 border-r border-slate-200">{t.unit}</td>`;
content = content.replace(oldTbody, newTbody);

fs.writeFileSync(filePath, content);
