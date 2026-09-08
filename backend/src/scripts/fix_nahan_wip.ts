import mongoose from 'mongoose';
import * as xlsx from 'xlsx';
import stringSimilarity from 'string-similarity';
import fs from 'fs';
import path from 'path';

// Import models
import { WipRegister } from '../modules/wip/wip.schema';
import { WipRequiredRegister } from '../modules/wip-required/wipRequired.schema';
import { Contractor } from '../modules/contractors/contractor.schema';
import Item from '../modules/items/item.model';
import User from '../modules/users/user.model';
import dotenv from 'dotenv';

dotenv.config();

const WIP_CONSUMED_DIR = 'C:/Users/sanjeet kumar/Desktop/WIP CONSUMED';
const WIP_REQUIRED_DIR = 'C:/Users/sanjeet kumar/Desktop/WIP TO BE REQUIRED';
const OUTPUT_CSV = 'C:/Users/sanjeet kumar/Desktop/MissingItems.csv';

function normLabel(v: any): string {
  if (!v) return '';
  return String(v).trim().replace(/:$/, '').trim().toLowerCase();
}

async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/erp-system';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');
}

async function processDirectory(dirPath: string, isRequired: boolean) {
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));
  
  const allContractors = await Contractor.find({}).lean();
  const contractorNames = allContractors.map((c: any) => c.name || c.dynamicData?.companyName || c.dynamicData?.displayName || c.dynamicData?.name).filter(Boolean);
  
  const allItems = await Item.find({}).lean();
  const itemNames = allItems.map((i: any) => i.dynamicData?.description || i.dynamicData?.name || '').filter(Boolean);

  let adminUser = await User.findOne({ 'role.name': 'Admin' });
  if (!adminUser) {
    adminUser = await User.findOne();
  }
  const userId = adminUser ? adminUser._id : new mongoose.Types.ObjectId();

  const modelToUse = isRequired ? WipRequiredRegister : WipRegister;
  const lastRecord = await modelToUse.findOne({}, isRequired ? { wipRequiredNumber: 1 } : { wipNumber: 1 }).sort(isRequired ? { wipRequiredNumber: -1 } : { wipNumber: -1 });
  let initialCount = 0;
  if (lastRecord) {
    const numStr = isRequired ? lastRecord.wipRequiredNumber : lastRecord.wipNumber;
    if (numStr) {
      const parts = numStr.split('/');
      if (parts.length === 3) {
        initialCount = parseInt(parts[2], 10);
      }
    }
  }
  if (isNaN(initialCount)) initialCount = await modelToUse.countDocuments();

  
  // Keep track of missing items for CSV
  const missingItems: any[] = [];
  let totalSaved = 0;

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    console.log(`Processing file: ${file}`);
    
    try {
      const workbook = xlsx.readFile(filePath);
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: null });
        
        if (!rows || rows.length < 2) continue;
        
        const metaRows: Record<number, string> = {};
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
                if (norm.includes("circle")) field = "Circle";
                else if (norm.includes("division") && !norm.includes("sub")) field = "Division";
                else if (norm.includes("sub") && (norm.includes("div") || norm.includes("division"))) field = "SubDivision";
                else if (norm.includes("sub") && (norm.includes("station") || norm.includes("stn"))) field = "SubStation";
                else if (norm.includes("feeder")) field = "Feeder";
                else if (norm.includes("location") || norm.includes("site")) field = "Location";
                else if (norm.includes("drawing")) field = "DrawingNo";
                else if (norm.includes("contractor") || norm.includes("agency") || norm.includes("name of contractor")) field = "Contractor";
                
                if (field) {
                  metaRows[r] = field;
                  labelFound = true;
                  break;
                }
             }
             if (labelFound) break;
          }
          let isHeader = false;
          for (let c = 0; c < row.length; c++) {
            const h = normLabel(row[c]);
            if (h && (h.includes("loa") || h.includes("code") || h.includes("temp") || h.includes("sched") || h.includes("activity") || h.includes("desc") || h.includes("unit") || h.includes("sr no") || h.includes("sr.") || h.includes("s.no") || h.includes("item") || h.includes("qty") || h.includes("quantity"))) {
              isHeader = true;
              break;
            }
          }
          if (isHeader) {
            headerRowIdx = r;
            break;
          }
        }

        if (headerRowIdx === -1) {
          console.log(`Failed to find header row in sheet ${sheetName}`);
          continue;
        }

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
        if (startSiteCol <= 0) {
          startSiteCol = 5;
          loaIdx = 0; schedIdx = 1; activityIdx = 2; descIdx = 3; unitIdx = 4;
        }

        const siteCols: number[] = [];
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

        const siteMeta: Record<number, any> = {};
        for (const c of siteCols) {
          const d: any = {};
          for (const [rIdx, field] of Object.entries(metaRows)) {
            d[field] = rows[Number(rIdx)][c];
          }
          siteMeta[c] = d;
        }

        const recordsBySite: Record<number, any[]> = {};
        for (const c of siteCols) {
          recordsBySite[c] = [];
        }

        let currentActivityGroup = '';
        
        for (let r = headerRowIdx + 1; r < rows.length; r++) {
          const row = rows[r];
          if (!row) continue;
          
          const loa = loaIdx !== -1 ? row[loaIdx] : null;
          const tempCodeVal = tempCodeIdx !== -1 ? row[tempCodeIdx] : null;
          const sched = schedIdx !== -1 ? row[schedIdx] : null;
          const activity = activityIdx !== -1 ? row[activityIdx] : null;
          const desc = descIdx !== -1 ? row[descIdx] : null;
          const unit = unitIdx !== -1 ? row[unitIdx] : null;
          
          if (!loa && !tempCodeVal && !sched && !activity && !desc) continue;
          
          if (!unit || String(unit).trim() === '') {
            if (desc) currentActivityGroup = String(desc).trim();
          }
          
          for (const c of siteCols) {
            const qty = row[c];
            if (qty === null || qty === undefined || qty === "") continue;
            
            const numQty = parseFloat(qty);
            if (!isNaN(numQty)) {
              recordsBySite[c].push({
                loa, tempCode: tempCodeVal, sched, activity: activity || currentActivityGroup, description: desc || activity, unit, quantity: numQty
              });
            }
          }
        }

        const sheetWipsToCreate: any[] = [];

        for (const c of siteCols) {
          const siteRecords = recordsBySite[c];
          if (siteRecords.length === 0) continue;

          const meta = siteMeta[c];
          let contractorId = null;
          const contractorNameStr = meta.Contractor ? String(meta.Contractor) : "";
          if (contractorNameStr && contractorNames.length > 0) {
            const bestMatch = stringSimilarity.findBestMatch(contractorNameStr, contractorNames);
            if (bestMatch.bestMatch.rating > 0.4) {
              const matchedContractor = allContractors.find((c: any) => {
                const name = c.name || c.dynamicData?.companyName || c.dynamicData?.displayName || c.dynamicData?.name;
                return name === bestMatch.bestMatch.target;
              });
              if (matchedContractor) contractorId = matchedContractor._id;
            }
          }

          if (!contractorId) {
            const fallbackName = contractorNameStr || 'Unknown Contractor (Auto-created)';
            let newContractor = allContractors.find((c: any) => {
              const name = c.name || c.dynamicData?.companyName || c.dynamicData?.displayName || c.dynamicData?.name;
              return name === fallbackName;
            });
            if (!newContractor) {
              newContractor = await Contractor.create({ 
                dynamicData: { companyName: fallbackName, name: fallbackName, vendorName: fallbackName },
                isActive: true
              });
              allContractors.push(newContractor as any);
              contractorNames.push(fallbackName);
            }
            contractorId = newContractor._id;
          }
          
          const wipItems = [];
          for (const sr of siteRecords) {
            let itemId = null;
            let finalActivity = sr.activity || '';
            let finalLoaSerialNo = sr.loa || '';
            let finalTempCode = sr.tempCode || '';

            if (sr.loa && allItems.length > 0) {
              const matchedItem = allItems.find((i: any) => String(i.dynamicData?.sku) === String(sr.loa));
              if (matchedItem) {
                itemId = matchedItem._id;
                if (!finalActivity && matchedItem.dynamicData?.activity) finalActivity = matchedItem.dynamicData.activity;
              }
            }
            if (!itemId && sr.tempCode && allItems.length > 0) {
              const matchedItem = allItems.find((i: any) => String(i.dynamicData?.tempCode) === String(sr.tempCode));
              if (matchedItem) {
                itemId = matchedItem._id;
                if (!finalActivity && matchedItem.dynamicData?.activity) finalActivity = matchedItem.dynamicData.activity;
              }
            }
            if (!itemId && sr.description && itemNames.length > 0) {
              const bestMatch = stringSimilarity.findBestMatch(String(sr.description), itemNames);
              if (bestMatch.bestMatch.rating > 0.6) {
                const matchedItem = allItems.find((i: any) => {
                  const desc = String(i.dynamicData?.description || i.dynamicData?.name || '');
                  return desc === bestMatch.bestMatch.target;
                });
                if (matchedItem) {
                  itemId = matchedItem._id;
                  if (!finalActivity && matchedItem.dynamicData?.activity) finalActivity = matchedItem.dynamicData.activity;
                  if (!finalLoaSerialNo && matchedItem.dynamicData?.sku) finalLoaSerialNo = matchedItem.dynamicData.sku;
                  if (!finalTempCode && matchedItem.dynamicData?.tempCode) finalTempCode = matchedItem.dynamicData.tempCode;
                }
              }
            }

            if (!itemId) {
              missingItems.push({
                File: file,
                Sheet: sheetName,
                Description: sr.description,
                LOA: sr.loa,
                TempCode: sr.tempCode
              });
            }

            wipItems.push({
              itemId: itemId || undefined,
              loaSerialNo: finalLoaSerialNo,
              tempCode: finalTempCode,
              activity: finalActivity,
              description: sr.description || '',
              unit: sr.unit || '',
              prevQty: 0,
              claimedQty: sr.quantity,
              approvedQty: 0,
              remarks: ''
            });
          }

          if (wipItems.length === 0) continue;

          initialCount++;
          const wipNumber = `WIP/${new Date().getFullYear().toString().slice(-2)}/${initialCount.toString().padStart(4, '0')}`;

          const payload: any = {
            date: new Date(),
            contractorId: contractorId,
            package: meta.Location || meta.DrawingNo || '',
            circle: meta.Circle || 'NAHAN', // Enforce Nahan
            division: meta.Division || 'NAHAN', // Enforce Nahan
            subDivision: meta.SubDivision || '',
            items: wipItems,
            claimedAmount: 0,
            approvedAmount: 0,
            status: 'Submitted',
            remarks: `Uploaded from ${file} (${sheetName}).`,
            createdBy: userId
          };

          if (isRequired) {
             payload.wipRequiredNumber = wipNumber;
          } else {
             payload.wipNumber = wipNumber;
          }

          sheetWipsToCreate.push(payload);
        }

        if (sheetWipsToCreate.length > 0) {
          await modelToUse.insertMany(sheetWipsToCreate);
          totalSaved += sheetWipsToCreate.length;
        }
      }
    } catch (e: any) {
      console.error(`Error processing file ${file}:`, e.message);
    }
  }

  return { totalSaved, missingItems };
}

