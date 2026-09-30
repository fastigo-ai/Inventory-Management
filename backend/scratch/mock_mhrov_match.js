const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const cleanStr = (s) => String(s || '').replace(/\*+$/, '').trim();
const cleanStrLower = (s) => cleanStr(s).toLowerCase();
const normalizeForMatch = (s) => cleanStrLower(s).replace(/\s+/g, '');

const run = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    const di = await mongoose.connection.collection('dis').findOne({ diNumber: '1417-47' });
    
    // Simulate item from CSV
    const item = {
        diNo: '1417-47',
        circle: '', // What if circle is empty in CSV?
        loaSerialNo: '288',
        itemName: 'GI EARTH WIRE (8 SWG)',
        tempCode: '93',
        package: ''
    };
    
    const mhrovData = { circle: '', package: '' }; // Fallbacks
    const bulkEntries = [di]; // Mock bulk entries
    
    let matchedLineItem = null;
    let matchedDI = null;

    for (const entry of bulkEntries) {
         const csvDi = cleanStrLower(item.diNo);
         const dbDi = cleanStrLower(entry.diNumber);
         if (csvDi && dbDi && dbDi !== csvDi) continue;

         if (entry.lineItems && Array.isArray(entry.lineItems)) {
             const csvCircle = normalizeForMatch(item.circle || mhrovData.circle);
             let circleCandidates = entry.lineItems;
             if (csvCircle) {
                 circleCandidates = circleCandidates.filter((li) => {
                     const dbCircle = normalizeForMatch(li.circle || entry.circle);
                     // If dbCircle is missing, we assume it matches. If present, it must match.
                     return !dbCircle || dbCircle === csvCircle;
                 });
             }

             const csvSerial = normalizeForMatch(item.loaSerialNo);
             const csvItem = normalizeForMatch(item.itemName);
             const csvTemp = normalizeForMatch(item.tempCode);
             const csvPackage = normalizeForMatch(item.package || mhrovData.package);

             // 1. Try strict matching by LOA Serial No (most reliable)
             if (csvSerial) {
                 const serialMatch = circleCandidates.find((li) => normalizeForMatch(li.loaSerialNo) === csvSerial);
                 if (serialMatch) {
                     matchedLineItem = serialMatch;
                     matchedDI = entry;
                     break;
                 }
             }

             // 2. Fallback to Name + TempCode + Package match
             const fallbackMatch = circleCandidates.find((li) => {
                 let match = true;
                 const dbItem = normalizeForMatch(li.itemName);
                 if (csvItem && dbItem && dbItem !== csvItem) match = false;
                 
                 const dbTemp = normalizeForMatch(li.tempCode);
                 if (csvTemp && dbTemp && dbTemp !== csvTemp) match = false;
                 
                 const dbPackage = normalizeForMatch(li.package || entry.package);
                 if (csvPackage && dbPackage && dbPackage !== csvPackage) match = false;
                 
                 return match;
             });

             if (fallbackMatch) {
                 matchedLineItem = fallbackMatch;
                 matchedDI = entry;
                 break;
             }
         }
         if (matchedLineItem) break;
    }

    console.log("Matched?", !!matchedLineItem);
    if (matchedLineItem) {
        console.log("Matched Item Name:", matchedLineItem.itemName);
    }
    
    process.exit(0);
}
run().catch(console.error);
