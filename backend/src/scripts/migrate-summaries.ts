import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { ItemSummary } from '../modules/reports/summary/summary.schema';
import { SummaryService } from '../modules/reports/summary/summary.service';
import Item from '../modules/items/item.model';
import { DI } from '../modules/di/di.schema';
import { Pr } from '../modules/purchases/pr.schema';
import { PurchaseInvoice } from '../modules/purchases/purchaseInvoice.schema';

dotenv.config();

const migrate = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fastigo-erp');
    console.log('Connected to MongoDB');

    console.log('Clearing old summaries...');
    await ItemSummary.deleteMany({});

    const circles = ['solan', 'nahan', 'rampur', 'rohru'];

    console.log('Migrating Items (LOA and BOM quantities)...');
    const items = await Item.find({});
    for (const item of items) {
      if (!item.dynamicData) continue;
      
      let migratedAny = false;
      
      // Try to migrate per-circle LOA/BOM
      for (const circle of circles) {
        const loaKey = `${circle}LoaQuantity`;
        const bomKey = `${circle}BomQuantity`;
        
        const loaQty = Number(item.dynamicData[loaKey]) || 0;
        const bomQty = Number(item.dynamicData[bomKey]) || 0;
        
        if (loaQty > 0 || bomQty > 0) {
          migratedAny = true;
          await SummaryService.updateSummary({
            itemId: item._id,
            circle: circle.charAt(0).toUpperCase() + circle.slice(1),
            package: '', // Items don't have package level LOA/BOM yet
            increments: { loaQty, bomQty }
          });
        }
      }
      
      // If no per-circle LOA/BOM found, fallback to global loaQuantity based on item's circle
      if (!migratedAny) {
        const globalLoa = Number(item.dynamicData.loaQuantity) || 0;
        const globalBom = Number(item.dynamicData.bomQuantity) || Number(item.dynamicData.bom) || 0;
        
        if (globalLoa > 0 || globalBom > 0) {
          let cName = item.dynamicData.circle || '';
          let pName = '';
          
          if (cName.toLowerCase().includes('package')) {
            pName = cName;
            cName = ''; // Could map to Solan/Nahan if needed, leaving blank to match DI
          }
          
          await SummaryService.updateSummary({
            itemId: item._id,
            circle: cName,
            package: pName,
            increments: { loaQty: globalLoa, bomQty: globalBom }
          });
        }
      }
    }

    console.log('Migrating DIs...');
    const dis = await DI.find({});
    for (const di of dis) {
      for (const line of di.lineItems) {
        if (!line.itemId) continue;
        await SummaryService.updateSummary({
          itemId: line.itemId,
          circle: line.circle || di.circle,
          package: line.package || di.package,
          increments: { diQty: line.quantity || 0 }
        });
      }
    }

    console.log('Migrating PRs...');
    const prs = await Pr.find({});
    for (const pr of prs) {
      for (const line of pr.lineItems) {
        if (!line.itemId) continue;
        await SummaryService.updateSummary({
          itemId: line.itemId,
          circle: line.circle,
          package: line.package,
          increments: { 
            invQty: line.invoiceQuantity || 0,
            actQty: line.act || 0,
            srtQty: line.srt || 0
          }
        });
      }
    }

    console.log('Migrating Purchase Invoices...');
    const invoices = await PurchaseInvoice.find({});
    for (const invoice of invoices) {
      for (const line of invoice.lineItems) {
        if (!line.itemId) continue;
        await SummaryService.updateSummary({
          itemId: line.itemId,
          circle: line.circle,
          package: line.package,
          increments: { billedQty: line.quantity || 0 }
        });
      }
    }

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
};

migrate();
