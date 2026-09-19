const mongoose = require('mongoose');
const xlsx = require('xlsx');
require('dotenv').config();

const filePath = `C:\\Users\\sanjeet kumar\\Downloads\\NALAGARH wipc.xlsx`;
const wb = xlsx.readFile(filePath);
const sheetName = wb.SheetNames[0];
const worksheet = wb.Sheets[sheetName];
const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: null });

console.log(`Sheet "${sheetName}" has ${rows.length} rows.`);

// Let's find the location row
let locRow = [];
let headerIdx = -1;
for(let i=0; i<Math.min(50, rows.length); i++) {
    if(rows[i] && rows[i].includes('Description')) {
        headerIdx = i;
        break;
    }
}

if(headerIdx > -1 && headerIdx >= 5) {
    const metaLocs = rows[5]; // Usually row index 5 holds locations
    const descIdx = rows[headerIdx].findIndex(c => c === 'Description' || c === 'Item Description');
    let startCol = descIdx + 1;
    // Skip unit, qty, etc if present before site columns
    for(let j=descIdx+1; j<rows[headerIdx].length; j++) {
        if(String(rows[headerIdx][j]).toLowerCase().includes('unit') || String(rows[headerIdx][j]).toLowerCase() === 'uom') {
            startCol = j + 1;
        }
    }
    
    const sitesInExcel = [];
    for(let c=startCol; c<metaLocs.length; c++) {
        if(metaLocs[c]) sitesInExcel.push(metaLocs[c].toString().trim());
    }
    console.log(`Sites in Excel (row 5): ${sitesInExcel.length}`);
    console.log(sitesInExcel.slice(0, 5), '...', sitesInExcel.slice(-5));
} else {
    console.log('Could not find Description header or location row properly.');
}

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const WipRegister = mongoose.model('WipRegister', new mongoose.Schema({
        wipNumber: String,
        circle: String,
        subCircle: String,
        division: String,
        subDivision: String,
        subStation: String,
        location: String,
        package: String,
        drawingNo: String,
        createdAt: Date
    }, { collection: 'wipregisters' }));

    // Find Nalagarh wip registers
    const wips = await WipRegister.find({
        $or: [
            { circle: /nalagarh/i },
            { subCircle: /nalagarh/i },
            { division: /nalagarh/i },
            { subDivision: /nalagarh/i },
            { package: /nalagarh/i }
        ]
    }).lean();

    console.log(`Total WipRegisters matching Nalagarh in DB: ${wips.length}`);
    
    const solanWips = await WipRegister.find({
        $or: [
            { circle: /solan/i },
            { subCircle: /solan/i },
            { division: /solan/i },
            { subDivision: /solan/i },
            { package: /solan/i }
        ]
    }).lean();
    console.log(`Total WipRegisters matching Solan in DB: ${solanWips.length}`);
    
    // Group by createdAt day to see when they were imported
    const byDate = {};
    for (const w of wips) {
        const d = w.createdAt.toISOString().substring(0, 10);
        byDate[d] = (byDate[d] || 0) + 1;
    }
    console.log('Nalagarh Wips by Date:', byDate);

    const byDateSolan = {};
    for (const w of solanWips) {
        const d = w.createdAt.toISOString().substring(0, 10);
        byDateSolan[d] = (byDateSolan[d] || 0) + 1;
    }
    console.log('Solan Wips by Date:', byDateSolan);

    mongoose.connection.close();
}).catch(console.error);
