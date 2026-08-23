import mongoose from 'mongoose';
import { StoreInwardEntry } from '../modules/store/storeInwardEntry.schema';
import { PurchaseInvoice } from '../modules/purchases/purchaseInvoice.schema';
import Item from '../modules/items/item.model';
import { SummaryService } from '../modules/reports/summary/summary.service';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";

async function applyStockUpdate(entry: any) {
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
        
        await SummaryService.rebuildForItem(item._id.toString());
      }
    } catch (err) {
      console.error('Failed to update inventory stock:', err);
    }
  }
}

async function generate() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to DB");

    // Get ALL purchase invoices
    const allPIs = await PurchaseInvoice.find({});
    console.log(`Scanning ${allPIs.length} PIs...`);

    let entriesCreated = 0;
    let pisUpdated = 0;

    for (const pi of allPIs) {
      if (!pi.lineItems || pi.lineItems.length === 0) continue;

      let missingSomething = false;

      for (const lineItem of pi.lineItems) {
        if (!lineItem.itemId) continue;

        const qty = Number(lineItem.quantity || lineItem.invoiceQty || 0);
        if (qty <= 0) continue;

        // Verify if a valid StoreInwardEntry for this exact line item and PI already exists with the same qty
        // Actually, we can sum the existing inward quantities for this PI + Item to see if it matches
        const existingInwards = await StoreInwardEntry.find({
          purchaseInvoiceId: pi._id,
          itemId: lineItem.itemId,
          tempCode: lineItem.tempCode,
          status: { $in: ['APPROVED', 'VERIFIED'] }
        });

        const existingQty = existingInwards.reduce((sum, e) => sum + Number(e.totalQty || 0), 0);
        
        if (existingQty >= qty) {
          // Already inwarded properly
          continue;
        }

        const remainingQty = qty - existingQty;
        console.log(`PI ${pi.invoiceNumber} | ${lineItem.itemName} | PI Qty: ${qty} | Existing GRN: ${existingQty} | Missing: ${remainingQty}`);

        // Generate inward for the remaining quantity
        missingSomething = true;
        
        const item = await Item.findById(lineItem.itemId);
        const unit = item?.unit || 'Nos';
        const amount = remainingQty * (lineItem.rate || 0);
        
        const entry = new StoreInwardEntry({
          inwardId: `INW-FIXED-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          purchaseInvoiceId: pi._id,
          purchaseOrderId: pi.purchaseOrderId,
          poNumber: pi.poNumber || '-',
          poDate: pi.poDate || pi.date,
          billingFrom: pi.billingCompany?.name || '',
          vendorName: pi.vendorName,
          invoiceNumber: pi.invoiceNumber,
          invoiceDate: pi.date,
          receivedDate: new Date(),
          
          itemId: lineItem.itemId,
          itemName: lineItem.itemName,
          tempCode: lineItem.tempCode,
          itemDescription: lineItem.description || lineItem.itemName,
          serialNumber: lineItem.loaSerialNo || lineItem.itemName,
          hsnCode: lineItem.hsnCode || '',
          circle: lineItem.circle || pi.circle || 'Default',
          subcircle: lineItem.subcircle || pi.subcircle || '',
          package: lineItem.package || pi.package || 'Default',
          unit: unit,
          
          invoiceQty: remainingQty,
          totalQty: remainingQty,
          acceptedQty: remainingQty,
          receivedQty: remainingQty,
          challanQty: 0,
          rejectedQty: 0,
          
          rate: lineItem.rate || 0,
          amount: amount,
          taxableAmount: amount,
          
          cgst: 0,
          sgst: 0,
          igst: 0,
          gst: '0',
          
          status: 'APPROVED',
          packingList: [{
             packType: 'BOX',
             quantity: remainingQty,
             packUnit: unit
          }],
          
          createdBy: pi.createdBy || undefined
        });

        await entry.save();
        await applyStockUpdate(entry);
        entriesCreated++;
      }
      
      if (missingSomething) {
        pi.receiptStatus = 'Received';
        await pi.save();
        pisUpdated++;
      }
    }

    console.log(`Successfully generated ${entriesCreated} inward entries and updated ${pisUpdated} PIs.`);

  } catch (error) {
    console.error("Generation failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected.");
  }
}

generate();
