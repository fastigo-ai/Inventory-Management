const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/app/reports/item-summary/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add showMhrov toggle
content = content.replace(
  'const [showMrn, setShowMrn] = useState(true);',
  'const [showMrn, setShowMrn] = useState(true);\n  const [showMhrov, setShowMhrov] = useState(true);'
);

// 2. Update totals reduction to include mhrov
content = content.replace(
  /acc\.inwardSolan \+= \(r\.inwardSolan \|\| 0\);\s*acc\.inwardNahan \+= \(r\.inwardNahan \|\| 0\);\s*acc\.inwardRampur \+= \(r\.inwardRampur \|\| 0\);\s*acc\.inwardRohru \+= \(r\.inwardRohru \|\| 0\);/g,
  `acc.inwardSolan += (r.inwardSolan || 0);
      acc.inwardNahan += (r.inwardNahan || 0);
      acc.inwardRampur += (r.inwardRampur || 0);
      acc.inwardRohru += (r.inwardRohru || 0);

      acc.mhrovSolan += (r.mhrovSolan || 0);
      acc.mhrovNahan += (r.mhrovNahan || 0);
      acc.mhrovRampur += (r.mhrovRampur || 0);
      acc.mhrovRohru += (r.mhrovRohru || 0);`
);

content = content.replace(
  /inwardSolan: 0, inwardNahan: 0, inwardRampur: 0, inwardRohru: 0,/g,
  'inwardSolan: 0, inwardNahan: 0, inwardRampur: 0, inwardRohru: 0,\n      mhrovSolan: 0, mhrovNahan: 0, mhrovRampur: 0, mhrovRohru: 0,'
);

// 3. Update export headers and rows
content = content.replace(
  /'Total MRHOV Solan', 'Total MRHOV Nahan', 'Total MRHOV Rampur', 'Total MRHOV Rohru',/g,
  `'Total Inward (IR) Solan', 'Total Inward (IR) Nahan', 'Total Inward (IR) Rampur', 'Total Inward (IR) Rohru',
      'Total MRHOV Solan', 'Total MRHOV Nahan', 'Total MRHOV Rampur', 'Total MRHOV Rohru',`
);

content = content.replace(
  /`Bal for MRHOv-\$\{c\}`/g,
  `\`Bal for MRHOv-\${c}\``
); // No change needed to the literal if we just keep the header the same, wait we want to add Bal for IR?
// Let's change `Bal for MRHOv` to `Bal for IR` and add `Bal for MRHOV`.
content = content.replace(
  /`Bal for MRHOv-\$\{c\}`, `Bal for JMC-\$\{c\}`/g,
  `\`Bal for IR-\${c}\`, \`Bal for MRHOv-\${c}\`, \`Bal for JMC-\${c}\``
);

content = content.replace(
  /cv\('solan', r\.inwardSolan\), cv\('nahan', r\.inwardNahan\), cv\('rampur', r\.inwardRampur\), cv\('rohru', r\.inwardRohru\),/g,
  `cv('solan', r.inwardSolan), cv('nahan', r.inwardNahan), cv('rampur', r.inwardRampur), cv('rohru', r.inwardRohru),
        cv('solan', r.mhrovSolan), cv('nahan', r.mhrovNahan), cv('rampur', r.mhrovRampur), cv('rohru', r.mhrovRohru),`
);

content = content.replace(
  /return \[b\.diVsLoa \?\? 0, b\.diVsBom \?\? 0, b\.mrn \?\? 0, b\.imc \?\? 0, b\.supplyBill \?\? 0, b\.erectionBill \?\? 0\];/g,
  `return [b.diVsLoa ?? 0, b.diVsBom ?? 0, b.mrn ?? 0, b.mhrov ?? 0, b.imc ?? 0, b.supplyBill ?? 0, b.erectionBill ?? 0];`
);
content = content.replace(
  /if \(!itemCirc\.includes\(c\)\) return \['', '', '', '', '', ''\];/g,
  `if (!itemCirc.includes(c)) return ['', '', '', '', '', '', ''];`
);

// 4. Summary Cards
content = content.replace(
  /<div className="text-\[11px\] font-semibold text-emerald-800 uppercase tracking-wider">Total MRHOV \(Inward\)<\/div>/g,
  `<div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Total Inward (IR)</div>`
);
// Insert MRHOV card
content = content.replace(
  /<div className="bg-emerald-50\/50 p-3 rounded-xl border border-emerald-200\/80 shadow-sm">([\s\S]*?)<\/div>/g,
  `<div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-200/80 shadow-sm">$1</div>
        <div className="bg-cyan-50/50 p-3 rounded-xl border border-cyan-200/80 shadow-sm">
          <div className="text-[11px] font-semibold text-cyan-800 uppercase tracking-wider">Total MRHOV</div>
          <div className="text-lg font-extrabold text-cyan-950 mt-0.5 font-mono">
            {(totals.mhrovSolan + totals.mhrovNahan + totals.mhrovRampur + totals.mhrovRohru).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-cyan-700 mt-0.5">Handed over to Contractor</div>
        </div>`
);

