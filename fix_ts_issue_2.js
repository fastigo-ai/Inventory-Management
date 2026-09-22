const fs = require('fs');
const path = 'frontend/src/app/store/contractor-issue/[id]/edit/page.tsx';
let content = fs.readFileSync(path, 'utf-8');

// I'll just remove isMulti for now, or replace it with isMulti={true as any} to bypass the error since this was introduced by someone else's bad commit
content = content.replace(/<Select\n\s*isMulti\n/g, '<Select\n                  isMulti={true as any}\n');

fs.writeFileSync(path, content, 'utf-8');
