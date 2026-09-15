import fs from 'fs';
import path from 'path';

async function check() {
  const dir = path.join(__dirname, '../../../../');
  // Just check any CSV file in desktop related to this to see the columns
  const files = fs.readdirSync(dir);
  for (const f of files) {
    if (f.endsWith('.csv')) {
      const content = fs.readFileSync(path.join(dir, f), 'utf-8');
      console.log(f, content.split('\n')[0].trim());
    }
  }
}
check();