// 5. Toggles
content = content.replace(
  /MRHOV \(Inward\)/g,
  `Inward (IR)`
);
content = content.replace(
  /<label className="flex items-center gap-1\.5 cursor-pointer hover:text-indigo-600">\s*<input type="checkbox" checked=\{showMrn\}/g,
  `<label className="flex items-center gap-1.5 cursor-pointer hover:text-indigo-600">
            <input type="checkbox" checked={showMhrov} onChange={e => setShowMhrov(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
            MRHOV
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-indigo-600">
            <input type="checkbox" checked={showMrn}`
);

// 6. Table Headers
content = content.replace(
  /<th colSpan=\{6\} className="p-2 text-center bg-orange-100/g,
  `<th colSpan={7} className="p-2 text-center bg-orange-100`
);

content = content.replace(
  /\{showMrn && <th colSpan=\{4\} className="p-2 text-center bg-emerald-100 text-emerald-900 sticky top-0 z-20">Total MRHOV<\/th>\}/g,
  `{showMrn && <th colSpan={4} className="p-2 text-center bg-emerald-100 text-emerald-900 sticky top-0 z-20">Total Inward (IR)</th>}
                  {showMhrov && <th colSpan={4} className="p-2 text-center bg-cyan-100 text-cyan-900 sticky top-0 z-20">Total MRHOV</th>}`
);

content = content.replace(
  /Bal for MRHOv-\{c\}/g,
  `Bal for IR-{c}</th>\n                      <th className={\`p-2 min-w-[100px] \${idx % 2 === 0 ? 'bg-orange-50' : 'bg-orange-50/70'} text-right font-bold text-orange-950\`} title={\`Inward IR minus MRHOV in \${c}\`}>Bal for MRHOv-{c}`
);
content = content.replace(
  /title=\{`DI Dispatched to \$\{c\} minus MRHOV Received`\}/g,
  `title={\`DI Dispatched to \${c} minus Inward Received\`}`
);
content = content.replace(
  /title=\{`MRHOV Received in \$\{c\} minus MIN Issued`\}/g,
  `title={\`MRHOV Received in \${c} minus MIN Issued\`}`
); // Kept same

// 7. Table body cells
content = content.replace(
  /\{showMrn && <>\s*<th className="p-2 min-w-\[75px\] bg-emerald-50 text-right font-bold text-emerald-900">Solan<\/th>\s*<th className="p-2 min-w-\[75px\] bg-emerald-50\/70 text-right">Nahan<\/th>\s*<th className="p-2 min-w-\[75px\] bg-emerald-50\/70 text-right">Rampur<\/th>\s*<th className="p-2 min-w-\[75px\] bg-emerald-50\/70 text-right">Rohru<\/th>\s*<\/>\}/g,
  `{showMrn && <>
                    <th className="p-2 min-w-[75px] bg-emerald-50 text-right font-bold text-emerald-900">Solan</th>
                    <th className="p-2 min-w-[75px] bg-emerald-50/70 text-right">Nahan</th>
                    <th className="p-2 min-w-[75px] bg-emerald-50/70 text-right">Rampur</th>
                    <th className="p-2 min-w-[75px] bg-emerald-50/70 text-right">Rohru</th>
                  </>}
                  {showMhrov && <>
                    <th className="p-2 min-w-[75px] bg-cyan-50 text-right font-bold text-cyan-900">Solan</th>
                    <th className="p-2 min-w-[75px] bg-cyan-50/70 text-right">Nahan</th>
                    <th className="p-2 min-w-[75px] bg-cyan-50/70 text-right">Rampur</th>
                    <th className="p-2 min-w-[75px] bg-cyan-50/70 text-right">Rohru</th>
                  </>}`
);

content = content.replace(
  /<td className=\{`p-2 text-center text-slate-300 font-bold \$\{idx % 2 === 0 \? 'bg-orange-50\/40' : 'bg-orange-50\/20'\}`\}>-<\/td>\s*<\/React.Fragment>/g,
  `<td className={\`p-2 text-center text-slate-300 font-bold \${idx % 2 === 0 ? 'bg-orange-50/40' : 'bg-orange-50/20'}\`}>-</td>\n                                    <td className={\`p-2 text-center text-slate-300 font-bold \${idx % 2 === 0 ? 'bg-orange-50/40' : 'bg-orange-50/20'}\`}>-</td>\n                                  </React.Fragment>`
);

