const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');
const { parse } = require('csv-parse/sync');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const MONGO_URI = process.env.MONGO_URI;

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;

    // Read CSV
    const csvFilePath = "C:\\Users\\sanjeet kumar\\Downloads\\purchase_invoice_sample 0310 Nahan.csv";
    const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
    
    // Parse CSV
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    const csvPis = new Set();
    records.forEach(row => {
      const piNumber = row['Purchase Invoice#'] || row['purchaseinvoicenumber'] || row['invoicenumber'];
      if (piNumber) {
        csvPis.add(piNumber.trim());
      }
    });

    console.log(`Found ${csvPis.size} unique Purchase Invoice numbers in the CSV.`);

    // Read DB
    const dbPis = await db.collection('purchaseinvoices').find({
      "lineItems.circle": { $regex: /nahan/i }
    }).toArray();

    const dbPiNumbers = new Set(dbPis.map(pi => pi.invoiceNumber));

    console.log(`Found ${dbPis.length} Purchase Invoices for Nahan in the Database.`);

    // Find extra in DB
    const extraInDb = [];
    for (const pi of dbPiNumbers) {
      if (!csvPis.has(pi)) {
        extraInDb.push(pi);
      }
    }

    // Find missing in DB
    const missingInDb = [];
    for (const pi of csvPis) {
      if (!dbPiNumbers.has(pi)) {
        missingInDb.push(pi);
      }
    }

    console.log(`\n=== RESULTS ===`);
    console.log(`Extra in DB (Not in CSV): ${extraInDb.length}`);
    if (extraInDb.length > 0) {
      console.log(extraInDb.slice(0, 50).join(', ') + (extraInDb.length > 50 ? '...' : ''));
    }

    console.log(`\nMissing in DB (In CSV but not in DB): ${missingInDb.length}`);
    if (missingInDb.length > 0) {
      console.log(missingInDb.slice(0, 50).join(', ') + (missingInDb.length > 50 ? '...' : ''));
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
