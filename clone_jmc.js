const fs = require('fs');
const path = require('path');

const srcDir = 'frontend/src/app/site-portal/jmc-register';
const destDir = 'frontend/src/app/site-portal/wip-register';
const srcIdDir = path.join(srcDir, '[id]');
const destIdDir = path.join(destDir, '[id]');

fs.mkdirSync(destDir, { recursive: true });
fs.mkdirSync(destIdDir, { recursive: true });

function processFile(srcFile, destFile) {
  let content = fs.readFileSync(srcFile, 'utf8');
  content = content.replace(/Jmc/g, 'Wip')
                   .replace(/jmc/g, 'wip')
                   .replace(/JMC/g, 'WIP');
  fs.writeFileSync(destFile, content);
}

processFile(path.join(srcDir, 'page.tsx'), path.join(destDir, 'page.tsx'));
processFile(path.join(srcDir, 'new/page.tsx'), path.join(destDir, 'new/page.tsx'));
processFile(path.join(srcIdDir, 'page.tsx'), path.join(destIdDir, 'page.tsx'));
console.log('Frontend WIP Register pages updated.');
