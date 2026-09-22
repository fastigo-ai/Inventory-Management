const fs = require('fs');
const path = './frontend/src/app/reports/store-contractor-summary/page.tsx';

let code = fs.readFileSync(path, 'utf8');

// 1. Add to CSV Export
code = code.replace(
  /'Total Issued Qty': Math.round\(r.totalIssuedQty \|\| 0\),\n\s*'Total Return Qty': Math.round\(r.totalReturnQty \|\| 0\),\n\s*'Total Balance Qty': Math.round\(r.totalBalanceQty \|\| 0\)/,
  `'Total Issued Qty': Math.round(r.totalIssuedQty || 0),
      'Total Return Qty': Math.round(r.totalReturnQty || 0),
      'Store Balance': Math.round(r.totalBalanceQty || 0),
      'Contractor Balance': Math.round(r.contractorBalance || 0)`
);

// 2. Add to PDF Export Head
code = code.replace(
  /\['SR', 'LOA NO.', 'TEMP CODE', 'ITEM NAME', 'ISSUED', 'RETURNED', 'BALANCE'\]/,
  `['SR', 'LOA NO.', 'TEMP CODE', 'ITEM NAME', 'ISSUED', 'RETURNED', 'STORE BAL', 'CONTRACTOR BAL']`
);

// 3. Add to PDF Export Body
code = code.replace(
  /row.totalReturnQty\?\.toLocaleString\('en-IN', { maximumFractionDigits: 0 }\) \|\| '0',\n\s*row.totalBalanceQty\?\.toLocaleString\('en-IN', { maximumFractionDigits: 0 }\) \|\| '0'\n\s*\]\),/,
  `row.totalReturnQty?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) || '0',
        row.totalBalanceQty?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) || '0',
        row.contractorBalance?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) || '0'
      ]),`
);

// 4. Update the Table Headers in UI
code = code.replace(
  /<th className="p-4 border-b border-slate-200\/60 text-right w-32 bg-amber-50\/40 text-amber-950 font-bold tracking-wide">Issued<\/th>\n\s*<th className="p-4 border-b border-slate-200\/60 text-right w-32 bg-blue-50\/40 text-blue-950 font-bold tracking-wide">Returned<\/th>\n\s*<th className="p-4 border-b border-slate-200\/60 text-right w-32 bg-indigo-50\/50 text-indigo-950 font-extrabold tracking-wide rounded-tr-xl">Balance<\/th>/,
  `<th className="p-4 border-b border-slate-200/60 text-right w-32 bg-amber-50/40 text-amber-950 font-bold tracking-wide">Issued</th>
                    <th className="p-4 border-b border-slate-200/60 text-right w-32 bg-blue-50/40 text-blue-950 font-bold tracking-wide">Returned</th>
                    <th className="p-4 border-b border-slate-200/60 text-right w-32 bg-indigo-50/50 text-indigo-950 font-extrabold tracking-wide">Store Balance</th>
                    <th className="p-4 border-b border-slate-200/60 text-right w-32 bg-purple-50/50 text-purple-950 font-extrabold tracking-wide rounded-tr-xl">Contractor Balance</th>`
);

// 5. Update the Table Body in UI
code = code.replace(
  /<td className="p-4 text-right border-b border-slate-100 font-bold text-indigo-700 bg-indigo-50\/20">\n\s*{(row.totalBalanceQty \|\| 0).toLocaleString()}\n\s*<\/td>\n\s*<\/tr>/g,
  `<td className="p-4 text-right border-b border-slate-100 font-bold text-indigo-700 bg-indigo-50/20">
                          {(row.totalBalanceQty || 0).toLocaleString()}
                        </td>
                        <td className="p-4 text-right border-b border-slate-100 font-bold text-purple-700 bg-purple-50/20">
                          {(row.contractorBalance || 0).toLocaleString()}
                        </td>
                      </tr>`
);

fs.writeFileSync(path, code);
console.log("Patched frontend summary");
