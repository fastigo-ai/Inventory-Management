const fs = require('fs');
let lines = fs.readFileSync('backend/src/modules/di/di.controller.ts', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('n.replace(/[.*+?^${}()|')) {
    console.log("Found line:", lines[i]);
    lines[i] = "      const names = Array.from(itemNames).map(n => new RegExp(`^${n.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}$`, 'i'));";
    console.log("Replaced with:", lines[i]);
  }
}

fs.writeFileSync('backend/src/modules/di/di.controller.ts', lines.join('\n'));
