const fs = require('fs');
let content = fs.readFileSync('backend/src/modules/client-billing/clientBill.controller.ts', 'utf8');

const regex = /const rows = xlsx\.utils\.sheet_to_json<any>\(worksheet\);\s*const uniqueDiNos = \[\.\.\.new Set\(rows\.map\(r => String\(r\.dino \|\| r\.dinumber \|\| ''\)\.trim\(\)\)\.filter\(Boolean\)\)\];\s*const uniqueMhrovNos = \[\.\.\.new Set\(rows\.map\(r => String\(r\.mhrovno \|\| r\.mhrovnumber \|\| r\.sourceref \|\| ''\)\.trim\(\)\)\.filter\(Boolean\)\)\];\s*const allItems = await Item\.find\(\{\}\)\.lean\(\);\s*const allDIs = await DI\.find\(\{ diNumber: \{ \$in: uniqueDiNos \} \}\)\.lean\(\);\s*const allMhrovs = await Mhrov\.find\(\{ mhrovNumber: \{ \$in: uniqueMhrovNos \} \}\)\.lean\(\);\s*\/\/ Group rows by RA Bill No\s*const billGroups: Record<string, any\[\]> = \{\};\s*for \(const row of rows\) \{\s*\/\/ Normalize keys\s*const rawRow: any = \{\};\s*for \(const key of Object\.keys\(row\)\) \{\s*rawRow\[key\.trim\(\)\.toLowerCase\(\)\.replace\(\/\[\^a-z0-9\]\/g, ''\)\] = row\[key\];\s*\}\s*const raBillNo = String\(rawRow\.rabillno \|\| rawRow\.rabillnumber \|\| ''\)\.trim\(\);\s*if \(!raBillNo \|\| raBillNo === 'undefined'\) continue; \/\/ Skip empty rows\s*if \(!billGroups\[raBillNo\]\) billGroups\[raBillNo\] = \[\];\s*billGroups\[raBillNo\]\.push\(rawRow\);\s*\}/g;

const replacement = `const rows = xlsx.utils.sheet_to_json<any>(worksheet);

  // Normalize all rows first so we can extract keys reliably
  const normalizedRows = rows.map(row => {
    const rawRow: any = {};
    for (const key of Object.keys(row)) {
       rawRow[key.trim().toLowerCase().replace(/[^a-z0-9]/g, '')] = row[key];
    }
    return rawRow;
  });

  const uniqueDiNos = [...new Set(normalizedRows.map(r => String(r.dino || r.dinumber || '').trim()).filter(Boolean))];
  const uniqueMhrovNos = [...new Set(normalizedRows.map(r => String(r.mhrovno || r.mhrovnumber || r.sourceref || '').trim()).filter(Boolean))];
  
  const allItems = await Item.find({}).lean();
  const allDIs = await DI.find({ diNumber: { $in: uniqueDiNos } }).lean();
  const allMhrovs = await Mhrov.find({ mhrovNumber: { $in: uniqueMhrovNos } }).lean();

  
  // Group rows by RA Bill No
  const billGroups: Record<string, any[]> = {};
  
  for (const rawRow of normalizedRows) {
    const raBillNo = String(rawRow.rabillno || rawRow.rabillnumber || '').trim();
    if (!raBillNo || raBillNo === 'undefined') continue; // Skip empty rows
    
    if (!billGroups[raBillNo]) billGroups[raBillNo] = [];
    billGroups[raBillNo].push(rawRow);
  }`;

content = content.replace(regex, replacement);
fs.writeFileSync('backend/src/modules/client-billing/clientBill.controller.ts', content);
