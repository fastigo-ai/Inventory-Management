const fs = require('fs');
const file = 'src/modules/reports/summary/summary.controller.ts';
const code = fs.readFileSync(file, 'utf8');

const lines = code.split('\n');
let start = -1;
let end = -1;
let braces = 0;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('async function computeItemMatrixSummary')) {
    start = i;
  }
  if (start !== -1) {
    braces += (lines[i].match(/{/g) || []).length;
    braces -= (lines[i].match(/}/g) || []).length;
    if (braces === 0) {
      end = i;
      break;
    }
  }
}

fs.writeFileSync('compute.js', lines.slice(start, end + 1).join('\n'));
console.log('saved');
