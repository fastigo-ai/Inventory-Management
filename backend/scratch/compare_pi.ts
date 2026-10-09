import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { parse } from 'csv-parse/sync';
import { PurchaseInvoice } from '../src/modules/purchases/purchaseInvoice.schema';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/erp-system';

async function main() {
  if (!mongoose.models.Item) {
    mongoose.model('Item', new mongoose.Schema({}, { strict: false }));
  }
  await mongoose.connect(MONGO_URI);
  console.log('Connected to DB');

  const csvContent = fs.readFileSync('C:/Users/sanjeet kumar/Downloads/purchase_invoice_sample ROHRU.csv', 'utf-8');
  const records = parse(csvContent, { columns: true, skip_empty_lines: true });

  const csvData = new Map();
  
  for (const row of records as any[]) {
    const piNo = row['Purchase Invoice#']?.trim().toUpperCase();
    const circle = row['CIRCLE']?.trim().toUpperCase();
    const loaStr = row['LOA Serial No']?.trim().toUpperCase();
    const invQty = parseFloat(row['Inv Qty'] || '0');
    
    if (!piNo || !circle || !loaStr) continue;
    
    const key = `${piNo}_${circle}_${loaStr}`;
    csvData.set(key, (csvData.get(key) || 0) + invQty);
  }
  
  console.log(`Found ${csvData.size} unique (PI, Circle, LOA) combinations in CSV.`);

  const uniquePIs = [...new Set(records.map((r: any) => r['Purchase Invoice#']?.trim()).filter(Boolean))];
  // Find case-insensitively just in case
  const dbInvoices = await PurchaseInvoice.find({
    invoiceNumber: { $in: uniquePIs.map(p => new RegExp(`^${p}$`, 'i')) }
  }).populate('lineItems.itemId').lean();
  
  console.log(`Found ${dbInvoices.length} matching invoices in DB.`);

  const dbData = new Map();
  
  for (const inv of dbInvoices) {
    const piNo = inv.invoiceNumber.toUpperCase();
    for (const line of inv.lineItems) {
      if (!line.itemId) continue;
      const itemDoc = line.itemId as any;
      const circle = (itemDoc.dynamicData?.circle || itemDoc.circle || 'ROHRU').toUpperCase(); 
      const loa = (itemDoc.dynamicData?.loaSerialNo || itemDoc.loaSerialNo || '').toString().toUpperCase();
      
      if (!loa) continue;
      const key = `${piNo}_${circle}_${loa}`;
      dbData.set(key, (dbData.get(key) || 0) + line.quantity);
    }
  }

  console.log('\n--- DISCREPANCIES ---');
  let discrepancies = 0;
  
  const allKeys = new Set([...csvData.keys(), ...dbData.keys()]);
  for (const key of allKeys) {
    const csvQty = csvData.get(key) || 0;
    const dbQty = dbData.get(key) || 0;
    
    if (Math.abs(csvQty - dbQty) > 0.001) {
      discrepancies++;
      const [pi, circle, loa] = key.split('_');
      console.log(`PI: ${pi} | Circle: ${circle} | LOA: ${loa} -> CSV Qty: ${csvQty}, DB Qty: ${dbQty}`);
    }
  }
  
  if (discrepancies === 0) {
    console.log('All quantities match perfectly between CSV and DB!');
  } else {
    console.log(`Found ${discrepancies} mismatches.`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
