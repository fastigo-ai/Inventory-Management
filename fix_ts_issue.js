const fs = require('fs');
const path = 'frontend/src/app/store/contractor-issue/[id]/edit/page.tsx';
let content = fs.readFileSync(path, 'utf-8');

content = content.replace(/s\.activityDetailsMap\?\.\[activity\]/g, 's.activityDetailsMap?.[activity as string]');

fs.writeFileSync(path, content, 'utf-8');
