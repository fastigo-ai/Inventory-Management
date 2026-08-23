const fs = require('fs');
const file = 'src/app/reports/item-summary/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Add header
code = code.replace(
  '<th className="p-2 min-w-[100px] bg-emerald-50 text-right font-bold text-emerald-900">Total PI Done (IR)</th>',
  '<th className="p-2 min-w-[100px] bg-emerald-50 text-right font-bold text-emerald-900">Total PI Done (IR)</th>\n                  <th className="p-2 min-w-[100px] bg-cyan-50 text-right font-bold text-cyan-900">Total MRHOV Done</th>'
);

// 2. Add mhrovQty calc
code = code.replace(
  'const piQty = r.inwardSolan || r.inwardNahan || r.inwardRampur || r.inwardRohru || r.inward?.solan || r.inward?.nahan || r.inward?.rampur || r.inward?.rohru || 0;',
  'const piQty = r.inwardSolan || r.inwardNahan || r.inwardRampur || r.inwardRohru || r.inward?.solan || r.inward?.nahan || r.inward?.rampur || r.inward?.rohru || 0;\n                    const mhrovQty = r.mhrovSolan || r.mhrovNahan || r.mhrovRampur || r.mhrovRohru || r.mhrov?.solan || r.mhrov?.nahan || r.mhrov?.rampur || r.mhrov?.rohru || 0;'
);

// 3. Add column to tbody
code = code.replace(
  '<td className="p-2 text-right text-emerald-900 font-medium bg-emerald-50/20">{piQty || \'-\'}</td>\n                      </tr>',
  '<td className="p-2 text-right text-emerald-900 font-medium bg-emerald-50/20">{piQty || \'-\'}</td>\n                        <td className="p-2 text-right text-cyan-900 font-medium bg-cyan-50/20">{mhrovQty || \'-\'}</td>\n                      </tr>'
);

// 4. Add variable to tfoot
code = code.replace(
  'let totalPi = 0;',
  'let totalPi = 0;\n                  let totalMhrov = 0;'
);

// 5. Add accumulator to tfoot
code = code.replace(
  'totalPi += (r.inwardSolan || r.inwardNahan || r.inwardRampur || r.inwardRohru || r.inward?.solan || r.inward?.nahan || r.inward?.rampur || r.inward?.rohru || 0);\n                  });',
  'totalPi += (r.inwardSolan || r.inwardNahan || r.inwardRampur || r.inwardRohru || r.inward?.solan || r.inward?.nahan || r.inward?.rampur || r.inward?.rohru || 0);\n                    totalMhrov += (r.mhrovSolan || r.mhrovNahan || r.mhrovRampur || r.mhrovRohru || r.mhrov?.solan || r.mhrov?.nahan || r.mhrov?.rampur || r.mhrov?.rohru || 0);\n                  });'
);

// 6. Add column to tfoot
code = code.replace(
  '<td className="p-2 text-right text-emerald-300">{totalPi}</td>\n                    </tr>',
  '<td className="p-2 text-right text-emerald-300">{totalPi}</td>\n                      <td className="p-2 text-right text-cyan-300">{totalMhrov}</td>\n                    </tr>'
);

fs.writeFileSync(file, code);
console.log('Successfully patched page.tsx for MRHOV.');
