const xlsx = require('xlsx');

function normalizeStr(str) {
    if (str === null || str === undefined) return '';
    return String(str).toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

function parseFile(filePath, label) {
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });

    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(20, rows.length); i++) {
        const rowStr = (rows[i] || []).map(c => String(c || '').toLowerCase()).join(' ');
        if (rowStr.includes('description') || rowStr.includes('item') || rowStr.includes('temp code')) {
            headerRowIdx = i;
            break;
        }
    }

    const itemHeaders = rows[headerRowIdx];
    let loaIdx = -1;
    let descIdx = -1;
    for (let c = 0; c < itemHeaders.length; c++) {
        const h = normalizeStr(itemHeaders[c]);
        if (h.includes('loa') || h.includes('code')) loaIdx = c;
        if (h.includes('desc') || h.includes('disc')) descIdx = c;
    }

    let startSiteCol = Math.max(loaIdx, descIdx) + 1;
    if (startSiteCol <= 0) startSiteCol = 2;

    const metaMap = {};
    for (let r = 0; r < headerRowIdx; r++) {
        const row = rows[r] || [];
        let labelName = '';
        for (let c = 0; c < 5; c++) {
            if (row[c]) {
                const norm = normalizeStr(row[c]);
                if (norm.includes('circle') && !norm.includes('sub')) labelName = 'Circle';
                else if (norm.includes('division') && !norm.includes('sub')) labelName = 'Division';
                else if (norm.includes('sub') && (norm.includes('div') || norm.includes('division'))) labelName = 'SubDivision';
                else if (norm.includes('sub') && (norm.includes('station') || norm.includes('stn'))) labelName = 'SubStation';
                else if (norm.includes('location') || norm.includes('site')) labelName = 'Location';
                if (labelName) break;
            }
        }
        if (labelName) metaMap[labelName] = r;
    }

    const data = new Map();

    for (let c = startSiteCol; c < rows[headerRowIdx].length; c++) {
        const siteMeta = {};
        for (const [key, rIdx] of Object.entries(metaMap)) {
            let val = rows[rIdx][c];
            if (!val || String(val).trim() === '') {
                for (let left = c - 1; left >= startSiteCol; left--) { // Stop at startSiteCol to avoid picking up the labels
                    if (rows[rIdx][left] && String(rows[rIdx][left]).trim() !== '') {
                        val = rows[rIdx][left];
                        break;
                    }
                }
            }
            siteMeta[key] = val ? String(val).trim() : '';
        }

        const circle = normalizeStr(siteMeta['Circle']);
        // If we want to focus on Nahan, skip if circle doesn't include nahan
        if (!circle.includes('nahan')) continue;

        const division = normalizeStr(siteMeta['Division']);
        const subDivision = normalizeStr(siteMeta['SubDivision']);
        const subStation = normalizeStr(siteMeta['SubStation']);

        for (let r = headerRowIdx + 1; r < rows.length; r++) {
            const qty = rows[r][c];
            if (qty === null || qty === undefined || qty === '' || isNaN(parseFloat(qty)) || parseFloat(qty) === 0) continue;

            const loa = String(rows[r][loaIdx] || '').trim();
            const desc = String(rows[r][descIdx] || '').trim();
            if (!loa && !desc) continue;
            
            const itemKey = normalizeStr(loa) || normalizeStr(desc.substring(0, 30));
            const siteKey = `${circle}|${division}|${subDivision}|${subStation}|${itemKey}`;

            if (!data.has(siteKey)) {
                data.set(siteKey, { qty: 0, rawMeta: siteMeta, rawLoa: loa, rawDesc: desc });
            }
            data.get(siteKey).qty += parseFloat(qty);
        }
    }
    
    return data;
}

const dataImported = parseFile('c:\\Users\\sanjeet kumar\\Desktop\\JMC PORTAL.xlsx', 'JMC PORTAL');
const dataExported = parseFile('c:\\Users\\sanjeet kumar\\Desktop\\Jmc_Export.xlsx', 'Jmc_Export');

let exactMatches = 0;
const mismatchedQty = [];
const missingInExport = [];
const missingInImport = [];

for (const [key, importData] of dataImported.entries()) {
    if (!dataExported.has(key)) {
        missingInExport.push({ key, importQty: importData.qty, meta: importData.rawMeta, item: importData.rawDesc });
    } else {
        const exportData = dataExported.get(key);
        if (Math.abs(importData.qty - exportData.qty) > 0.01) {
            mismatchedQty.push({
                key,
                importQty: importData.qty,
                exportQty: exportData.qty,
                meta: importData.rawMeta,
                item: importData.rawDesc
            });
        } else {
            exactMatches++;
        }
    }
}

for (const [key, exportData] of dataExported.entries()) {
    if (!dataImported.has(key)) {
        missingInImport.push({ key, exportQty: exportData.qty, meta: exportData.rawMeta, item: exportData.rawDesc });
    }
}

console.log(`\n--- Comparison Results for NAHAN Circle ---`);
console.log(`Total items in Uploaded (Nahan): ${dataImported.size}`);
console.log(`Total items in Exported (Nahan): ${dataExported.size}`);
console.log(`Exact Matches: ${exactMatches}`);
console.log(`Mismatched Quantities: ${mismatchedQty.length}`);
console.log(`Missing in Export: ${missingInExport.length}`);
console.log(`Missing in Uploaded: ${missingInImport.length}`);

if (mismatchedQty.length > 0) {
    console.log(`\nSample Mismatched Quantities:`);
    mismatchedQty.slice(0, 10).forEach(m => {
        console.log(`- SubStation: ${m.meta.SubStation || m.meta.SubDivision} | Item: ${m.item.substring(0,40)} | Uploaded Qty: ${m.importQty} vs Exported Qty: ${m.exportQty}`);
    });
}

if (missingInExport.length > 0) {
    console.log(`\nSample Items in Uploaded but MISSING in Export:`);
    missingInExport.slice(0, 10).forEach(m => {
        console.log(`- SubStation: ${m.meta.SubStation || m.meta.SubDivision} | Item: ${m.item.substring(0,40)} | Qty: ${m.importQty}`);
    });
}
