const fs = require('fs');
const path = 'frontend/src/app/store/contractor-issue/[id]/edit/page.tsx';
let content = fs.readFileSync(path, 'utf-8');

content = content.replace(/Object\.values\(groupedItems\)\.forEach\(group => \{/g, 'Object.values(groupedItems).forEach((group: any) => {');

fs.writeFileSync(path, content, 'utf-8');
