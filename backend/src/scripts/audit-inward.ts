import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';
import { StoreInwardEntry } from '../modules/store/storeInwardEntry.schema';
import { PurchaseInvoice } from '../modules/purchases/purchaseInvoice.schema';
import Item from '../modules/items/item.model';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function auditInwardRecords() {
  const mongoUri = process.env.MONGO_URI || '';
  await mongoose.connect(mongoUri);

  const total = await StoreInwardEntry.countDocuments();
  console.log(`Total StoreInwardEntry documents: ${total}`);

  const items = await Item.find().lean();
  console.log(`Loaded ${items.length} Master Items.`);

  // Sample check on STP 9 MTR inward entries
  const stpInwards = await StoreInwardEntry.find({ itemName: /STP 9 MTR/i }).lean();
  console.log(`Found ${stpInwards.length} Inward entries for STP 9 MTR`);

  const circleBreakdown: Record<string, { count: number; totalQty: number }> = {};
  for (const inv of stpInwards) {
    const c = inv.circle || 'Unknown';
    if (!circleBreakdown[c]) circleBreakdown[c] = { count: 0, totalQty: 0 };
    circleBreakdown[c].count++;
    circleBreakdown[c].totalQty += Number(inv.invoiceQty || inv.acceptedQty || inv.totalQty || 0);
  }
  console.log('STP 9 MTR Inward Circle Breakdown:', circleBreakdown);

  // Check how LOA serial numbers or PIs are linked
  let linkedToPiCount = 0;
  let hasSerialCount = 0;
  let hasTempCodeCount = 0;

  for (const inv of stpInwards) {
    if (inv.purchaseInvoiceId) linkedToPiCount++;
    if (inv.serialNumber) hasSerialCount++;
    if (inv.tempCode) hasTempCodeCount++;
  }
  console.log({
    totalStpInwards: stpInwards.length,
    linkedToPiCount,
    hasSerialCount,
    hasTempCodeCount
  });

  // Print 5 detailed STP inward entries
  for (let i = 0; i < Math.min(5, stpInwards.length); i++) {
    const inv = stpInwards[i];
    let pi = null;
    if (inv.purchaseInvoiceId) {
      pi = await PurchaseInvoice.findById(inv.purchaseInvoiceId).lean();
    }
    console.log(`\nInward #${i + 1}:`, {
      inwardId: inv.inwardId,
      invoiceNumber: inv.invoiceNumber,
      circle: inv.circle,
      package: inv.package,
      itemName: inv.itemName,
      tempCode: inv.tempCode,
      serialNumber: inv.serialNumber,
      itemId: inv.itemId,
      qty: inv.invoiceQty,
      piLineItems: pi?.lineItems
    });
  }

  await mongoose.disconnect();
}

auditInwardRecords().catch(console.error);
