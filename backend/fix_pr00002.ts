import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Pr } from './src/modules/purchases/pr.schema';
import { StoreInwardEntry } from './src/modules/store/storeInwardEntry.schema';

dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI as string);
  
  const pr = await Pr.findOne({ purchaseReceiveNumber: 'PR-00002' });
  if (!pr) return process.exit(1);

  // Delete all StoreInwardEntries for this PR
  await StoreInwardEntry.deleteMany({ purchaseInvoiceId: pr._id });
  
  const inwardEntries = pr.lineItems!.map((item: any) => {
    // Explicitly grab values from item document if needed
    const cgst = item.get ? item.get('cgst') : item.cgst;
    const sgst = item.get ? item.get('sgst') : item.sgst;
    const igst = item.get ? item.get('igst') : item.igst;
    const amount = item.get ? item.get('amount') : item.amount;
    const totalAmount = item.get ? item.get('totalAmount') : item.totalAmount;
    
    return {
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
      amount: totalAmount || amount,
      tempCode: item.tempCode,
      itemId: item.itemId,
      itemName: item.itemName,
      itemDescription: item.itemDescription,
      hsnCode: item.hsnCode,
      cgst: cgst,
      sgst: sgst,
      igst: igst,
      taxableAmount: amount,
      serialNumber: item.loaSerialNo,
      status: 'PENDING_RECEIPT',
      packingList: [{ packType: 'BOX', quantity: item.invoiceQuantity || 0 }]
    };
  });

  const saved = await StoreInwardEntry.insertMany(inwardEntries);
  console.log("Regenerated PR-00002:");
  console.log(JSON.stringify(saved, null, 2));
  process.exit(0);
}
run();