content = content.replace(
  /<td className=\{`p-2 text-right font-bold text-slate-800 \$\{idx % 2 === 0 \? 'bg-orange-50\/40' : 'bg-orange-50\/20'\}`\}>\{b\.mrn \?\? 0\}<\/td>/g,
  `<td className={\`p-2 text-right font-bold text-slate-800 \${idx % 2 === 0 ? 'bg-orange-50/40' : 'bg-orange-50/20'}\`}>{b.mrn ?? 0}</td>
                                  <td className={\`p-2 text-right font-bold text-slate-800 \${idx % 2 === 0 ? 'bg-orange-50/40' : 'bg-orange-50/20'}\`}>{b.mhrov ?? 0}</td>`
);

content = content.replace(
  /\{showMrn && <>\s*<td className="p-2 text-right font-semibold text-emerald-900 bg-emerald-50\/30">\{cv\('solan', r\.inwardSolan \|\| r\.inward\?\.solan\)\}<\/td>\s*<td className="p-2 text-right text-slate-600">\{cv\('nahan', r\.inwardNahan \|\| r\.inward\?\.nahan\)\}<\/td>\s*<td className="p-2 text-right text-slate-600">\{cv\('rampur', r\.inwardRampur \|\| r\.inward\?\.rampur\)\}<\/td>\s*<td className="p-2 text-right text-slate-600">\{cv\('rohru', r\.inwardRohru \|\| r\.inward\?\.rohru\)\}<\/td>\s*<\/>\}/g,
  `{showMrn && <>
                              <td className="p-2 text-right font-semibold text-emerald-900 bg-emerald-50/30">{cv('solan', r.inwardSolan || r.inward?.solan)}</td>
                              <td className="p-2 text-right text-slate-600">{cv('nahan', r.inwardNahan || r.inward?.nahan)}</td>
                              <td className="p-2 text-right text-slate-600">{cv('rampur', r.inwardRampur || r.inward?.rampur)}</td>
                              <td className="p-2 text-right text-slate-600">{cv('rohru', r.inwardRohru || r.inward?.rohru)}</td>
                            </>}
                            {showMhrov && <>
                              <td className="p-2 text-right font-semibold text-cyan-900 bg-cyan-50/30">{cv('solan', r.mhrovSolan || r.mhrov?.solan)}</td>
                              <td className="p-2 text-right text-slate-600">{cv('nahan', r.mhrovNahan || r.mhrov?.nahan)}</td>
                              <td className="p-2 text-right text-slate-600">{cv('rampur', r.mhrovRampur || r.mhrov?.rampur)}</td>
                              <td className="p-2 text-right text-slate-600">{cv('rohru', r.mhrovRohru || r.mhrov?.rohru)}</td>
                            </>}`
);

// 8. TFoot
content = content.replace(
  /<td className=\{`p-2 text-right \$\{idx % 2 === 0 \? 'text-orange-300' : 'text-orange-200'\}`\}>\{bt\.mrn\}<\/td>/g,
  `<td className={\`p-2 text-right \${idx % 2 === 0 ? 'text-orange-300' : 'text-orange-200'}\`}>{bt.mrn}</td>
                          <td className={\`p-2 text-right \${idx % 2 === 0 ? 'text-orange-300' : 'text-orange-200'}\`}>{bt.mhrov}</td>`
);

content = content.replace(
  /\{showMrn && <>\s*<td className="p-2 text-right text-emerald-300">\{totals\.inwardSolan\}<\/td>\s*<td className="p-2 text-right">\{totals\.inwardNahan\}<\/td>\s*<td className="p-2 text-right">\{totals\.inwardRampur\}<\/td>\s*<td className="p-2 text-right">\{totals\.inwardRohru\}<\/td>\s*<\/>\}/g,
  `{showMrn && <>
                      <td className="p-2 text-right text-emerald-300">{totals.inwardSolan}</td>
                      <td className="p-2 text-right">{totals.inwardNahan}</td>
                      <td className="p-2 text-right">{totals.inwardRampur}</td>
                      <td className="p-2 text-right">{totals.inwardRohru}</td>
                    </>}
                    {showMhrov && <>
                      <td className="p-2 text-right text-cyan-300">{totals.mhrovSolan}</td>
                      <td className="p-2 text-right">{totals.mhrovNahan}</td>
                      <td className="p-2 text-right">{totals.mhrovRampur}</td>
                      <td className="p-2 text-right">{totals.mhrovRohru}</td>
                    </>}`
);

fs.writeFileSync(filePath, content);
console.log('Patched Item Summary!');
