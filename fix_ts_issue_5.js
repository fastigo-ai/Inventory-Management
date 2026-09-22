const fs = require('fs');
const path = 'frontend/src/app/store/contractor-issue/[id]/edit/page.tsx';
let content = fs.readFileSync(path, 'utf-8');

content = content.replace(/\{items\.map\(\(\{ item, originalIndex \}\) => \(/g, '{(items as any[]).map(({ item, originalIndex }) => (');

fs.writeFileSync(path, content, 'utf-8');
