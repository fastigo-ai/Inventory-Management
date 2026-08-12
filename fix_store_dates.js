const fs = require('fs');

let content = fs.readFileSync('backend/src/modules/store/store.controller.ts', 'utf8');

const parseCsvDate = `const parseCsvDate = (dateStr: string): Date | undefined => {
  if (!dateStr) return undefined;
  let d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) {
    const parts = dateStr.split(/[-/.]/);
    if (parts.length === 3) {
      if (parts[2].length === 4) d = new Date(\`\${parts[2]}-\${parts[1]}-\${parts[0]}\`);
      else if (parts[2].length === 2) d = new Date(\`20\${parts[2]}-\${parts[1]}-\${parts[0]}\`);
    }
  }
  return Number.isNaN(d.getTime()) ? undefined : d;
};

`;

content = content.replace('export const importStoreTransfers', parseCsvDate + 'export const importStoreTransfers');

// Replace date parsings
content = content.replace(/new Date\(row\['Date'\]\)/g, "parseCsvDate(row['Date'])");
content = content.replace(/new Date\(row\['Date of Received'\]\)/g, "parseCsvDate(row['Date of Received'])");
content = content.replace(/new Date\(row\['MIN Date'\]\)/g, "parseCsvDate(row['MIN Date'])");
content = content.replace(/new Date\(row\['Challan Date'\]\)/g, "parseCsvDate(row['Challan Date'])");
// And replace fallback new Date() for requestDate to just not fallback if parseCsvDate is used, or maybe:
// row['Date'] ? new Date(row['Date']) : new Date() -> parseCsvDate(row['Date']) || new Date()
content = content.replace(/row\['Date'\] \? parseCsvDate\(row\['Date'\]\) : new Date\(\)/g, "parseCsvDate(row['Date']) || new Date()");
content = content.replace(/row\['Date of Received'\] \? parseCsvDate\(row\['Date of Received'\]\) : new Date\(\)/g, "parseCsvDate(row['Date of Received']) || new Date()");

// Some of them are just minDate: row['MIN Date'] ? new Date(row['MIN Date']) : undefined ->
content = content.replace(/row\['MIN Date'\] \? parseCsvDate\(row\['MIN Date'\]\) : undefined/g, "parseCsvDate(row['MIN Date'])");
content = content.replace(/row\['Challan Date'\] \? parseCsvDate\(row\['Challan Date'\]\) : undefined/g, "parseCsvDate(row['Challan Date'])");

fs.writeFileSync('backend/src/modules/store/store.controller.ts', content);
