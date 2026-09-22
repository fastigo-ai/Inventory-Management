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
      "getContractorActivitySummary(contractorId)",
      "contractorId ? getContractorActivitySummary(contractorId) : Promise.resolve({ data: {} })"
    );
    fs.writeFileSync(file, content);
  }
}
console.log("Frontend fetch fixed");
