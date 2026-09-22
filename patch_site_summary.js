const fs = require('fs');
const path = './frontend/src/app/site-portal/contractor-summary/page.tsx';

let code = fs.readFileSync(path, 'utf8');

// 1. Add column to headers
code = code.replace(
  /<th className="p-3 border-r border-slate-200\/60 text-right w-32 bg-indigo-100\/70 text-indigo-950 font-bold">Store Balance<\/th>\n\s*<th className="p-3 border-r border-slate-200\/60 text-right w-28 font-bold">Items to be Required<\/th>/,
  `<th className="p-3 border-r border-slate-200/60 text-right w-32 bg-indigo-100/70 text-indigo-950 font-bold">Store Balance</th>
                    <th className="p-3 border-r border-slate-200/60 text-right w-28 bg-blue-100/70 text-blue-950 font-bold">Contractor Balance</th>
                    <th className="p-3 border-r border-slate-200/60 text-right w-28 font-bold">Items to be Required</th>`
);

// 2. Add column to body
code = code.replace(
  /<td className={`p-3 text-right font-bold \${isNeg \? 'text-rose-600 bg-rose-50\/30' : 'text-slate-700 bg-slate-50\/50'}`}>/,
  `<td className="p-3 text-right font-bold text-blue-900 bg-blue-50/40">
                              {((row.todayTotalBalance || 0) - (row.jmcDone || 0) - (row.wipConsumed || 0)).toLocaleString()}
                            </td>
                            <td className={\`p-3 text-right font-bold \${isNeg ? 'text-rose-600 bg-rose-50/30' : 'text-slate-700 bg-slate-50/50'}\`}>`
);

// 3. Same for activity view
code = code.replace(
  /<td className={`p-3 text-right font-bold \${isNeg \? 'text-rose-600' : 'text-slate-700'}`}>/,
  `<td className="p-3 text-right font-bold text-blue-900">
                              {((row.todayTotalBalance || 0) - (row.jmcDone || 0) - (row.wipConsumed || 0)).toLocaleString()}
                            </td>
                            <td className={\`p-3 text-right font-bold \${isNeg ? 'text-rose-600' : 'text-slate-700'}\`}>`
);


// 4. Update CSV export headers
code = code.replace(
  /'Today Total Balance', 'Items to be Required'/g,
  `'Today Total Balance', 'Contractor Balance', 'Items to be Required'`
);

// 5. Update CSV rows
code = code.replace(
  /r.todayTotalBalance \|\| 0, r.finalBalQty \|\| 0/g,
  `r.todayTotalBalance || 0, (r.todayTotalBalance || 0) - (r.jmcDone || 0) - (r.wipConsumed || 0), r.finalBalQty || 0`
);

fs.writeFileSync(path, code);
console.log("Patched site contractor summary frontend");
