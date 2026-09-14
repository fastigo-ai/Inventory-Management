const metaRows = { 7: "Contractor", 0: "Circle" };
const rows = [
  [null, "Name Of Circle :", null, "Solan", "Solan", "Solan", "Solan"],
  [null, "Name Of Division :", null, "Nalagarh", "Nalagarh", "Nalagarh", "Nalagarh"],
  [null, "Name Of Sub/Division :", null, "Nand", "Ramsahar", "Ramsahar", "Ramsahar"],
  [null, "Name Of Sub/Station :", null, null, null, null, null],
  [null, "Name Of Feeder :", null, null, null, null, null],
  [null, "Location", null, "Barohi", "Andrar", "Banli ", "Nand"],
  [null, "Drawing No.", null, null, null, null, null],
  [null, "Name of Contractor", null, "A.R.Electrical Enterprises", null, null, null],
  ["LOA SR. NO", "DISCRIPTION", "UNIT", "WIP-Cons", "WIP-Cons", "WIP-Cons", "WIP-Cons"]
];

let headerRowIdx = 8;
let startSiteCol = 3;
const siteCols = [3, 4, 5, 6];

const globalMeta = {};
for (const [rIdxStr, field] of Object.entries(metaRows)) {
  const rIdx = Number(rIdxStr);
  const rowData = rows[rIdx];
  let foundLabel = false;
  let val = null;
  for (let i = 0; i < rowData.length; i++) {
    const cell = rowData[i];
    if (cell !== null && cell !== undefined && String(cell).trim() !== '') {
      const strCell = String(cell).trim();
      if (!foundLabel) {
        foundLabel = true;
        if (strCell.includes(':')) {
          const parts = strCell.split(':');
          if (parts.length > 1 && parts[1].trim() !== '') {
            val = parts.slice(1).join(':').trim();
            break;
          }
        } else {
          const lower = strCell.toLowerCase();
          if (field === 'Contractor' && lower.includes('agency')) {
             const potentialVal = strCell.substring(lower.indexOf('agency') + 6).replace(/^[^a-zA-Z0-9]+/, '').trim();
             if (potentialVal) { val = potentialVal; break; }
          } else if (field === 'Contractor' && lower.includes('contractor')) {
             const potentialVal = strCell.substring(lower.indexOf('contractor') + 10).replace(/^[^a-zA-Z0-9]+/, '').trim();
             if (potentialVal) { val = potentialVal; break; }
          } else if (field === 'Circle' && lower.includes('circle')) {
             const potentialVal = strCell.substring(lower.indexOf('circle') + 6).replace(/^[^a-zA-Z0-9]+/, '').trim();
             if (potentialVal) { val = potentialVal; break; }
          }
        }
      } else {
        val = cell;
        break;
      }
    }
  }
  globalMeta[field] = val;
}

const siteMeta = {};
for (const c of siteCols) {
  const d = { ...globalMeta };
  for (const [rIdxStr, field] of Object.entries(metaRows)) {
    const rIdx = Number(rIdxStr);
    let cellVal = rows[rIdx][c];
    if (cellVal === null || cellVal === undefined || String(cellVal).trim() === '') {
      for (let left = c - 1; left >= startSiteCol; left--) {
        const leftVal = rows[rIdx][left];
        if (leftVal !== null && leftVal !== undefined && String(leftVal).trim() !== '') {
          cellVal = leftVal;
          break;
        }
      }
    }
    if (cellVal !== null && cellVal !== undefined && String(cellVal).trim() !== '') {
      d[field] = cellVal;
    }
  }
  siteMeta[c] = d;
}

console.log(JSON.stringify(siteMeta, null, 2));
