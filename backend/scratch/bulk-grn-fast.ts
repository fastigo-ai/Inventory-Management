import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { StoreInwardEntry } from '../src/modules/store/storeInwardEntry.schema';
import Item from '../src/modules/items/item.model';
import { PurchaseInvoice } from '../src/modules/purchases/purchaseInvoice.schema';

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log('Connected to DB');

    const pendingEntries = await StoreInwardEntry.find({ status: 'PENDING_RECEIPT' });
    console.log(`Found ${pendingEntries.length} pending entries. Optimizing GRN generation...`);

    const today = new Date();
    
    // 1. Bulk update Store Inward Entries
    console.log('Generating bulk GRN update operations...');
    const inwardOps = pendingEntries.map(entry => {
      const grNumber = `GRN-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
      return {
        updateOne: {
          filter: { _id: entry._id },
          update: { 
            $set: { 
              status: 'APPROVED',
              grNumber,
              receivedDate: today,
              inwardDate: today,
              receivedQty: entry.receivedQty || entry.invoiceQty || 0
            } 
          }
        }
      };
    });

    if (inwardOps.length > 0) {
      await StoreInwardEntry.bulkWrite(inwardOps);
      console.log('Successfully updated StoreInwardEntries.');
    }

    // 2. Group items for bulk inventory update
    console.log('Grouping entries by Item ID...');
    const itemUpdates: Record<string, any[]> = {};
    const invoiceSet = new Set<string>();

    for (const entry of pendingEntries) {
      if (entry.itemId && entry.invoiceQty) {
        const iId = entry.itemId.toString();
        if (!itemUpdates[iId]) itemUpdates[iId] = [];
        itemUpdates[iId].push(entry);
      }
      if (entry.purchaseInvoiceId) {
        invoiceSet.add(entry.purchaseInvoiceId.toString());
      }
    }

    // 3. Process each unique item exactly once
    const itemIds = Object.keys(itemUpdates);
    console.log(`Processing ${itemIds.length} unique items for inventory update...`);

    for (let i = 0; i < itemIds.length; i++) {
      const itemId = itemIds[i];
      const entries = itemUpdates[itemId];
      const item = await Item.findById(itemId);
      
      if (!item) continue;

      let currentStock = Number(item.dynamicData?.stock || 0);
      let locations = item.dynamicData?.stockLocations || [];
      let history = item.dynamicData?.purchaseHistory || [];

      for (const entry of entries) {
        const qtyToAdd = Number(entry.invoiceQty || 0);
        currentStock += qtyToAdd;

        const circle = entry.circle || 'Default';
        const pkg = entry.package || 'Default';
        let locIndex = locations.findIndex((l: any) => l.circle === circle && l.package === pkg);
        if (locIndex >= 0) {
          locations[locIndex].quantity = Number(locations[locIndex].quantity || 0) + qtyToAdd;
        } else {
          locations.push({ circle, package: pkg, quantity: qtyToAdd });
        }

        history.push({
          date: today,
          vendorName: entry.vendorName || 'Unknown Vendor',
          poNumber: entry.poNumber || '-',
          quantity: qtyToAdd,
          rate: entry.rate || 0,
        });
        
        const circleKey = circle && circle !== 'Default' ? `${circle.toLowerCase().replace(/\s+/g, '')}LoaQuantity` : null;
        if (circleKey) {
            item.dynamicData[circleKey] = Number(item.dynamicData[circleKey] || 0) + qtyToAdd;
        }
      }

      item.dynamicData.stock = currentStock;
      item.dynamicData.stockLocations = locations;
      item.dynamicData.purchaseHistory = history;
      
      item.markModified('dynamicData');
      await item.save();

      if ((i + 1) % 50 === 0) {
        console.log(`Processed ${i + 1}/${itemIds.length} items...`);
      }
    }

    // 4. Update Purchase Invoices
    console.log(`Updating ${invoiceSet.size} Purchase Invoices to 'Received' status...`);
    if (invoiceSet.size > 0) {
      await PurchaseInvoice.updateMany(
        { _id: { $in: Array.from(invoiceSet) } },
        { $set: { receiptStatus: 'Received' } }
      );
    }

    console.log(`Success! Automatically generated GRN for all items.`);
    process.exit(0);
  } catch (error) {
    console.error('Error during bulk GRN generation:', error);
    process.exit(1);
  }
}

run();
