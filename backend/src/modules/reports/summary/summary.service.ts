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
    transferInQty?: number;
    transferOutQty?: number;
    issuedQty?: number;
    returnedQty?: number;
  };
  setFields?: {
    stockBalance?: number;
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
    let pkg = params.package || '';
    let circ = circle || '';

    // Remove undefined increments
    const incObj: any = {};
    for (const [k, v] of Object.entries(increments)) {
      if (v !== undefined) {
        incObj[k] = v;
      }
    }

    const setObj: any = {};
    if (params.setFields) {
      for (const [k, v] of Object.entries(params.setFields)) {
        if (v !== undefined) {
          setObj[k] = v;
        }
      }
    }

    if (Object.keys(incObj).length === 0 && Object.keys(setObj).length === 0) {
      return; // Nothing to update
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

      // Force to master item dimensions to prevent transactions from creating phantom circles
      // Only do this if we are not explicitly migrating multi-circle LOA/BOM inside rebuildForItem
      // To keep it simple, we just check if the passed circle matches any valid circle on the item.
      const validCircles = [];
      if (item.dynamicData.circle) validCircles.push(item.dynamicData.circle.toLowerCase());
      
      const circles = ['solan', 'nahan', 'rampur', 'rohru'];
      for (const c of circles) {
        if (Number(item.dynamicData[`${c}LoaQuantity`]) > 0 || Number(item.dynamicData[`${c}BomQuantity`]) > 0) {
          validCircles.push(c);
        }
      }

      // If the transaction's circle isn't valid for this item, force it to the item's primary master circle
      if (circ && !validCircles.includes(circ.toLowerCase())) {
        circ = item.dynamicData.circle || circ;
        if (circ.toLowerCase().includes('package')) {
          pkg = circ;
          circ = '';
        } else {
          pkg = item.dynamicData.package || pkg;
        }
      }
    }

    const filter: Record<string, any> = {
      itemId: new mongoose.Types.ObjectId(itemId.toString()),
      circle: circ,
      package: pkg
    };
    
    // If we have multi-tenant fields, include them in the unique key.
    if (companyId) filter['companyId'] = companyId;
    if (warehouseId) filter['warehouseId'] = warehouseId;

    const update: any = {
      $setOnInsert: {
        itemName,
        loaSerialNo,
        tempCode
      }
    };
    if (Object.keys(incObj).length > 0) {
      update.$inc = incObj;
    }
    if (Object.keys(setObj).length > 0) {
      update.$set = setObj;
    }

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
      if (!item || item.isDeleted) return;

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
            let cName = line.circle || di.circle || item.dynamicData?.circle || '';
            let pName = line.package || di.package || item.dynamicData?.package || '';
            
            if (cName.toLowerCase().includes('package')) {
              pName = cName;
              cName = ''; 
            }
            
            await SummaryService.updateSummary({
              itemId,
              circle: cName,
              package: pName,
              increments: { diQty: line.quantity || 0 },
              companyId: item.companyId?.toString()
            });
          }
        }
      }

      // 4. Rebuild from PRs
      const prs = await Pr.find({ 'lineItems.itemId': itemId });
      for (const pr of prs) {
        for (const line of pr.lineItems) {
          if (line.itemId?.toString() === itemIdStr) {
            let cName = line.circle || pr.circle || item.dynamicData?.circle || '';
            let pName = line.package || pr.package || item.dynamicData?.package || '';
            
            if (cName.toLowerCase().includes('package')) {
              pName = cName;
              cName = ''; 
            }
            
            await SummaryService.updateSummary({
              itemId,
              circle: cName,
              package: pName,
              increments: { 
                invQty: line.invoiceQuantity || 0,
                actQty: line.act || 0,
                srtQty: line.srt || 0
              },
              companyId: item.companyId?.toString()
            });
          }
        }
      }

      // 5. Rebuild from StoreInwardEntry (MRHOV / Store Receipts)
      const { StoreInwardEntry } = await import('../../store/storeInwardEntry.schema');
      const storeInwards = await StoreInwardEntry.find({ itemId });
      for (const inward of storeInwards) {
        let cName = inward.circle || inward.subcircle || inward.billingFrom || item.dynamicData?.circle || '';
        let pName = inward.package || item.dynamicData?.package || '';
        if (cName.toLowerCase().includes('package')) {
          pName = cName;
          cName = '';
        }
        const qty = Number(inward.invoiceQty || inward.acceptedQty || inward.totalQty || 0);
        if (qty > 0) {
          await SummaryService.updateSummary({
            itemId,
            circle: cName,
            package: pName,
            increments: { invQty: qty },
            companyId: item.companyId?.toString()
          });
        }
      }

      // 6. Rebuild from PIs
      const invoices = await PurchaseInvoice.find({ 'lineItems.itemId': itemId });
      for (const invoice of invoices) {
        for (const line of invoice.lineItems) {
          if (line.itemId?.toString() === itemIdStr) {
            let cName = item.dynamicData?.circle || line.circle || '';
            let pName = item.dynamicData?.package || line.package || '';
            
            if (cName.toLowerCase().includes('package')) {
              pName = cName;
              cName = ''; 
            }

            await SummaryService.updateSummary({
              itemId,
              circle: cName,
              package: pName,
              increments: { billedQty: line.quantity || 0 },
              companyId: item.companyId?.toString()
            });
          }
        }
      }

      // 7. Rebuild from StoreTransfers
      const { StoreTransfer } = await import('../../store/storeTransfer.schema');
      const transfers = await StoreTransfer.find({ 'items.itemId': itemId });
      for (const t of transfers) {
        for (const line of t.items) {
          if (line.itemId?.toString() === itemIdStr) {
            const qty = Number(line.receivedQty || (line as any).transferQty || line.dispatchedQty || 0);
            if (qty > 0) {
              const fromCircle = t.fromStore?.toLowerCase().replace(/\s+/g, '') || 'default';
              const toCircle = t.toStore?.toLowerCase().replace(/\s+/g, '') || 'default';
              const pkg = (t as any).package || '';
              
              await SummaryService.updateSummary({
                itemId,
                circle: fromCircle,
                package: pkg,
                increments: { transferOutQty: qty },
                companyId: item.companyId?.toString()
              });
              
              await SummaryService.updateSummary({
                itemId,
                circle: toCircle,
                package: pkg,
                increments: { transferInQty: qty },
                companyId: item.companyId?.toString()
              });
            }
          }
        }
      }

      // 8. Rebuild from ContractorAssignments (MIN)
      const { ContractorAssignment } = await import('../../contractors/contractorAssignment.schema');
      const assignments = await ContractorAssignment.find({ 'lineItems.itemId': itemId, status: { $ne: 'Cancelled' } });
      for (const a of assignments) {
        for (const line of a.lineItems) {
          if (line.itemId?.toString() === itemIdStr) {
            const qty = Number(line.quantity || line.acceptedQuantity || line.issuedQty || 0);
            if (qty > 0) {
              await SummaryService.updateSummary({
                itemId,
                circle: a.circle || '',
                package: a.package || '',
                increments: { issuedQty: qty },
                companyId: item.companyId?.toString()
              });
            }
          }
        }
      }

      // 9. Rebuild from ContractorReturns
      const { ContractorReturn } = await import('../../contractors/contractorReturn.schema');
      const returns = await ContractorReturn.find({ 'lineItems.itemId': itemId });
      for (const r of returns) {
        for (const line of r.lineItems) {
          if (line.itemId?.toString() === itemIdStr) {
            const qty = Number(line.returnQty || line.acceptedQuantity || 0);
            if (qty > 0) {
              await SummaryService.updateSummary({
                itemId,
                circle: r.circle || '',
                package: r.package || '',
                increments: { returnedQty: qty },
                companyId: item.companyId?.toString()
              });
            }
          }
        }
      }

      // 10. Compute total real-time stock balance across all circles/packages and update Master Item
      const allSummaries = await ItemSummary.find({ itemId });
      let totalStockBalance = 0;
      
      for (const s of allSummaries) {
        const act = s.actQty || 0;
        const tin = s.transferInQty || 0;
        const tout = s.transferOutQty || 0;
        const iss = s.issuedQty || 0;
        const ret = s.returnedQty || 0;
        totalStockBalance += (act + tin + ret - iss - tout);
      }
      
      if (item) {
        item.dynamicData = item.dynamicData || {};
        item.dynamicData.stock = totalStockBalance;
        item.markModified('dynamicData');
        await item.save();
      }

    } catch (error) {
      console.error(`Error rebuilding ItemSummary for item ${itemIdStr}:`, error);
    }
  }
}
