import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { StoreInwardEntry } from './src/modules/store/storeInwardEntry.schema';
import Item from './src/modules/items/item.model';
import { PurchaseInvoice } from './src/modules/purchases/purchaseInvoice.schema';

dotenv.config();

// Replica of processInwardStockUpdate from store.controller.ts
async function processInwardStockUpdate(entryId: string) {
  const entry = await StoreInwardEntry.findById(entryId);
  if (!entry) return;
  
  if (entry.itemId && entry.invoiceQty) {
    try {
      const item = await Item.findById(entry.itemId);
      if (item) {
        const qtyToAdd = Number(entry.invoiceQty || 0);
        const currentStock = Number(item.dynamicData?.stock || 0);
        
        let locations = item.dynamicData?.stockLocations || [];
        const circle = entry.circle || 'Default';
        const pkg = entry.package || 'Default';
        let locIndex = locations.findIndex((l: any) => l.circle === circle && l.package === pkg);
        if (locIndex >= 0) {
          locations[locIndex].quantity = Number(locations[locIndex].quantity || 0) + qtyToAdd;
        } else {
          locations.push({ circle, package: pkg, quantity: qtyToAdd });
        }

        let history = item.dynamicData?.purchaseHistory || [];
        history.push({
          date: entry.receivedDate || entry.createdAt || new Date(),
          vendorName: entry.vendorName || 'Unknown Vendor',
          poNumber: entry.poNumber || '-',
          quantity: qtyToAdd,
          rate: entry.rate || 0,
        });

        const circleKey = circle && circle !== 'Default' ? `${circle.toLowerCase().replace(/\s+/g, '')}LoaQuantity` : null;

        item.dynamicData = {
          ...item.dynamicData,
          stock: currentStock + qtyToAdd,
          stockLocations: locations,
          purchaseHistory: history,
          ...(entry.tempCode && { tempCode: entry.tempCode }),
          ...(entry.serialNumber && { loaSerialNo: entry.serialNumber }),
          ...(entry.hsnCode && { hsnCode: entry.hsnCode }),
          ...(entry.itemDescription && { description: entry.itemDescription }),
          ...(circleKey && { [circleKey]: Number(item.dynamicData?.[circleKey] || 0) + qtyToAdd })
        };
        item.markModified('dynamicData');
        await item.save();
      }
      if (entry.purchaseInvoiceId) {
        const invoice = await PurchaseInvoice.findById(entry.purchaseInvoiceId);
        if (invoice && invoice.receiptStatus !== 'Received') {
          invoice.receiptStatus = 'Received';
          await invoice.save();
        }
      }
    } catch (err) {
      console.error('Failed to update inventory stock on inward processing:', err);
    }
    return;
  }
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI as string);
  
  const entries = await StoreInwardEntry.find({}).sort({ createdAt: -1 });
  console.log(`Total StoreInwardEntry records: ${entries.length}`);
  
  const statusCounts: Record<string, number> = {};
  entries.forEach(e => {
    statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;
  });
  console.log('Status breakdown:', statusCounts);
  
  const entry = entries[0];
  if (!entry) {
    console.log('No store inward entry found.');
    process.exit(0);
  }
  
  console.log('\nAnalyzing entry:');
  console.log('ID:', entry._id);
  console.log('Status:', entry.status);
  console.log('Item ID:', entry.itemId);
  console.log('Item Name:', entry.itemName);
  console.log('Invoice Quantity (Accepted Qty):', entry.invoiceQty);
  console.log('Circle/Package:', entry.circle, '/', entry.package);
  
  const itemId = entry.itemId;
  if (!itemId) {
    console.log('Entry has no itemId.');
    process.exit(0);
  }
  
  const item = await Item.findById(itemId);
  if (!item) {
    console.log('Item not found.');
    process.exit(0);
  }
  
  console.log('\n--- BEFORE STOCK UPDATE ---');
  console.log('Item Name:', item.name);
  console.log('Stock:', item.dynamicData?.stock);
  console.log('Stock locations:', JSON.stringify(item.dynamicData?.stockLocations, null, 2));
  
  const originalDynamicData = JSON.parse(JSON.stringify(item.dynamicData));
  
  console.log('\n--- SIMULATING STOCK UPDATE (SUBMITTING INWARD REGISTER) ---');
  await processInwardStockUpdate(entry._id.toString());
  
  const updatedItem = await Item.findById(itemId);
  if (!updatedItem) {
    console.log('Updated Item not found');
    process.exit(1);
  }
  
  console.log('--- AFTER STOCK UPDATE ---');
  console.log('Stock:', updatedItem.dynamicData?.stock);
  console.log('Stock locations:', JSON.stringify(updatedItem.dynamicData?.stockLocations, null, 2));
  
  // Revert changes to keep DB clean
  console.log('\n--- REVERTING DB CHANGES ---');
  updatedItem.dynamicData = originalDynamicData;
  updatedItem.markModified('dynamicData');
  await updatedItem.save();
  console.log('Database changes successfully reverted.');
  
  process.exit(0);
}

run().catch(console.error);
