const fs = require('fs');
const file = 'src/modules/reports/summary/summary.controller.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "const groupKey = `${pkgVal ? pkgVal + '___' : ''}${circleVal ? circleVal + '___' : ''}${loaSrNo}`;",
  "const groupKey = `${pkgVal ? pkgVal + '___' : ''}${loaSrNo}`;"
);

code = code.replace(
  "if (tc) tempCodeToKeyMap.set(`${pkgVal ? pkgVal + '___' : ''}${circleVal ? circleVal + '___' : ''}${tc}`, groupKey);",
  "if (tc) tempCodeToKeyMap.set(`${pkgVal ? pkgVal + '___' : ''}${tc}`, groupKey);\n    if (tc) tempCodeToKeyMap.set(`${pkgVal ? pkgVal + '___' : ''}${circleVal ? circleVal + '___' : ''}${tc}`, groupKey);"
);

code = code.replace(
  "if (!grp.unit && unit) grp.unit = unit;",
  "if (!grp.unit && unit) grp.unit = unit;\n    if (circleVal && !grp.circle.toLowerCase().includes(circleVal.toLowerCase())) {\n      grp.circle += `, ${circleVal}`;\n    }"
);

fs.writeFileSync(file, code);
console.log('patched');
