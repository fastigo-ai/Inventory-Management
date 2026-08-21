import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { PurchaseInvoice } from './src/modules/purchases/purchaseInvoice.schema';
import { StoreInwardEntry } from './src/modules/store/storeInwardEntry.schema';

dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI as string);
  
  console.log("=== NAHAN INVOICE TO INWARD MAPPING REPORT ===");

  // 1. Find all PIs that have Nahan circle in their line items
  const pis = await PurchaseInvoice.find({ 'lineItems.circle': { $regex: new RegExp(`^Nahan$`, 'i') } });
  
  if (pis.length === 0) {
    console.log("\n❌ No Purchase Invoices found with 'Nahan' circle explicitly mapped in their line items!");
    
    // Let's check if there are any PIs with Nahan in subcircle or destination?
    // Wait, earlier I checked and found NO PIs with Nahan circle.
    const allPis = await PurchaseInvoice.find({});
    let nahanMention = 0;
    allPis.forEach(pi => {
      pi.lineItems.forEach(li => {
        if (li.circle?.toLowerCase().includes('nahan') || li.subcircle?.toLowerCase().includes('nahan')) {
          nahanMention++;
        }
      });
    });
    console.log(`\nFound ${nahanMention} loose references to Nahan in PI line items.`);
  } else {
    for (const pi of pis) {
      console.log(`\nPI: ${pi.invoiceNumber}`);
      for (const item of pi.lineItems) {
        if (item.circle?.toLowerCase() === 'nahan') {
          // Check if inward exists
          const inwards = await StoreInwardEntry.find({
            purchaseInvoiceId: pi._id,
            itemName: item.itemName,
            circle: { $regex: new RegExp(`^Nahan$`, 'i') }
          });
          
          if (inwards.length > 0) {
             console.log(`  ✅ [INWARDED] Item: ${item.itemName} | Qty: ${item.quantity} -> Found ${inwards.length} inward entries.`);
          } else {
             console.log(`  ❌ [MISSING] Item: ${item.itemName} | Qty: ${item.quantity} -> No inward entry found in Nahan!`);
          }
        }
      }
    }
  }
  
  // 2. Find all DIs that have Nahan circle
  const dis = await mongoose.connection.collection('dis').find({ 'lineItems.circle': { $regex: new RegExp(`^Nahan$`, 'i') } }).toArray();
  const diTopLevel = await mongoose.connection.collection('dis').find({ circle: { $regex: new RegExp(`^Nahan$`, 'i') } }).toArray();
  
  const allNahanDis = [...dis, ...diTopLevel];
  // Deduplicate
  const uniqueDis = new Map();
  allNahanDis.forEach(di => uniqueDis.set(di._id.toString(), di));
  
  console.log(`\n=== DIs MAPPED TO NAHAN (${uniqueDis.size} found) ===`);
  
  for (const di of uniqueDis.values()) {
    console.log(`\nDI: ${di.diNumber}`);
    
    let itemsToCheck = [];
    if (di.circle?.toLowerCase() === 'nahan') {
      itemsToCheck = di.lineItems;
    } else {
      itemsToCheck = di.lineItems.filter((i: any) => i.circle?.toLowerCase() === 'nahan');
    }
    
    for (const item of itemsToCheck) {
      const inwards = await StoreInwardEntry.find({
        $or: [
          { diId: di._id },
          { diRefNo: di.diNumber }
        ],
        tempCode: item.tempCode,
        circle: { $regex: new RegExp(`^Nahan$`, 'i') }
      });
      
      if (inwards.length > 0) {
        console.log(`  ✅ [INWARDED] Item: ${item.itemName} (TempCode: ${item.tempCode}) | DI Qty: ${item.quantity} -> Found ${inwards.length} inward entries.`);
      } else {
        console.log(`  ❌ [MISSING] Item: ${item.itemName} (TempCode: ${item.tempCode}) | DI Qty: ${item.quantity} -> No inward entry found in Nahan!`);
      }
    }
  }

  process.exit(0);
}
run().catch(console.error);
