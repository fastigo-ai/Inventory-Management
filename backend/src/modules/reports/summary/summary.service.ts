import mongoose, { ClientSession } from 'mongoose';
import { ItemSummary } from './summary.schema';
import Item from '../../items/item.model';

interface UpdateSummaryParams {
  itemId: string | mongoose.Types.ObjectId;
  circle?: string;
  package?: string;
  companyId?: string;
  warehouseId?: string;
  increments: {
    loaQty?: number;
    bomQty?: number;
    diQty?: number;
    invQty?: number;
    actQty?: number;
    srtQty?: number;
    billedQty?: number;
  };
  session?: ClientSession;
}

export class SummaryService {
  /**
   * Automatically updates or creates an ItemSummary record for the given dimensions.
   */
  static async updateSummary(params: UpdateSummaryParams) {
    const { itemId, circle, increments, session, companyId, warehouseId } = params;
    
    // In JS/TS 'package' is a reserved keyword, so we alias it carefully
    const pkg = params.package || '';
    const circ = circle || '';

    // Remove undefined increments
    const incObj: any = {};
    for (const [k, v] of Object.entries(increments)) {
      if (v !== undefined) {
        incObj[k] = v;
      }
    }

    if (Object.keys(incObj).length === 0) {
      return; // Nothing to increment
    }

    // Try to find if the record exists to increment, otherwise we need to get the item name for upsert.
    // Instead of querying Item every time, we can use $setOnInsert in the update.
    // But we need the item name for $setOnInsert.
    let itemName = 'Unknown Item';
    let loaSerialNo = '';
    let tempCode = '';
    
    // It's usually safe and cheap enough to just fetch the item name if we expect to cache it or we do it rarely.
    // Given the event-driven nature, fetching item is an acceptable cost to keep summary pure.
    const item = await Item.findById(itemId).select('dynamicData').session(session || null);
    if (item && item.dynamicData) {
      if (item.dynamicData.name) itemName = item.dynamicData.name;
      if (item.dynamicData.sku) loaSerialNo = item.dynamicData.sku;
      if (item.dynamicData.tempCode) tempCode = item.dynamicData.tempCode;
    }

    const filter: Record<string, any> = {
      itemId: new mongoose.Types.ObjectId(itemId.toString()),
      circle: circ,
      package: pkg
    };
    
    // If we have multi-tenant fields, include them in the unique key.
    if (companyId) filter['companyId'] = companyId;
    if (warehouseId) filter['warehouseId'] = warehouseId;

    const update = {
      $inc: incObj,
      $setOnInsert: {
        itemName,
        loaSerialNo,
        tempCode
      }
    };

    await ItemSummary.findOneAndUpdate(filter, update, {
      upsert: true,
      returnDocument: 'after',
      session
    });
  }

  /**
   * Completely rebuilds the ItemSummary records for a given item by querying all related collections.
   * This is robust and ensures accuracy after any create/update/delete operation.
   */
  static async rebuildForItem(itemIdStr: string) {
    try {
      const { DI } = await import('../../di/di.schema');
      const { Pr } = await import('../../purchases/pr.schema');
      const { PurchaseInvoice } = await import('../../purchases/purchaseInvoice.schema');
      
      const itemId = new mongoose.Types.ObjectId(itemIdStr);

      // 1. Delete all existing summaries for this item
      await ItemSummary.deleteMany({ itemId });

      // 2. Fetch the item
      const item = await Item.findById(itemId);
      if (!item) return;

      const circles = ['solan', 'nahan', 'rampur', 'rohru'];
      let migratedAny = false;

      // Migrate per-circle LOA/BOM
      for (const circle of circles) {
        const loaKey = `${circle}LoaQuantity`;
        const bomKey = `${circle}BomQuantity`;
        
        const loaQty = Number(item.dynamicData?.[loaKey]) || 0;
        const bomQty = Number(item.dynamicData?.[bomKey]) || 0;
        
        if (loaQty > 0 || bomQty > 0) {
          migratedAny = true;
          await SummaryService.updateSummary({
            itemId,
            circle: circle.charAt(0).toUpperCase() + circle.slice(1),
            package: item.dynamicData?.package || '', 
            increments: { loaQty, bomQty },
            companyId: item.companyId?.toString()
          });
        }
      }

      // If no per-circle LOA/BOM found, fallback to global loaQuantity based on item's circle
      if (!migratedAny) {
        const globalLoa = Number(item.dynamicData?.loaQuantity) || 0;
        const globalBom = Number(item.dynamicData?.bomQuantity) || Number(item.dynamicData?.bom) || 0;
        
        if (globalLoa > 0 || globalBom > 0) {
          let cName = item.dynamicData?.circle || '';
          let pName = '';
          
          if (cName.toLowerCase().includes('package')) {
            pName = cName;
            cName = ''; 
          }
          
          await SummaryService.updateSummary({
            itemId,
            circle: cName,
            package: pName || item.dynamicData?.package || '',
            increments: { loaQty: globalLoa, bomQty: globalBom },
            companyId: item.companyId?.toString()
          });
        }
      }

      // 3. Rebuild from DIs
      const dis = await DI.find({ 'lineItems.itemId': itemId });
      for (const di of dis) {
        for (const line of di.lineItems) {
          if (line.itemId?.toString() === itemIdStr) {
            await SummaryService.updateSummary({
              itemId,
              circle: line.circle || di.circle,
              package: line.package || di.package,
              increments: { diQty: line.quantity || 0 }
            });
          }
        }
      }

      // 4. Rebuild from PRs
      const prs = await Pr.find({ 'lineItems.itemId': itemId });
      for (const pr of prs) {
        for (const line of pr.lineItems) {
          if (line.itemId?.toString() === itemIdStr) {
            await SummaryService.updateSummary({
              itemId,
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
      }

      // 5. Rebuild from PIs
      const invoices = await PurchaseInvoice.find({ 'lineItems.itemId': itemId });
      for (const invoice of invoices) {
        for (const line of invoice.lineItems) {
          if (line.itemId?.toString() === itemIdStr) {
            await SummaryService.updateSummary({
              itemId,
              circle: line.circle,
              package: line.package,
              increments: { billedQty: line.quantity || 0 }
            });
          }
        }
      }

    } catch (error) {
      console.error(`Error rebuilding ItemSummary for item ${itemIdStr}:`, error);
    }
  }
}
