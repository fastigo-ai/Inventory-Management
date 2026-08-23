import mongoose from 'mongoose';
import { StoreInwardEntry } from '../modules/store/storeInwardEntry.schema';
import { PurchaseInvoice } from '../modules/purchases/purchaseInvoice.schema';
import Item from '../modules/items/item.model';
import { SummaryService } from '../modules/reports/summary/summary.service';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";

// A much faster reverse function that skips summary rebuild
async function reverseStockFast(entryId: string, itemsToRebuild: Set<string>) {
  const entry = await StoreInwardEntry.findById(entryId);
  if (!entry) return;
  
  if (entry.itemId && entry.invoiceQty) {
    const item = await Item.findById(entry.itemId);
    if (item) {
      itemsToRebuild.add(item._id.toString());
      const qtyToSubtract = Number(entry.invoiceQty || 0);
      const currentStock = Number(item.dynamicData?.stock || 0);
      
      let locations = item.dynamicData?.stockLocations || [];
      const circle = entry.circle || 'Default';
      const pkg = entry.package || 'Default';
      let locIndex = locations.findIndex((l: any) => l.circle === circle && l.package === pkg);
      if (locIndex >= 0) {
        locations[locIndex].quantity = Math.max(0, Number(locations[locIndex].quantity || 0) - qtyToSubtract);
      }

      let history = item.dynamicData?.purchaseHistory || [];
      const historyIndex = history.findIndex((h: any) => 
        h.vendorName === (entry.vendorName || 'Unknown Vendor') &&
        h.poNumber === (entry.poNumber || '-') &&
        Number(h.quantity) === qtyToSubtract
      );
      
      if (historyIndex >= 0) history.splice(historyIndex, 1);

      const circleKey = circle && circle !== 'Default' ? `${circle.toLowerCase().replace(/\s+/g, '')}LoaQuantity` : null;

      item.dynamicData = {
        ...item.dynamicData,
        stock: Math.max(0, currentStock - qtyToSubtract),
        stockLocations: locations,
        purchaseHistory: history,
        ...(circleKey && { [circleKey]: Math.max(0, Number(item.dynamicData?.[circleKey] || 0) - qtyToSubtract) })
      };
      item.markModified('dynamicData');
      await item.save();
    }
  }
}

async function rollbackFast() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to DB");

    const autoEntries = await StoreInwardEntry.find({ inwardId: { $regex: /^INW-AUTO-/ } });
    console.log(`Found ${autoEntries.length} INW-AUTO- entries to rollback.`);

    let piSet = new Set<string>();
    let itemsToRebuild = new Set<string>();

    for (const entry of autoEntries) {
      console.log(`Reverting stock for ${entry.inwardId} (Invoice: ${entry.invoiceNumber})`);
      
      await reverseStockFast(entry._id.toString(), itemsToRebuild);
      
      if (entry.purchaseInvoiceId) piSet.add(entry.purchaseInvoiceId.toString());
      
      await StoreInwardEntry.findByIdAndDelete(entry._id);
    }
    
    console.log(`Rebuilding ItemSummaries for ${itemsToRebuild.size} unique items in parallel...`);
    await Promise.all(Array.from(itemsToRebuild).map(id => SummaryService.rebuildForItem(id)));
    console.log(`Successfully rebuilt summaries.`);
    
    let resetCount = 0;
    for (const piId of piSet) {
      const pi = await PurchaseInvoice.findById(piId);
      if (pi && pi.receiptStatus === 'Received') {
        const remainingInwards = await StoreInwardEntry.find({ purchaseInvoiceId: pi._id, status: { $ne: 'VOIDED' } });
        pi.receiptStatus = remainingInwards.length === 0 ? 'Pending Receipt' : 'Partially Received';
        await pi.save();
        resetCount++;
      }
    }
    
    console.log(`Reset ${resetCount} Purchase Invoices statuses.`);
    
  } catch (error) {
    console.error("Rollback failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected.");
  }
}

rollbackFast();
