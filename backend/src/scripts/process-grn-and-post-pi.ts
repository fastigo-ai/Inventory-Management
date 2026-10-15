import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { StoreInwardEntry } from '../modules/store/storeInwardEntry.schema';
import { PurchaseInvoice } from '../modules/purchases/purchaseInvoice.schema';
import Item from '../modules/items/item.model';
import { SummaryService } from '../modules/reports/summary/summary.service';
import { clearStoreItemisedCache } from '../modules/reports/summary/storeItemisedSummary.service';

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0?retryWrites=true&w=majority";

async function run() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected successfully.\n");

  const now = new Date();

  // =========================================================================
  // 1. Fetch pending receipts
  // =========================================================================
  const pendingInwards = await StoreInwardEntry.find({ status: 'Pending Receipt' });
  console.log(`Found ${pendingInwards.length} StoreInwardEntry records with status 'Pending Receipt'.`);

  if (pendingInwards.length === 0) {
    console.log("No pending receipts to process.");
  } else {
    console.log("Processing GRN for all pending receipts...");

    // Group inwards by itemId for efficient item stock updates
    const entriesByItem = new Map<string, any[]>();
    for (const inw of pendingInwards) {
      if (inw.itemId) {
        const idStr = inw.itemId.toString();
        if (!entriesByItem.has(idStr)) entriesByItem.set(idStr, []);
        entriesByItem.get(idStr)!.push(inw);
      }
    }

    console.log(`Unique items to update stock for: ${entriesByItem.size}`);

    // Update item stock and stock locations
    let itemsUpdated = 0;
    for (const [itemIdStr, entries] of entriesByItem.entries()) {
      try {
        const item = await Item.findById(itemIdStr);
        if (item) {
          let currentStock = Number(item.dynamicData?.stock || 0);
          let locations = item.dynamicData?.stockLocations ? [...item.dynamicData.stockLocations] : [];
          let history = item.dynamicData?.purchaseHistory ? [...item.dynamicData.purchaseHistory] : [];

          for (const inw of entries) {
            const qtyToAdd = Number(inw.invoiceQty || 0);
            if (qtyToAdd <= 0) continue;

            currentStock += qtyToAdd;

            const circle = inw.circle || 'Default';
            const pkg = inw.package || 'Default';
            let locIndex = locations.findIndex((l: any) => l.circle === circle && l.package === pkg);
            if (locIndex >= 0) {
              locations[locIndex].quantity = Number(locations[locIndex].quantity || 0) + qtyToAdd;
            } else {
              locations.push({ circle, package: pkg, quantity: qtyToAdd });
            }

            history.push({
              date: inw.receivedDate || inw.createdAt || now,
              vendorName: inw.vendorName || 'Unknown Vendor',
              poNumber: inw.poNumber || '-',
              quantity: qtyToAdd,
              rate: inw.rate || 0,
            });

            // Update ItemSummary
            try {
              await SummaryService.updateSummary({
                itemId: item._id,
                circle: inw.circle,
                package: inw.package,
                increments: { invQty: qtyToAdd },
                addVendor: inw.vendorName
              });
            } catch (err: any) {
              console.error(`Error updating ItemSummary for item ${itemIdStr}:`, err.message);
            }
          }

          item.dynamicData = {
            ...item.dynamicData,
            stock: currentStock,
            stockLocations: locations,
            purchaseHistory: history,
          };
          item.markModified('dynamicData');
          await item.save();
          itemsUpdated++;
        }
      } catch (err: any) {
        console.error(`Failed to update item ${itemIdStr}:`, err.message);
      }
    }
    console.log(`Successfully updated stock for ${itemsUpdated} items.`);

    // Bulk update StoreInwardEntry records to 'Approved' with GRN info
    console.log("Updating StoreInwardEntry statuses to 'Approved'...");
    let entriesUpdated = 0;
    const bulkOps = pendingInwards.map(inw => {
      const qty = Number(inw.invoiceQty || inw.totalQty || 0);
      return {
        updateOne: {
          filter: { _id: inw._id },
          update: {
            $set: {
              status: 'Approved',
              totalQty: qty,
              challanQty: qty,
              acceptedQty: qty,
              receivedQty: qty,
              rejectedQty: 0,
              receivedDate: inw.receivedDate || now,
              grDate: inw.grDate || now,
              grNumber: inw.grNumber || 'Auto Generated',
              transportName: inw.transportName || 'Auto Generated',
              truckNumber: inw.truckNumber || 'Auto Generated',
              biltyNumber: inw.biltyNumber || 'Auto Generated',
              remarks: inw.remarks || 'Auto-approved via AI',
              packingList: (inw.packingList && inw.packingList.length > 0 && inw.packingList[0].quantity > 0)
                ? inw.packingList
                : [{ packType: 'BOX', quantity: qty, packUnit: inw.unit || 'Nos' }]
            }
          }
        }
      };
    });

    if (bulkOps.length > 0) {
      const bulkRes = await StoreInwardEntry.bulkWrite(bulkOps);
      entriesUpdated = bulkRes.modifiedCount;
    }
    console.log(`Successfully approved ${entriesUpdated} StoreInwardEntry records.`);
  }

  // Clear store itemised report cache
  clearStoreItemisedCache();
  console.log("Cleared store itemised summary cache.");

  // =========================================================================
  // 2. Post all Purchase Invoices that are in 'Draft' status
  // =========================================================================
  const draftPIsCount = await PurchaseInvoice.countDocuments({ status: 'Draft' });
  console.log(`\nFound ${draftPIsCount} PurchaseInvoice records in 'Draft' status.`);

  if (draftPIsCount > 0) {
    console.log("Updating all Draft Purchase Invoices to status: 'Posted' and receiptStatus: 'Received'...");
    const piResult = await PurchaseInvoice.updateMany(
      { status: 'Draft' },
      {
        $set: {
          status: 'Posted',
          receiptStatus: 'Received'
        }
      }
    );
    console.log(`Successfully updated ${piResult.modifiedCount} Purchase Invoices to 'Posted'.`);
  }

  // Also verify if any Purchase Invoices still have receiptStatus == 'Pending Receipt'
  const pendingReceiptPIsCount = await PurchaseInvoice.countDocuments({ receiptStatus: 'Pending Receipt' });
  console.log(`Purchase Invoices with receiptStatus 'Pending Receipt': ${pendingReceiptPIsCount}`);
  if (pendingReceiptPIsCount > 0) {
    console.log("Updating remaining 'Pending Receipt' Purchase Invoices to 'Received'...");
    const piReceiptResult = await PurchaseInvoice.updateMany(
      { receiptStatus: 'Pending Receipt' },
      {
        $set: {
          receiptStatus: 'Received'
        }
      }
    );
    console.log(`Updated ${piReceiptResult.modifiedCount} Purchase Invoices to receiptStatus: 'Received'.`);
  }

  // =========================================================================
  // 3. Final Verification
  // =========================================================================
  const remainingPendingInwards = await StoreInwardEntry.countDocuments({ status: 'Pending Receipt' });
  const remainingDraftPIs = await PurchaseInvoice.countDocuments({ status: 'Draft' });
  const finalInwardStatuses = await StoreInwardEntry.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  const finalPIStatuses = await PurchaseInvoice.aggregate([
    { $group: { _id: { status: '$status', receiptStatus: '$receiptStatus' }, count: { $sum: 1 } } }
  ]);

  console.log("\n=================== FINAL STATUS SUMMARY ===================");
  console.log(`Remaining Pending Inwards: ${remainingPendingInwards}`);
  console.log(`Remaining Draft PIs: ${remainingDraftPIs}`);
  console.log("Store Inward Entry Statuses:", finalInwardStatuses);
  console.log("Purchase Invoice Statuses:", finalPIStatuses);
  console.log("============================================================\n");

  await mongoose.disconnect();
  console.log("Disconnected from MongoDB. Done!");
}

run().catch(err => {
  console.error("Script failed with error:", err);
  process.exit(1);
});
