const fs = require('fs');
let lines = fs.readFileSync('src/modules/di/di.controller.ts', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const s = search.toString();')) {
    lines.splice(i + 1, 0, "    const escapedS = s.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');");
    break;
  }
}

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("new RegExp(s, 'i')")) {
    lines[i] = lines[i].replace(/new RegExp\(s, 'i'\)/g, "new RegExp(escapedS, 'i')");
  }
}

fs.writeFileSync('src/modules/di/di.controller.ts', lines.join('\n'));