async function main() {
  await connectDB();
  
  // 1. Delete all WIP Records for Nahan division
  console.log('Deleting existing WIP Consumed records for Nahan division...');
  const delConsumed = await WipRegister.deleteMany({ division: /NAHAN/i });
  console.log(`Deleted ${delConsumed.deletedCount} WIP Consumed records.`);

  console.log('Deleting existing WIP Required records for Nahan division...');
  const delRequired = await WipRequiredRegister.deleteMany({ division: /NAHAN/i });
  console.log(`Deleted ${delRequired.deletedCount} WIP Required records.`);

  // 2. Process WIP Consumed
  console.log('Processing WIP Consumed directory...');
  const consumedResults = await processDirectory(WIP_CONSUMED_DIR, false);
  console.log(`Saved ${consumedResults.totalSaved} WIP Consumed records.`);

  // 3. Process WIP Required
  console.log('Processing WIP Required directory...');
  const requiredResults = await processDirectory(WIP_REQUIRED_DIR, true);
  console.log(`Saved ${requiredResults.totalSaved} WIP Required records.`);

  // 4. Save missing items to CSV
  const allMissingItems = [...consumedResults.missingItems, ...requiredResults.missingItems];
  
  // Deduplicate by Description
  const uniqueMissing = Array.from(new Map(allMissingItems.map(item => [item.Description, item])).values());
  
  if (uniqueMissing.length > 0) {
    const csvHeader = 'File,Sheet,Description,LOA,TempCode\n';
    const csvContent = uniqueMissing.map(item => `"${item.File}","${item.Sheet}","${(item.Description || '').replace(/"/g, '""')}","${item.LOA || ''}","${item.TempCode || ''}"`).join('\n');
    fs.writeFileSync(OUTPUT_CSV, csvHeader + csvContent);
    console.log(`Saved ${uniqueMissing.length} unique missing items to ${OUTPUT_CSV}`);
  } else {
    console.log('No missing items found.');
  }

  console.log('Done.');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
