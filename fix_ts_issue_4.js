const fs = require('fs');
const path = 'frontend/src/app/store/contractor-issue/[id]/edit/page.tsx';
let content = fs.readFileSync(path, 'utf-8');

content = content.replace(/group\.sort\(\(a, b\) => \{/g, 'group.sort((a: any, b: any) => {');

fs.writeFileSync(path, content, 'utf-8');
