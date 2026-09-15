import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import connectDB from '../core/database';
import { JmcRegister } from '../modules/jmc/jmc.schema';
import { Contractor } from '../modules/contractors/contractor.schema';
import * as xlsx from 'xlsx';

function normalizeStr(str: any) {
    if (str === null || str === undefined) return '';
    return String(str).toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

const findMissingJmcs = async () => {
  try {
    await connectDB();
    console.log('Connected to DB');

    // 1. Fetch all JMCs for Nahan
    const dbJmcs = await JmcRegister.find({ circle: /nahan/i }).lean();
    console.log(`Total JMCs in DB for NAHAN: ${dbJmcs.length}`);

    const dbJmcKeys = new Set();
    let totalDbJmcs = 0;
    let totalDbQty = 0;

    for (const jmc of dbJmcs) {
        totalDbJmcs++;
        const subDiv = normalizeStr(jmc.subDivision);
        const loc = normalizeStr(jmc.location);
        const key = `${subDiv}|${loc}`;
        if (dbJmcKeys.has(key)) {
            // console.log(`Duplicate found in DB: ${key} (JMC: ${jmc.jmcNumber})`);
        }
        dbJmcKeys.add(key);

        if (jmc.items && Array.isArray(jmc.items)) {
            for (const item of jmc.items) {
                totalDbQty += (Number(item.claimedQty) || 0);
            }
        }
    }
    
    console.log(`Total DB JMCs: ${totalDbJmcs}`);
    console.log(`Unique DB Keys: ${dbJmcKeys.size}`);
    console.log(`Total DB Claimed Quantity: ${totalDbQty}`);
    
    // 2. Parse JMC PORTAL.xlsx
    const file1Path = 'c:\\Users\\sanjeet kumar\\Desktop\\JMC PORTAL.xlsx';
    console.log(`\nParsing Excel file...`);
    const workbook = xlsx.readFile(file1Path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: null });

    const metaMap: Record<string, number> = {};
    for (let r = 0; r < 20; r++) {
        const row = rows[r] || [];
        let labelName = '';
        for (let c = 0; c < 5; c++) {
            if (row[c]) {
                const norm = normalizeStr(row[c]);
                if (norm.includes('circle') && !norm.includes('sub')) labelName = 'Circle';
                else if (norm.includes('division') && !norm.includes('sub')) labelName = 'Division';
                else if (norm.includes('sub') && (norm.includes('div') || norm.includes('division'))) labelName = 'SubDivision';
                else if (norm.includes('sub') && (norm.includes('station') || norm.includes('stn'))) labelName = 'SubStation';
                else if (norm.includes('feeder')) labelName = 'Feeder';
                else if (norm.includes('location') || norm.includes('site')) labelName = 'Location';
                else if (norm.includes('contractor') || norm.includes('agency')) labelName = 'Contractor';
                if (labelName) break;
            }
        }
        if (labelName) metaMap[labelName] = r;
    }

    const excelJmcGroups: Record<string, any[]> = {};
    const missingJmcs = [];
    let totalExcelJmcs = 0;
    let totalExcelQty = 0;

    let startSiteCol = 3; 
    const maxCols = rows[10] ? rows[10].length : 450;

    for (let c = startSiteCol; c < maxCols; c++) {
        const siteMeta: Record<string, string> = {};
        let hasData = false;

        for (const [key, rIdx] of Object.entries(metaMap)) {
            let val = rows[rIdx][c];
            if (!val || String(val).trim() === '') {
                for (let left = c - 1; left >= startSiteCol; left--) {
                    if (rows[rIdx][left] && String(rows[rIdx][left]).trim() !== '') {
                        val = rows[rIdx][left];
                        break;
                    }
                }
            }
            if (val) {
                siteMeta[key] = String(val).trim();
                hasData = true;
            }
        }

        if (!hasData) continue;
        
        const circle = normalizeStr(siteMeta['Circle']);
        if (!circle.includes('nahan')) continue; 
        
        totalExcelJmcs++;

        // Calculate quantity for this column
        for (let r = 12; r < rows.length; r++) {
            if (rows[r] && rows[r][c] !== null && rows[r][c] !== undefined && rows[r][c] !== '') {
                const val = Number(rows[r][c]);
                if (!isNaN(val)) {
                    totalExcelQty += val;
                }
            }
        }

        const subDiv = normalizeStr(siteMeta['SubDivision']);
        const loc = normalizeStr(siteMeta['Location']);
        const key = `${subDiv}|${loc}`;
        
        if (!excelJmcGroups[key]) {
             excelJmcGroups[key] = [];
        }
        excelJmcGroups[key].push({
            col: c,
            subDiv: siteMeta['SubDivision'],
            subStn: siteMeta['SubStation'],
            loc: siteMeta['Location'],
            contractor: siteMeta['Contractor']
        });
    }

    console.log(`\n--- MERGED COLUMNS (Duplicates in Excel) ---`);
    for (const [key, group] of Object.entries(excelJmcGroups)) {
        if (group.length > 1) {
            console.log(`Key: ${key}`);
            group.forEach(g => {
                console.log(`  -> Col ${g.col}: SubStn: ${g.subStn || 'None'}, Loc: ${g.loc}`);
            });
        }
    }

    console.log(`\nTotal Excel Columns: ${totalExcelJmcs}`);
    console.log(`Total Excel Quantity: ${totalExcelQty}`);
    console.log(`\nDifference in Total Quantity (Excel - DB): ${totalExcelQty - totalDbQty}`);

    process.exit(0);
  } catch (error) {
    console.error('Error finding missing JMCs:', error);
    process.exit(1);
  }
};

findMissingJmcs();
