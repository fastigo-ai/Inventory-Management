const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const MONGO_URI = process.env.MONGO_URI;

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;

    // Fetch all PIs
    const pis = await db.collection('purchaseinvoices').find({}).toArray();
    
    // Fetch all valid DI numbers in the system
    const dis = await db.collection('dis').find({}, { projection: { diNumber: 1 } }).toArray();
    const validDiNumbers = new Set(dis.map(d => d.diNumber));

    let countNoDiNumberAtAll = 0;
    let countBrokenDiLink = 0;
    let countValidDiLink = 0;

    for (const pi of pis) {
      // Find DI number for this PI
      // It can be at root level or lineItems level
      let diNumbersInPi = new Set();
      if (pi.diNumber) diNumbersInPi.add(pi.diNumber);
      
      if (pi.lineItems) {
        for (const item of pi.lineItems) {
          if (item.diNumber) diNumbersInPi.add(item.diNumber);
        }
      }

      if (diNumbersInPi.size === 0) {
        countNoDiNumberAtAll++;
      } else {
        // Check if all provided DI numbers exist in the valid set
        let hasBrokenLink = false;
        for (const dn of diNumbersInPi) {
          if (!validDiNumbers.has(dn)) {
            hasBrokenLink = true;
            break;
          }
        }
        
        if (hasBrokenLink) {
          countBrokenDiLink++;
        } else {
          countValidDiLink++;
        }
      }
    }

    console.log(`\n=== Purchase Invoices vs Dispatch Instructions ===\n`);
    console.log(`Total PIs in system: ${pis.length}`);
    console.log(`PIs with NO DI Number provided: ${countNoDiNumberAtAll}`);
    console.log(`PIs with a DI Number that does NOT exist: ${countBrokenDiLink}`);
    console.log(`PIs with a completely valid DI Link: ${countValidDiLink}`);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
