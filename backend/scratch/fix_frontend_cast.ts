import fs from 'fs';
import path from 'path';

const files = [
  '../../frontend/src/app/pm-portal/demand-notes/[id]/page.tsx',
  '../../frontend/src/app/pd-portal/demand-notes/[id]/page.tsx',
  '../../frontend/src/app/site-portal/demand-notes/[id]/page.tsx',
  '../../frontend/src/app/store/demand-notes/[id]/page.tsx'
];

for (const rel of files) {
  const file = path.join(__dirname, rel);
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(
      "const actKey = `${(item.tempCode || item.materialCode || '').trim().toLowerCase()}_${(item.activity || '').trim().toLowerCase()}_${(item.loaSrNo || item.loaSerialNo || '').trim().toLowerCase()}`;",
      "const actKey = `${String(item.tempCode || item.materialCode || '').trim().toLowerCase()}_${String(item.activity || '').trim().toLowerCase()}_${String(item.loaSrNo || item.loaSerialNo || '').trim().toLowerCase()}`;"
    );
    fs.writeFileSync(file, content);
  }
}
console.log("Frontend cast fixed");
