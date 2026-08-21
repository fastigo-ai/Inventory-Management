import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/erp';

async function fixMissingCirclePackage() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const StoreInwardEntry = require('../modules/store/storeInwardEntry.schema').StoreInwardEntry;
    const PurchaseInvoice = require('../modules/purchases/purchaseInvoice.schema').PurchaseInvoice;
    const DI = require('../modules/di/di.schema').DI;

    // Find all inward entries that are missing circle or package and came from a PI
    const entries = await StoreInwardEntry.find({
      purchaseInvoiceId: { $exists: true },
      $or: [
        { circle: { $in: [null, '', undefined] } },
        { package: { $in: [null, '', undefined] } }
      ]
    });

    console.log(`Found ${entries.length} StoreInwardEntries missing circle or package.`);

    let fixedCount = 0;

    for (const entry of entries) {
      if (!entry.purchaseInvoiceId) continue;

      const pi = await PurchaseInvoice.findById(entry.purchaseInvoiceId);
      if (!pi) continue;

      const piLine = pi.lineItems?.find((li: any) => 
        li.itemId?.toString() === entry.itemId?.toString() &&
        li.tempCode === entry.tempCode &&
        li.itemName === entry.itemName
      );

      let updated = false;

      // Check if PI line has the data
      if (piLine && (piLine.circle || piLine.package || piLine.subcircle)) {
        if (!entry.circle && piLine.circle) { entry.circle = piLine.circle; updated = true; }
        if (!entry.package && piLine.package) { entry.package = piLine.package; updated = true; }
        if (!entry.subcircle && piLine.subcircle) { entry.subcircle = piLine.subcircle; updated = true; }
      }

      // If still missing, check DI
      if (!entry.circle || !entry.package) {
        let diId = piLine?.diId;
        if (!diId && pi.lineItems) {
           const firstLi = pi.lineItems.find((li: any) => li.diId);
           if (firstLi) diId = firstLi.diId;
        }

        if (diId) {
          const di = await DI.findById(diId);
          if (di) {
            const diLine = di.lineItems?.find((dli: any) => dli._id?.toString() === piLine?.diLineId?.toString());
            
            const targetCircle = diLine?.circle || di.circle;
            const targetPackage = diLine?.package || di.package;
            const targetSubcircle = diLine?.subcircle || di.subcircle;

            if (!entry.circle && targetCircle) { entry.circle = targetCircle; updated = true; }
            if (!entry.package && targetPackage) { entry.package = targetPackage; updated = true; }
            if (!entry.subcircle && targetSubcircle) { entry.subcircle = targetSubcircle; updated = true; }

            // Update PI as well if we grabbed from DI
            if (piLine) {
               let piUpdated = false;
               if (!piLine.circle && targetCircle) { piLine.circle = targetCircle; piUpdated = true; }
               if (!piLine.package && targetPackage) { piLine.package = targetPackage; piUpdated = true; }
               if (!piLine.subcircle && targetSubcircle) { piLine.subcircle = targetSubcircle; piUpdated = true; }
               if (piUpdated) {
                 await pi.save();
               }
            }
          }
        }
      }

      if (updated) {
        if (entry.packingList && entry.packingList.length > 0) {
          entry.packingList.forEach((p: any) => {
            if (!p.packType) p.packType = 'BOX';
          });
        }
        await entry.save();
        fixedCount++;
        console.log(`Fixed StoreInwardEntry: ${entry._id}`);
      }
    }

    console.log(`Successfully fixed ${fixedCount} StoreInwardEntries.`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixMissingCirclePackage();
