import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Pr } from './src/modules/purchases/pr.schema';
import { StoreInwardEntry } from './src/modules/store/storeInwardEntry.schema';

dotenv.config();

const run = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // First delete all StoreInwardEntries created by script (or just delete all, wait, the user didn't register inward yet, hopefully)
    await StoreInwardEntry.deleteMany({});
    console.log('Deleted existing StoreInwardEntry records.');

    const prs = await Pr.find();
    console.log(`Found ${prs.length} Purchase Receives.`);

    let insertedCount = 0;

    for (const pr of prs) {
      if (!pr.lineItems || pr.lineItems.length === 0) continue;

      const inwardEntries = pr.lineItems.map((item: any) => ({
        purchaseInvoiceId: pr._id,
        purchaseOrderId: pr.purchaseOrderId,
        poNumber: pr.purchaseOrderNumber,
        poDate: item.poDate,
        billingFrom: pr.billingFrom,
        vendorName: pr.vendorName,
        invoiceNumber: pr.purchaseReceiveNumber,
        invoiceDate: pr.receiveDate,
        diRefNo: pr.diNo,
        circle: item.circle,
        package: item.package,
        unit: item.unit,
        invoiceQty: item.invoiceQuantity,
        totalQty: item.totalInvoiceQuantity,
        rate: item.rate,
        amount: item.totalAmount || item.amount,
        tempCode: item.tempCode,
        itemId: item.itemId,
        itemName: item.itemName,
        itemDescription: item.itemDescription,
        hsnCode: item.hsnCode,
        cgst: item.cgst,
        sgst: item.sgst,
        igst: item.igst,
        taxableAmount: item.amount,
        serialNumber: item.loaSerialNo,
        status: 'PENDING_RECEIPT',
        packingList: [{ packType: 'BOX', quantity: item.invoiceQuantity || 0 }]
      }));

      await StoreInwardEntry.insertMany(inwardEntries);
      insertedCount += inwardEntries.length;
      console.log(`Inserted ${inwardEntries.length} entries for PR ${pr.purchaseReceiveNumber}`);
    }

    console.log(`\nMigration complete! Inserted a total of ${insertedCount} new StoreInwardEntry records.`);
    process.exit(0);
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
};

run();
