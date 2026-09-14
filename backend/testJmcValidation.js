const mongoose = require('mongoose');
const xlsx = require('xlsx');
const fs = require('fs');
const stringSimilarity = require('string-similarity');

require('dotenv').config();

const { Contractor } = require('./src/modules/contractors/contractor.schema');
const Item = require('./src/modules/items/item.model').default;

const filePath = '/Users/Apple/Desktop/JMC PORTAL.xlsx';
const buffer = fs.readFileSync(filePath);

function normLabel(v) {
  if (!v) return "";
  return String(v).replace(/\s+/g, ' ').trim().replace(/:$/, "").trim().toLowerCase();
}

const workbook = xlsx.read(buffer, { type: 'buffer' });
const sourceFile = "JMC PORTAL.xlsx";
const parsedSheets = [];

for (const sheetName of workbook.SheetNames) {
  // (Paste the parsing logic from before...)
  const worksheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: null });

  const metaRows = {};
  let headerRowIdx = -1;

  for (let r = 0; r < Math.min(50, rows.length); r++) {
    const row = rows[r];
    if (!row) continue;
    let labelFound = false;
    for (let c = 0; c < 5; c++) {
      const cell = row[c];
      if (cell) {
        const norm = normLabel(cell);
        let field = null;
        if (norm.includes("circle") && !norm.includes("sub")) field = "Circle";
        else if (norm.includes("sub") && norm.includes("circle")) field = "SubCircle";
        else if (norm.includes("division") && !norm.includes("sub")) field = "Division";
        else if (norm.includes("sub") && (norm.includes("div") || norm.includes("division"))) field = "SubDivision";
        else if (norm.includes("sub") && (norm.includes("station") || norm.includes("stn"))) field = "SubStation";
        else if (norm.includes("feeder")) field = "Feeder";
        else if (norm.includes("location") || norm.includes("site")) field = "Location";
        else if (norm.includes("drawing")) field = "DrawingNo";
        else if (norm.includes("contractor") || norm.includes("agency")) field = "Contractor";
        else if (norm.includes("jmc number") || norm.includes("jmc no")) field = "JmcNumber";
        if (field) { metaRows[r] = field; labelFound = true; break; }
      }
      if (labelFound) break;
    }
    let isHeader = false, matchCount = 0;
    for (let c = 0; c < row.length; c++) {
      const h = normLabel(row[c]);
      if (h && (h.includes("loa") || h.includes("code") || h.includes("temp code") || h === "temp" || h.includes("sched") || h.includes("activity") || h === "description" || h.includes("desc") || h === "unit" || h.includes("sr no") || h.includes("sr.") || h.includes("s.no") || h.includes("item") || h.includes("qty") || h.includes("quantity"))) {
        matchCount++;
      }
    }
    if (matchCount >= 2) { headerRowIdx = r; break; }
  }

  if (headerRowIdx === -1) continue;
  
  const maxCol = rows.reduce((max, r) => Math.max(max, r.length), 0);
  const headerRow = rows[headerRowIdx];
  let loaIdx = -1, tempCodeIdx = -1, schedIdx = -1, activityIdx = -1, descIdx = -1, unitIdx = -1;

  for (let c = 0; c < headerRow.length; c++) {
    const h = normLabel(headerRow[c]);
    if (!h) continue;
    if (h.includes("loa") && loaIdx === -1) loaIdx = c;
    else if (h.includes("code") && tempCodeIdx === -1) tempCodeIdx = c;
    else if (h.includes("sched") && schedIdx === -1) schedIdx = c;
    else if (h.includes("activity") && activityIdx === -1) activityIdx = c;
    else if (h.includes("desc") && descIdx === -1) descIdx = c;
    else if (h.includes("unit") && unitIdx === -1) unitIdx = c;
  }

  let startSiteCol = Math.max(loaIdx, tempCodeIdx, schedIdx, activityIdx, descIdx, unitIdx) + 1;
  if (startSiteCol <= 0) { startSiteCol = 5; loaIdx = 0; schedIdx = 1; activityIdx = 2; descIdx = 3; unitIdx = 4; }

  const siteCols = [];
  for (let c = startSiteCol; c < maxCol; c++) {
    const headerVal = rows[headerRowIdx][c];
    const hasMeta = Object.keys(metaRows).some(rIdx => {
      const val = rows[Number(rIdx)][c];
      return val !== null && val !== undefined && val !== "";
    });
    if (hasMeta || (headerVal !== null && headerVal !== undefined && headerVal !== "")) {
      siteCols.push(c);
    }
  }

  const siteMeta = {}, recordsBySite = {};
  for (const c of siteCols) {
    siteMeta[c] = {};
    for (const [rIdx, field] of Object.entries(metaRows)) {
      const val = rows[Number(rIdx)][c];
      if (val !== null && val !== undefined) {
        siteMeta[c][field] = String(val).trim();
      }
    }
    recordsBySite[c] = [];
  }

  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    let hasData = false;
    const rowData = {};
    for (const c of siteCols) {
      const val = row[c];
      const parsedVal = Number(val);
      if (!isNaN(parsedVal) && parsedVal > 0) { hasData = true; rowData[c] = parsedVal; }
    }
    if (!hasData) continue;
    const loa = loaIdx !== -1 ? row[loaIdx] : null;
    const code = tempCodeIdx !== -1 ? row[tempCodeIdx] : null;
    const sched = schedIdx !== -1 ? row[schedIdx] : null;
    const act = activityIdx !== -1 ? row[activityIdx] : null;
    const desc = descIdx !== -1 ? row[descIdx] : null;
    const unit = unitIdx !== -1 ? row[unitIdx] : null;

    for (const c of siteCols) {
      if (rowData[c] !== undefined) {
        recordsBySite[c].push({
          loaSerialNo: loa ? String(loa).trim() : "",
          tempCode: code ? String(code).trim() : "",
          schedule: sched ? String(sched).trim() : "",
          activity: act ? String(act).trim() : "",
          description: desc ? String(desc).trim() : "",
          unit: unit ? String(unit).trim() : "",
          quantity: rowData[c]
        });
      }
    }
  }
  parsedSheets.push({ sourceFile, sheetName, siteCols, siteMeta, recordsBySite });
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to DB");

  const allContractors = await Contractor.find({}).lean();
  const contractorNames = allContractors.map((c) => c.name || c.dynamicData?.companyName || c.dynamicData?.displayName || c.dynamicData?.name).filter(Boolean);
  const allItems = await Item.find({}).lean();

  const validationErrors = [];

  const resolveItem = (sr, circle) => {
    let bestScore = 0;
    let bestMatch = null;
    
    // Exact matches
    if (sr.tempCode) {
      bestMatch = allItems.find(i => {
        const c = i.dynamicData?.circle || '';
        return i.itemCode === sr.tempCode && (!c || c.toLowerCase() === circle.toLowerCase());
      });
      if (bestMatch) return bestMatch;
    }
    
    if (sr.loaSerialNo) {
      bestMatch = allItems.find(i => {
        const loa = i.dynamicData?.loaSerialNo || i.dynamicData?.loaSrNo || i.dynamicData?.sku;
        const c = i.dynamicData?.circle || '';
        return loa === sr.loaSerialNo && (!c || c.toLowerCase() === circle.toLowerCase());
      });
      if (bestMatch) return bestMatch;
    }

    // Fuzzy match description if no exact match
    if (sr.description) {
      for (const item of allItems) {
        const c = item.dynamicData?.circle || '';
        if (c && circle && c.toLowerCase() !== circle.toLowerCase()) continue;
        
        const desc = item.description || item.dynamicData?.description || item.name || '';
        if (desc) {
          const sim = stringSimilarity.compareTwoStrings(sr.description.toLowerCase(), desc.toLowerCase());
          if (sim > bestScore && sim > 0.6) {
            bestScore = sim;
            bestMatch = item;
          }
        }
      }
    }
    
    return bestMatch;
  };

  for (const sheet of parsedSheets) {
    const { sourceFile, sheetName, siteCols, siteMeta, recordsBySite } = sheet;

    for (const c of siteCols) {
      const siteRecords = recordsBySite[c];
      if (siteRecords.length === 0) continue;

      const meta = siteMeta[c];
      const circ = meta.Circle || '';
      const subCirc = meta.SubCircle || '';
      const uploadedCircle = subCirc || circ;

      let contractorId = null;
      const contractorNameStr = meta.Contractor ? String(meta.Contractor) : "";
      if (contractorNameStr && contractorNames.length > 0) {
        const bestMatch = stringSimilarity.findBestMatch(contractorNameStr, contractorNames);
        if (bestMatch.bestMatch.rating > 0.4) {
          const matchedContractor = allContractors.find((c) => {
            const name = c.name || c.dynamicData?.companyName || c.dynamicData?.displayName || c.dynamicData?.name;
            return name === bestMatch.bestMatch.target;
          });
          if (matchedContractor) contractorId = matchedContractor._id;
        }
      }

      if (!contractorId) {
        validationErrors.push({ sourceFile, sheetName, description: `Contractor '${contractorNameStr}' not found in the database.`, circle: uploadedCircle });
        continue;
      }

      for (const sr of siteRecords) {
        const resolved = resolveItem(sr, uploadedCircle);
        if (!resolved) {
          validationErrors.push({
            sourceFile,
            sheetName,
            description: sr.description || sr.tempCode || sr.loaSerialNo || 'Unknown Item',
            circle: uploadedCircle
          });
        }
      }
    }
  }

  const uniqueErrors = validationErrors.filter((e, idx, arr) =>
    arr.findIndex(x => x.description === e.description && x.circle === e.circle) === idx
  );
  console.log(`Found ${uniqueErrors.length} validation errors.`);
  if (uniqueErrors.length > 0) {
    console.log("Top 5 errors:", uniqueErrors.slice(0, 5));
  }
  
  process.exit(0);
}

run();
