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
    poQty?: number;
    mhrovQty?: number;
    ra60Qty?: number;
    ra60Amt?: number;
    ra30Qty?: number;
    ra30Amt?: number;
    ra10Qty?: number;
    ra10Amt?: number;
    er90Qty?: number;
    er90Amt?: number;
    er10Qty?: number;
    er10Amt?: number;
    jmcQty?: number;
    wipQty?: number;
    cBillQty?: number;
    cBillAmt?: number;
    woQty?: number;
    demandQty?: number;
    receivedQty?: number;
  };
  setFields?: {
    stockBalance?: number;
  };
  addVendor?: string;
  addContractor?: string;
  session?: ClientSession;
}

/**
 * Normalizes package names to a canonical form to prevent duplicates due to spacing.
 * e.g. "Package 1 (S/N)" -> "Package 1(S/N)", "package 2 (r/r)" -> "Package 2(R/R)"
 */
const normalizePkg = (pkg: string): string => {
  if (!pkg) return '';
  // Remove spaces before opening parenthesis, trim, normalize case
  let normalized = pkg.trim().replace(/\s+\(/g, '(').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
  // Capitalize "Package N(X/Y)" pattern
  normalized = normalized.replace(/^package\s+(\d+)\((.+)\)$/i, (_, n, inner) =>
    `Package ${n}(${inner.toUpperCase()})`
  );
  return normalized;
};

/**
 * Normalizes circle names to Title Case to avoid NAHAN vs Nahan duplicates.
 */
const normalizeCircle = (circ: string): string => {
  if (!circ) return '';
  const c = circ.trim().toLowerCase();
  if (/solan|kumarhatti|nalagarh/.test(c)) return 'Solan';
  if (/nahan/.test(c)) return 'Nahan';
  if (/rampur/.test(c)) return 'Rampur';
  if (/rohru/.test(c)) return 'Rohru';
  return circ.trim().charAt(0).toUpperCase() + circ.trim().slice(1).toLowerCase();
};

export class SummaryService {
  /**
   * Automatically updates or creates an ItemSummary record for the given dimensions.
   */
  static async updateSummary(params: UpdateSummaryParams) {
    const { itemId, circle, increments, session, companyId, warehouseId } = params;
    
    // In JS/TS 'package' is a reserved keyword, so we alias it carefully
    let pkg = normalizePkg(params.package || '');
    let circ = normalizeCircle(circle || '');

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
    if (params.addVendor && params.addVendor.trim() !== '') {
      update.$addToSet = update.$addToSet || {};
      update.$addToSet.vendors = params.addVendor.trim();
    }
    if (params.addContractor && params.addContractor.trim() !== '') {
      update.$addToSet = update.$addToSet || {};
      update.$addToSet.contractors = params.addContractor.trim();
    }

    await ItemSummary.findOneAndUpdate(filter, update, {
      upsert: true,
      returnDocument: 'after',
      session
    });
    itemSummaryCache.clear();
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

      // 2.5 Rebuild from POs
      const { PurchaseOrder } = await import('../../purchases/purchaseOrder.schema');
      const pos = await PurchaseOrder.find({ 'lineItems.itemId': itemId });
      for (const po of pos) {
        for (const line of po.lineItems) {
          if (line.itemId?.toString() === itemIdStr) {
            let cName = line.circle || po.circle || item.dynamicData?.circle || '';
            let pName = line.package || po.package || item.dynamicData?.package || '';
            
            if (cName.toLowerCase().includes('package')) {
              pName = cName;
              cName = ''; 
            }
            
            await SummaryService.updateSummary({
              itemId,
              circle: cName,
              package: pName,
              increments: { poQty: line.quantity || 0 },
              addVendor: po.vendorName,
              companyId: item.companyId?.toString()
            });
          }
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
              addVendor: di.vendorName,
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
              addVendor: invoice.vendorName,
              companyId: item.companyId?.toString()
            });
          }
        }
      }

      // 6.5 Rebuild from MHROVs
      const { Mhrov } = await import('../../store/mhrov.schema');
      const mhrovs = await Mhrov.find({ 'items.itemId': itemId, status: { $ne: 'Cancelled' } });
      for (const m of mhrovs) {
        if (m.items) {
          for (const line of m.items) {
            if (line.itemId?.toString() === itemIdStr) {
              let cName = m.circle || item.dynamicData?.circle || '';
              let pName = m.package || item.dynamicData?.package || '';
              
              if (cName.toLowerCase().includes('package')) {
                pName = cName;
                cName = ''; 
              }
  
              await SummaryService.updateSummary({
                itemId,
                circle: cName,
                package: pName,
                increments: { mhrovQty: line.mhrovDoneQty || 0 },
                companyId: item.companyId?.toString()
              });
            }
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
                addContractor: a.contractorFarmName,
                companyId: item.companyId?.toString()
              });
            }
          }
        }
      }

      // 9. Rebuild from ContractorReturns
      const { ContractorReturn } = await import('../../contractors/contractorReturn.schema');
      const returns = await ContractorReturn.find({ 'lineItems.itemId': itemId, status: { $ne: 'Cancelled' } });
      for (const r of returns) {
        for (const line of r.lineItems) {
          if (line.itemId?.toString() === itemIdStr) {
            const qty = Number(line.returnQty ?? line.quantity ?? line.acceptedQuantity ?? 0);
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
      // 9.5 Rebuild from ContractorWorkOrder
      const { ContractorWorkOrder } = await import('../../contractors/contractorWorkOrder.schema');
      const wos = await ContractorWorkOrder.find({ 'items.itemId': itemId });
      for (const wo of wos) {
        for (const line of wo.items) {
          if (line.itemId?.toString() === itemIdStr) {
            const qty = Number(line.woQty || 0);
            if (qty > 0) {
              await SummaryService.updateSummary({
                itemId,
                circle: wo.circle || '',
                package: wo.package || '',
                increments: { woQty: qty },
                companyId: item.companyId?.toString()
              });
            }
          }
        }
      }

      // 10. Rebuild from JmcRegister
      const { JmcRegister } = await import('../../jmc/jmc.schema');
      const jmcs = await JmcRegister.find({ 'items.itemId': itemId, status: { $ne: 'Rejected' } });
      for (const jmc of jmcs) {
        for (const line of jmc.items) {
          if (line.itemId?.toString() === itemIdStr) {
            const qty = Number(line.approvedQty || line.claimedQty || 0);
            if (qty > 0) {
              await SummaryService.updateSummary({
                itemId, circle: jmc.circle || '', package: jmc.package || '',
                increments: { jmcQty: qty },
                addContractor: (jmc as any).contractorName || '',
                companyId: item.companyId?.toString()
              });
            }
          }
        }
      }

      // 10.5 Rebuild from WipRegister
      const { WipRegister } = await import('../../wip/wip.schema');
      const wips = await WipRegister.find({ 'items.itemId': itemId, status: { $ne: 'Rejected' } });
      for (const wip of wips) {
        for (const line of wip.items) {
          if (line.itemId?.toString() === itemIdStr) {
            const qty = Number(line.approvedQty || line.claimedQty || 0);
            if (qty > 0) {
              await SummaryService.updateSummary({
                itemId, circle: wip.circle || '', package: wip.package || '',
                increments: { wipQty: qty },
                addContractor: (wip as any).contractorName || '',
                companyId: item.companyId?.toString()
              });
            }
          }
        }
      }

      // 11. Rebuild from ContractorInvoice
      const { ContractorInvoice } = await import('../../contractor-billing/contractorInvoice.schema');
      const cInvoices = await ContractorInvoice.find({ 'lineItems.itemId': itemId });
      for (const inv of cInvoices) {
        for (const line of inv.lineItems) {
          if (line.itemId?.toString() === itemIdStr) {
            const qty = Number(line.erectedQty || line.jmcDoneQty || 0);
            const amt = Number(line.totalAmount || line.baseAmount || 0);
            if (qty > 0 || amt > 0) {
              await SummaryService.updateSummary({
                itemId, circle: inv.legacyMetadata?.circle || '', package: inv.legacyMetadata?.package || '',
                increments: { cBillQty: qty, cBillAmt: amt },
                companyId: item.companyId?.toString()
              });
            }
          }
        }
      }

      // 12. Rebuild from ClientBill
      const { ClientBill } = await import('../../client-billing/clientBill.schema');
      const clientBills = await ClientBill.find({ 'items.itemId': itemId, status: { $ne: 'Rejected' } });
      for (const cb of clientBills) {
        for (const line of cb.items) {
          if (line.itemId?.toString() === itemIdStr) {
            const qty = Number(line.raBillQty || line.sourceDoneQty || 0);
            const amt = Number(line.totalAmount || (qty * (line.boqRate || 0)) || 0);
            if (qty > 0 || amt > 0) {
              const increments: any = {};
              if (cb.billType === 'Supply') {
                if (cb.stage === '60%') { increments.ra60Qty = qty; increments.ra60Amt = amt; }
                else if (cb.stage === '30%') { increments.ra30Qty = qty; increments.ra30Amt = amt; }
                else if (cb.stage === '10%') { increments.ra10Qty = qty; increments.ra10Amt = amt; }
              } else if (cb.billType === 'Erection') {
                if (cb.stage === '90%') { increments.er90Qty = qty; increments.er90Amt = amt; }
                else if (cb.stage === '10%') { increments.er10Qty = qty; increments.er10Amt = amt; }
              }
              await SummaryService.updateSummary({
                itemId, circle: cb.circle || '', package: cb.package || '',
                increments,
                companyId: item.companyId?.toString()
              });
            }
          }
        }
      }

      // 13. Rebuild from DemandNotes
      const { default: DemandNote } = await import('../../demand-notes/demandNote.schema');
      const demandNotes = await DemandNote.find({ 'items.itemId': itemId, status: { $ne: 'Rejected' } });
      for (const dn of demandNotes) {
        for (const line of dn.items) {
          if (line.itemId?.toString() === itemIdStr) {
            const qty = Number(line.demandQty || 0);
            if (qty > 0) {
              await SummaryService.updateSummary({
                itemId,
                circle: dn.circle || '',
                package: dn.package || '',
                increments: { demandQty: qty },
                companyId: item.companyId?.toString()
              });
            }
          }
        }
      }


      // 9.5 Guarantee at least one summary exists
      const existingSummary = await ItemSummary.findOne({ itemId });
      if (!existingSummary) {
        let cName = item.dynamicData?.circle || '';
        let pName = item.dynamicData?.package || '';
        if (cName.toLowerCase().includes('package')) {
          pName = cName;
          cName = '';
        }
        await SummaryService.updateSummary({
          itemId,
          circle: cName,
          package: pName,
          increments: {},
          companyId: item.companyId?.toString()
        });
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
      itemSummaryCache.clear();

    } catch (error) {
      console.error(`Error rebuilding ItemSummary for item ${itemIdStr}:`, error);
    }
  }

  /**
   * High-performance fetch of Item Summary records with in-memory caching and query optimization.
   */
  static async fetchItemSummaries(queryParams: any) {
    const cacheKey = JSON.stringify(queryParams);
    const cached = itemSummaryCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < ITEM_SUMMARY_CACHE_TTL)) {
      if (cached.promise) return await cached.promise;
      if (cached.data) return cached.data;
    }

    const fetchPromise = (async () => {
      const { 
        circle, 
        package: pkg, 
        itemName, 
        description, 
        loaSerialNo, 
        tempCode, 
        page = '1', 
        limit = '50', 
        companyId, 
        sortField, 
        sortOrder 
      } = queryParams;

      const filter: any = {};
      if (circle && circle !== 'All') filter.circle = { $regex: new RegExp(`^${circle}$`, 'i') };
      if (pkg && pkg !== 'All') filter.package = { $regex: new RegExp(`^${pkg.toString().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };
      if (companyId) filter.companyId = companyId;
      
      if (itemName) filter.itemName = { $regex: itemName, $options: 'i' };
      if (description) filter.description = { $regex: description, $options: 'i' };
      if (loaSerialNo) {
        const q = loaSerialNo as string;
        if (/^\d+$/.test(q)) {
          filter.loaSerialNo = q;
        } else {
          filter.loaSerialNo = { $regex: q, $options: 'i' };
        }
      }
      if (tempCode) filter.tempCode = tempCode;

      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 50;
      const skip = (pageNum - 1) * limitNum;

      let sortObj: any = { itemName: 1, circle: 1, package: 1 };
      if (sortField) {
        const field = sortField as string;
        const order = sortOrder === 'desc' ? -1 : 1;
        sortObj = { [field]: order };
      }

      // 1. Calculate totals
      const totalAggregation = await ItemSummary.aggregate([
        { $match: filter },
        { $group: { 
            _id: { itemName: "$itemName", circle: "$circle", package: "$package" },
            loaQty: { $sum: "$loaQty" },
            bomQty: { $sum: "$bomQty" },
            diQty: { $sum: "$diQty" },
            invQty: { $sum: "$invQty" },
            actQty: { $sum: "$actQty" },
            srtQty: { $sum: "$srtQty" },
            billedQty: { $sum: "$billedQty" },
            woQty: { $sum: "$woQty" },
            ra60Qty: { $sum: "$ra60Qty" },
            ra60Amt: { $sum: "$ra60Amt" },
            ra30Qty: { $sum: "$ra30Qty" },
            ra30Amt: { $sum: "$ra30Amt" },
            ra10Qty: { $sum: "$ra10Qty" },
            ra10Amt: { $sum: "$ra10Amt" },
            er90Qty: { $sum: "$er90Qty" },
            er90Amt: { $sum: "$er90Amt" },
            er10Qty: { $sum: "$er10Qty" },
            er10Amt: { $sum: "$er10Amt" },
            cBillQty: { $sum: "$cBillQty" },
            cBillAmt: { $sum: "$cBillAmt" },
            mhrovQty: { $sum: "$mhrovQty" },
            returnedQty: { $sum: "$returnedQty" },
            transferInQty: { $sum: "$transferInQty" },
            transferOutQty: { $sum: "$transferOutQty" },
            demandQty: { $sum: "$demandQty" },
            receivedQty: { $sum: "$receivedQty" }
          } 
        },
        { $group: { 
            _id: null, 
            total: { $sum: 1 },
            totalLoaQty: { $sum: "$loaQty" },
            totalBomQty: { $sum: "$bomQty" },
            totalDiQty: { $sum: "$diQty" },
            totalInvQty: { $sum: "$invQty" },
            totalActQty: { $sum: "$actQty" },
            totalSrtQty: { $sum: "$srtQty" },
            totalBilledQty: { $sum: "$billedQty" },
            totalWoQty: { $sum: "$woQty" },
            totalRa60Qty: { $sum: "$ra60Qty" },
            totalRa60Amt: { $sum: "$ra60Amt" },
            totalRa30Qty: { $sum: "$ra30Qty" },
            totalRa30Amt: { $sum: "$ra30Amt" },
            totalRa10Qty: { $sum: "$ra10Qty" },
            totalRa10Amt: { $sum: "$ra10Amt" },
            totalEr90Qty: { $sum: "$er90Qty" },
            totalEr90Amt: { $sum: "$er90Amt" },
            totalEr10Qty: { $sum: "$er10Qty" },
            totalEr10Amt: { $sum: "$er10Amt" },
            totalCBillQty: { $sum: "$cBillQty" },
            totalCBillAmt: { $sum: "$cBillAmt" },
            totalMhrovQty: { $sum: "$mhrovQty" },
            totalReturnedQty: { $sum: "$returnedQty" },
            totalTransferInQty: { $sum: "$transferInQty" },
            totalTransferOutQty: { $sum: "$transferOutQty" },
            totalDemandQty: { $sum: "$demandQty" },
            totalReceivedQty: { $sum: "$receivedQty" }
          } 
        }
      ]);
      const totalItems = totalAggregation.length > 0 ? totalAggregation[0].total : 0;
      
      const totals = totalAggregation.length > 0 ? {
        loaQty: totalAggregation[0].totalLoaQty,
        bomQty: totalAggregation[0].totalBomQty,
        diQty: totalAggregation[0].totalDiQty,
        invQty: totalAggregation[0].totalInvQty,
        actQty: totalAggregation[0].totalActQty,
        srtQty: totalAggregation[0].totalSrtQty,
        billedQty: totalAggregation[0].totalBilledQty,
        woQty: totalAggregation[0].totalWoQty,
        ra60Qty: totalAggregation[0].totalRa60Qty,
        ra60Amt: totalAggregation[0].totalRa60Amt,
        ra30Qty: totalAggregation[0].totalRa30Qty,
        ra30Amt: totalAggregation[0].totalRa30Amt,
        ra10Qty: totalAggregation[0].totalRa10Qty,
        ra10Amt: totalAggregation[0].totalRa10Amt,
        er90Qty: totalAggregation[0].totalEr90Qty,
        er90Amt: totalAggregation[0].totalEr90Amt,
        er10Qty: totalAggregation[0].totalEr10Qty,
        er10Amt: totalAggregation[0].totalEr10Amt,
        cBillQty: totalAggregation[0].totalCBillQty,
        cBillAmt: totalAggregation[0].totalCBillAmt,
        mhrovQty: totalAggregation[0].totalMhrovQty,
        returnedQty: totalAggregation[0].totalReturnedQty,
        transferInQty: totalAggregation[0].totalTransferInQty,
        transferOutQty: totalAggregation[0].totalTransferOutQty,
        demandQty: totalAggregation[0].totalDemandQty,
        receivedQty: totalAggregation[0].totalReceivedQty,
        balLoaBilled: totalAggregation[0].totalLoaQty - totalAggregation[0].totalBilledQty,
        balBomBilled: totalAggregation[0].totalBomQty - totalAggregation[0].totalBilledQty,
        goodDispatch: totalAggregation[0].totalActQty,
        balDispatchVsDi: totalAggregation[0].totalDiQty - totalAggregation[0].totalActQty,
        diBalAsPerLoa: totalAggregation[0].totalLoaQty - totalAggregation[0].totalActQty,
        diBalAsPerBom: totalAggregation[0].totalBomQty - totalAggregation[0].totalActQty,
        balDiIssuedAsPerLoa: totalAggregation[0].totalLoaQty - totalAggregation[0].totalDiQty,
        balDiIssuedAsPerBom: totalAggregation[0].totalBomQty - totalAggregation[0].totalDiQty
      } : null;

      // 2. Base grouping and masterItem join
      const basePipeline: any[] = [
        { $match: filter },
        { $group: {
            _id: { itemId: "$itemId", circle: "$circle", package: "$package" },
            itemName: { $first: "$itemName" },
            itemId: { $first: "$itemId" },
            loaSerialNo: { $first: "$loaSerialNo" },
            tempCode: { $first: "$tempCode" },
            loaQty: { $sum: "$loaQty" },
            bomQty: { $sum: "$bomQty" },
            diQty: { $sum: "$diQty" },
            invQty: { $sum: "$invQty" },
            actQty: { $sum: "$actQty" },
            srtQty: { $sum: "$srtQty" },
            billedQty: { $sum: "$billedQty" },
            poQty: { $sum: "$poQty" },
            mhrovQty: { $sum: "$mhrovQty" },
            ra60Qty: { $sum: "$ra60Qty" },
            ra60Amt: { $sum: "$ra60Amt" },
            ra30Qty: { $sum: "$ra30Qty" },
            ra30Amt: { $sum: "$ra30Amt" },
            ra10Qty: { $sum: "$ra10Qty" },
            ra10Amt: { $sum: "$ra10Amt" },
            er90Qty: { $sum: "$er90Qty" },
            er90Amt: { $sum: "$er90Amt" },
            er10Qty: { $sum: "$er10Qty" },
            er10Amt: { $sum: "$er10Amt" },
            jmcQty: { $sum: "$jmcQty" },
            wipQty: { $sum: "$wipQty" },
            cBillQty: { $sum: "$cBillQty" },
            cBillAmt: { $sum: "$cBillAmt" },
            woQty: { $sum: "$woQty" },
            demandQty: { $sum: "$demandQty" },
            receivedQty: { $sum: "$receivedQty" },
            transferInQty: { $sum: "$transferInQty" },
            transferOutQty: { $sum: "$transferOutQty" },
            issuedQty: { $sum: "$issuedQty" },
            returnedQty: { $sum: "$returnedQty" },
            contractorBreakdown: { $mergeObjects: "$contractorBreakdown" },
            vendors: { $push: "$vendors" },
            contractors: { $push: "$contractors" }
          }
        },
        { $lookup: {
            from: 'items',
            localField: 'itemId',
            foreignField: '_id',
            as: 'masterItem'
          }
        },
        { $unwind: { path: '$masterItem', preserveNullAndEmptyArrays: true } },
        { $sort: sortObj },
        { $skip: skip },
        { $limit: limitNum }
      ];

      // Projection stage
      basePipeline.push({
        $project: {
          _id: 0,
          itemId: 1,
          itemName: "$itemName",
          circle: "$_id.circle",
          package: {
            $let: {
              vars: { c: { $toLower: { $ifNull: ["$_id.circle", ""] } }, p: { $ifNull: ["$_id.package", ""] } },
              in: {
                $cond: [
                  { $and: [{ $ne: ["$$p", ""] }, { $ne: ["$$p", "-"] }, { $ne: ["$$p", "Unknown"] }] },
                  "$$p",
                  {
                    $switch: {
                      branches: [
                        { case: { $or: [{ $regexMatch: { input: "$$c", regex: "nahan" } }, { $regexMatch: { input: "$$c", regex: "solan" } }] }, then: "Package 1(S/N)" },
                        { case: { $or: [{ $regexMatch: { input: "$$c", regex: "rampur" } }, { $regexMatch: { input: "$$c", regex: "rohru" } }] }, then: "Package 2(R/R)" }
                      ],
                      default: { $ifNull: ["$masterItem.dynamicData.package", "Unknown"] }
                    }
                  }
                ]
              }
            }
          },
          loaSerialNo: "$masterItem.dynamicData.loaSerialNo",
          activity: "$masterItem.dynamicData.activity",
          unit: { $ifNull: ["$masterItem.dynamicData.unit", { $ifNull: ["$masterItem.unit", "Nos"] }] },
          rate: { $ifNull: ["$masterItem.dynamicData.supplyRateWithGst", { $ifNull: ["$masterItem.costPrice", 150] }] },
          tempCode: 1,
          diQty: 1,
          invQty: 1,
          actQty: 1,
          srtQty: 1,
          billedQty: 1,
          poQty: 1,
          mhrovQty: 1,
          ra60Qty: 1,
          ra60Amt: 1,
          ra30Qty: 1,
          ra30Amt: 1,
          ra10Qty: 1,
          ra10Amt: 1,
          er90Qty: 1,
          er90Amt: 1,
          er10Qty: 1,
          er10Amt: 1,
          jmcQty: 1,
          wipQty: 1,
          cBillQty: 1,
          cBillAmt: 1,
          vendors: 1,
          contractors: 1,
          contractorBreakdown: 1,
          transferInQty: 1,
          transferOutQty: 1,
          issuedQty: 1,
          returnedQty: 1,
          woQty: 1,
          demandQty: 1,
          receivedQty: 1,
          loaQty: {
            $let: {
              vars: { c: { $toLower: "$_id.circle" } },
              in: {
                $convert: {
                  input: {
                    $switch: {
                      branches: [
                        { case: { $eq: ["$$c", "solan"] }, then: "$masterItem.dynamicData.solanLoaQuantity" },
                        { case: { $eq: ["$$c", "nahan"] }, then: "$masterItem.dynamicData.nahanLoaQuantity" },
                        { case: { $eq: ["$$c", "rampur"] }, then: "$masterItem.dynamicData.rampurLoaQuantity" },
                        { case: { $eq: ["$$c", "rohru"] }, then: "$masterItem.dynamicData.rohruLoaQuantity" }
                      ],
                      default: "$masterItem.dynamicData.loaQuantity"
                    }
                  },
                  to: "double",
                  onError: { $ifNull: ["$loaQty", 0] },
                  onNull: { $ifNull: ["$loaQty", 0] }
                }
              }
            }
          },
          bomQty: {
            $let: {
              vars: { c: { $toLower: "$_id.circle" } },
              in: {
                $convert: {
                  input: {
                    $switch: {
                      branches: [
                        { case: { $eq: ["$$c", "solan"] }, then: "$masterItem.dynamicData.solanBomQuantity" },
                        { case: { $eq: ["$$c", "nahan"] }, then: "$masterItem.dynamicData.nahanBomQuantity" },
                        { case: { $eq: ["$$c", "rampur"] }, then: "$masterItem.dynamicData.rampurBomQuantity" },
                        { case: { $eq: ["$$c", "rohru"] }, then: "$masterItem.dynamicData.rohruBomQuantity" }
                      ],
                      default: "$masterItem.dynamicData.bomQuantity"
                    }
                  },
                  to: "double",
                  onError: { $ifNull: ["$bomQty", 0] },
                  onNull: { $ifNull: ["$bomQty", 0] }
                }
              }
            }
          }
        }
      });

      // Add derived fields
      basePipeline.push({
        $addFields: {
          balLoaBilled: { $subtract: [{ $ifNull: ["$loaQty", 0] }, { $ifNull: ["$billedQty", 0] }] },
          balBomBilled: { $subtract: [{ $ifNull: ["$bomQty", 0] }, { $ifNull: ["$billedQty", 0] }] },
          goodDispatch: { $ifNull: ["$actQty", 0] },
          balDispatchVsDi: { $subtract: [{ $ifNull: ["$diQty", 0] }, { $ifNull: ["$actQty", 0] }] },
          diBalAsPerLoa: { $subtract: [{ $ifNull: ["$loaQty", 0] }, { $ifNull: ["$actQty", 0] }] },
          diBalAsPerBom: { $subtract: [{ $ifNull: ["$bomQty", 0] }, { $ifNull: ["$actQty", 0] }] },
          balDiIssuedAsPerLoa: { $subtract: [{ $ifNull: ["$loaQty", 0] }, { $ifNull: ["$diQty", 0] }] },
          balDiIssuedAsPerBom: { $subtract: [{ $ifNull: ["$bomQty", 0] }, { $ifNull: ["$diQty", 0] }] },
          pendingInvoice: { $subtract: [{ $ifNull: ["$actQty", 0] }, { $ifNull: ["$billedQty", 0] }] },
          remainingLoa: { $subtract: [{ $ifNull: ["$loaQty", 0] }, { $ifNull: ["$billedQty", 0] }] },
          remainingBom: { $subtract: [{ $ifNull: ["$bomQty", 0] }, { $ifNull: ["$actQty", 0] }] },
          variance: { $subtract: [{ $ifNull: ["$diQty", 0] }, { $ifNull: ["$actQty", 0] }] },
          completionPercent: { 
            $cond: [
              { $gt: ["$loaQty", 0] },
              { $multiply: [{ $divide: [{ $ifNull: ["$actQty", 0] }, "$loaQty"] }, 100] },
              0
            ]
          }
        }
      });

      const summaries = await ItemSummary.aggregate(basePipeline);

      // Perform fast batch lookups to enrich all items with latest document details & live aggregates
      const db = mongoose.connection.db;
      let enrichedSummaries = summaries;

      if (db && summaries.length > 0) {
        const itemIds = summaries.map(s => s.itemId).filter(Boolean);
        const isSmallBatch = itemIds.length > 0 && itemIds.length <= 100;
        const idMatch = isSmallBatch ? { itemId: { $in: itemIds } } : null;
        const lineItemMatch = isSmallBatch ? { 'lineItems.itemId': { $in: itemIds } } : null;
        const itemsMatch = isSmallBatch ? { 'items.itemId': { $in: itemIds } } : null;

        const [
          latestInwards,
          latestDIs,
          latestPIs,
          latestPOs,
          latestMINs,
          latestDNs,
          latestMHROVs,
          latestCBs,
          latestWOs,
          cbAgg,
          ciAgg,
          mhrovAgg,
          retAgg,
          stAgg
        ] = await Promise.all([
          // 1. Inward entries - sorted by latest inward date (receivedDate or invoiceDate)
          db.collection('storeinwardentries').aggregate([
            ...(idMatch ? [{ $match: idMatch }] : []),
            { $sort: { receivedDate: -1, invoiceDate: -1, createdAt: -1 } },
            { $group: {
                _id: "$itemId",
                grnNo: { $first: { $ifNull: ["$grNumber", "$inwardId"] } },
                inwardDate: { $first: { $ifNull: ["$receivedDate", "$invoiceDate"] } },
                receivedQty: { $first: "$totalQty" }
              }
            }
          ]).toArray(),

          // 2. DIs - sorted by latest diDate
          db.collection('dis').aggregate([
            ...(lineItemMatch ? [{ $match: lineItemMatch }] : []),
            { $sort: { diDate: -1, date: -1, createdAt: -1 } },
            { $unwind: "$lineItems" },
            ...(lineItemMatch ? [{ $match: lineItemMatch }] : []),
            { $group: {
                _id: "$lineItems.itemId",
                diNo: { $first: "$diNumber" },
                diDate: { $first: { $ifNull: ["$diDate", "$date"] } },
                diStatus: { $first: "$status" }
              }
            }
          ]).toArray(),

          // 3. Purchase Invoices - sorted by latest invoiceDate
          db.collection('purchaseinvoices').aggregate([
            ...(lineItemMatch ? [{ $match: lineItemMatch }] : []),
            { $sort: { invoiceDate: -1, date: -1, createdAt: -1 } },
            { $unwind: "$lineItems" },
            ...(lineItemMatch ? [{ $match: lineItemMatch }] : []),
            { $group: {
                _id: "$lineItems.itemId",
                piNo: { $first: "$invoiceNumber" },
                piDate: { $first: { $ifNull: ["$invoiceDate", "$date"] } },
                piStatus: { $first: { $ifNull: ["$paymentStatus", "$status"] } }
              }
            }
          ]).toArray(),

          // 4. Purchase Orders - sorted by latest poDate
          db.collection('purchaseorders').aggregate([
            ...(lineItemMatch ? [{ $match: lineItemMatch }] : []),
            { $sort: { poDate: -1, date: -1, createdAt: -1 } },
            { $unwind: "$lineItems" },
            ...(lineItemMatch ? [{ $match: lineItemMatch }] : []),
            { $group: {
                _id: "$lineItems.itemId",
                poNo: { $first: { $ifNull: ["$purchaseOrderNumber", "$poNumber"] } },
                poDate: { $first: { $ifNull: ["$poDate", "$date"] } },
                poStatus: { $first: "$status" }
              }
            }
          ]).toArray(),

          // 5. MINs (contractorassignments) - sorted by latest minDate
          db.collection('contractorassignments').aggregate([
            ...(lineItemMatch ? [{ $match: lineItemMatch }] : []),
            { $sort: { minDate: -1, date: -1, createdAt: -1 } },
            { $unwind: "$lineItems" },
            ...(lineItemMatch ? [{ $match: lineItemMatch }] : []),
            { $group: {
                _id: "$lineItems.itemId",
                minNo: { $first: { $ifNull: ["$minNo", "$assignmentNumber"] } },
                minDate: { $first: { $ifNull: ["$minDate", "$date"] } },
                contractorName: { $first: "$contractorFarmName" }
              }
            }
          ]).toArray(),

          // 6. Demand Notes - sorted by latest createdAt
          db.collection('demandnotes').aggregate([
            ...(itemsMatch ? [{ $match: itemsMatch }] : []),
            { $sort: { createdAt: -1 } },
            { $unwind: "$items" },
            ...(itemsMatch ? [{ $match: itemsMatch }] : []),
            { $group: {
                _id: "$items.itemId",
                dnNo: { $first: "$demandNoteNumber" },
                dnDate: { $first: "$createdAt" },
                contractorName: { $first: "$contractorName" }
              }
            }
          ]).toArray(),

          // 7. MHROVs - sorted by latest createdAt
          db.collection('mhrovs').aggregate([
            ...(itemsMatch ? [{ $match: itemsMatch }] : []),
            { $sort: { createdAt: -1 } },
            { $unwind: "$items" },
            ...(itemsMatch ? [{ $match: itemsMatch }] : []),
            { $group: {
                _id: "$items.itemId",
                mrhovNo: { $first: "$mhrovNumber" },
                mrhovStatus: { $first: "$status" }
              }
            }
          ]).toArray(),

          // 8. Client Bills - sorted by latest raBillDate
          db.collection('clientbills').aggregate([
            ...(itemsMatch ? [{ $match: itemsMatch }] : []),
            { $sort: { raBillDate: -1, createdAt: -1 } },
            { $unwind: "$items" },
            ...(itemsMatch ? [{ $match: itemsMatch }] : []),
            { $group: {
                _id: "$items.itemId",
                raNo: { $first: "$raBillNo" },
                raDate: { $first: "$raBillDate" }
              }
            }
          ]).toArray(),

          // 9. Work Orders - sorted by latest createdAt
          db.collection('contractorworkorders').aggregate([
            ...(itemsMatch ? [{ $match: itemsMatch }] : []),
            { $sort: { createdAt: -1 } },
            { $unwind: "$items" },
            ...(itemsMatch ? [{ $match: itemsMatch }] : []),
            { $group: {
                _id: "$items.itemId",
                woNo: { $first: "$workOrderNumber" },
                woDate: { $first: "$createdAt" }
              }
            }
          ]).toArray(),

          // 10. ClientBills Live Aggregates
          db.collection('clientbills').aggregate([
            { $match: { status: { $ne: 'Rejected' }, ...(itemsMatch || {}) } },
            { $unwind: "$items" },
            ...(itemsMatch ? [{ $match: itemsMatch }] : []),
            { $group: {
                _id: "$items.itemId",
                ra60Qty: {
                  $sum: {
                    $cond: [
                      { $and: [{ $eq: ["$billType", "Supply"] }, { $eq: ["$stage", "60%"] }] },
                      { $ifNull: ["$items.raBillQty", "$items.sourceDoneQty"] },
                      0
                    ]
                  }
                },
                ra60Amt: {
                  $sum: {
                    $cond: [
                      { $and: [{ $eq: ["$billType", "Supply"] }, { $eq: ["$stage", "60%"] }] },
                      { $ifNull: ["$items.totalAmount", 0] },
                      0
                    ]
                  }
                },
                ra30Qty: {
                  $sum: {
                    $cond: [
                      { $and: [{ $eq: ["$billType", "Supply"] }, { $eq: ["$stage", "30%"] }] },
                      { $ifNull: ["$items.raBillQty", "$items.sourceDoneQty"] },
                      0
                    ]
                  }
                },
                ra30Amt: {
                  $sum: {
                    $cond: [
                      { $and: [{ $eq: ["$billType", "Supply"] }, { $eq: ["$stage", "30%"] }] },
                      { $ifNull: ["$items.totalAmount", 0] },
                      0
                    ]
                  }
                },
                ra10Qty: {
                  $sum: {
                    $cond: [
                      { $and: [{ $eq: ["$billType", "Supply"] }, { $eq: ["$stage", "10%"] }] },
                      { $ifNull: ["$items.raBillQty", "$items.sourceDoneQty"] },
                      0
                    ]
                  }
                },
                ra10Amt: {
                  $sum: {
                    $cond: [
                      { $and: [{ $eq: ["$billType", "Supply"] }, { $eq: ["$stage", "10%"] }] },
                      { $ifNull: ["$items.totalAmount", 0] },
                      0
                    ]
                  }
                },
                er90Qty: {
                  $sum: {
                    $cond: [
                      { $and: [{ $eq: ["$billType", "Erection"] }, { $eq: ["$stage", "90%"] }] },
                      { $ifNull: ["$items.raBillQty", "$items.sourceDoneQty"] },
                      0
                    ]
                  }
                },
                er90Amt: {
                  $sum: {
                    $cond: [
                      { $and: [{ $eq: ["$billType", "Erection"] }, { $eq: ["$stage", "90%"] }] },
                      { $ifNull: ["$items.totalAmount", 0] },
                      0
                    ]
                  }
                },
                er10Qty: {
                  $sum: {
                    $cond: [
                      { $and: [{ $eq: ["$billType", "Erection"] }, { $eq: ["$stage", "10%"] }] },
                      { $ifNull: ["$items.raBillQty", "$items.sourceDoneQty"] },
                      0
                    ]
                  }
                },
                er10Amt: {
                  $sum: {
                    $cond: [
                      { $and: [{ $eq: ["$billType", "Erection"] }, { $eq: ["$stage", "10%"] }] },
                      { $ifNull: ["$items.totalAmount", 0] },
                      0
                    ]
                  }
                }
              }
            }
          ]).toArray(),

          // 11. ContractorInvoices Live Aggregates
          db.collection('contractorinvoices').aggregate([
            { $match: { status: { $ne: 'Rejected' }, ...(lineItemMatch || {}) } },
            { $unwind: "$lineItems" },
            ...(lineItemMatch ? [{ $match: lineItemMatch }] : []),
            { $group: {
                _id: "$lineItems.itemId",
                cBillQty: { $sum: { $ifNull: ["$lineItems.erectedQty", "$lineItems.jmcDoneQty"] } },
                cBillAmt: { $sum: { $ifNull: ["$lineItems.totalAmount", "$lineItems.baseAmount"] } }
              }
            }
          ]).toArray(),

          // 12. MHROVs Live Aggregates
          db.collection('mhrovs').aggregate([
            { $match: { status: { $ne: 'Cancelled' }, ...(itemsMatch || {}) } },
            { $unwind: "$items" },
            ...(itemsMatch ? [{ $match: itemsMatch }] : []),
            { $group: {
                _id: "$items.itemId",
                mhrovQty: { $sum: "$items.mhrovDoneQty" }
              }
            }
          ]).toArray(),

          // 13. ContractorReturns Live Aggregates
          db.collection('contractorreturns').aggregate([
            { $match: { status: { $ne: 'Cancelled' }, ...(lineItemMatch || {}) } },
            { $unwind: "$lineItems" },
            ...(lineItemMatch ? [{ $match: lineItemMatch }] : []),
            { $group: {
                _id: "$lineItems.itemId",
                returnedQty: { $sum: { $ifNull: ["$lineItems.returnQty", { $ifNull: ["$lineItems.quantity", "$lineItems.acceptedQuantity"] }] } }
              }
            }
          ]).toArray(),

          // 14. StoreTransfers Live Aggregates
          db.collection('storetransfers').aggregate([
            { $match: { status: { $ne: 'Cancelled' }, ...(itemsMatch || {}) } },
            { $unwind: "$items" },
            ...(itemsMatch ? [{ $match: itemsMatch }] : []),
            { $group: {
                _id: "$items.itemId",
                transferOutQty: { $sum: { $ifNull: ["$items.dispatchedQty", { $ifNull: ["$items.transferQty", "$items.receivedQty"] }] } },
                transferInQty: { $sum: { $ifNull: ["$items.receivedQty", 0] } }
              }
            }
          ]).toArray()
        ]);

        const toMap = (arr: any[]) => {
          const m = new Map<string, any>();
          for (const item of arr) {
            if (item && item._id) m.set(item._id.toString(), item);
          }
          return m;
        };

        const inwardMap = toMap(latestInwards);
        const diMap = toMap(latestDIs);
        const piMap = toMap(latestPIs);
        const poMap = toMap(latestPOs);
        const minMap = toMap(latestMINs);
        const dnMap = toMap(latestDNs);
        const mhrovMap = toMap(latestMHROVs);
        const cbMap = toMap(latestCBs);
        const woMap = toMap(latestWOs);
        const cbAggMap = toMap(cbAgg);
        const ciAggMap = toMap(ciAgg);
        const mhrovAggMap = toMap(mhrovAgg);
        const retAggMap = toMap(retAgg);
        const stAggMap = toMap(stAgg);

        enrichedSummaries = summaries.map(doc => {
          const itemIdStr = doc.itemId ? doc.itemId.toString() : '';
          const inw = inwardMap.get(itemIdStr);
          const di = diMap.get(itemIdStr);
          const pi = piMap.get(itemIdStr);
          const po = poMap.get(itemIdStr);
          const min = minMap.get(itemIdStr);
          const dn = dnMap.get(itemIdStr);
          const mh = mhrovMap.get(itemIdStr);
          const cb = cbMap.get(itemIdStr);
          const wo = woMap.get(itemIdStr);
          const cba = cbAggMap.get(itemIdStr);
          const cia = ciAggMap.get(itemIdStr);
          const mha = mhrovAggMap.get(itemIdStr);
          const reta = retAggMap.get(itemIdStr);
          const sta = stAggMap.get(itemIdStr);

          const grnNo = inw?.grnNo || doc.grnNo || null;
          const inwardDate = inw?.inwardDate || doc.inwardDate || null;
          const receivedQty = inw?.receivedQty ?? doc.receivedQty ?? doc.invQty ?? 0;

          const diNo = di?.diNo || doc.diNo || null;
          const diDate = di?.diDate || doc.diDate || null;
          const diStatus = di?.diStatus || doc.diStatus || null;

          const piNo = pi?.piNo || doc.piNo || null;
          const piDate = pi?.piDate || doc.piDate || null;
          const piStatus = pi?.piStatus || doc.piStatus || null;

          const poNo = po?.poNo || doc.poNo || null;
          const poDate = po?.poDate || doc.poDate || null;
          const poStatus = po?.poStatus || doc.poStatus || null;

          const minNo = min?.minNo || doc.minNo || null;
          const minDate = min?.minDate || doc.minDate || null;
          const contractorName = doc.contractorName || min?.contractorName || dn?.contractorName || '';

          const dnNo = dn?.dnNo || doc.dnNo || null;
          const dnDate = dn?.dnDate || doc.dnDate || null;
          const mrhovNo = mh?.mrhovNo || doc.mrhovNo || null;
          const mrhovStatus = mh?.mrhovStatus || doc.mrhovStatus || null;
          const woNo = wo?.woNo || doc.woNo || null;
          const woDate = wo?.woDate || doc.woDate || null;
          const raNo = cb?.raNo || doc.raNo || null;
          const raDate = cb?.raDate || doc.raDate || null;

          const ra60Qty = cba?.ra60Qty ?? doc.ra60Qty ?? 0;
          const ra60Amt = cba?.ra60Amt ?? doc.ra60Amt ?? 0;
          const ra30Qty = cba?.ra30Qty ?? doc.ra30Qty ?? 0;
          const ra30Amt = cba?.ra30Amt ?? doc.ra30Amt ?? 0;
          const ra10Qty = cba?.ra10Qty ?? doc.ra10Qty ?? 0;
          const ra10Amt = cba?.ra10Amt ?? doc.ra10Amt ?? 0;

          const er90Qty = cba?.er90Qty ?? doc.er90Qty ?? 0;
          const er90Amt = cba?.er90Amt ?? doc.er90Amt ?? 0;
          const er10Qty = cba?.er10Qty ?? doc.er10Qty ?? 0;
          const er10Amt = cba?.er10Amt ?? doc.er10Amt ?? 0;

          const cBillQty = cia?.cBillQty ?? doc.cBillQty ?? 0;
          const cBillAmt = cia?.cBillAmt ?? doc.cBillAmt ?? 0;

          const mhrovQty = mha?.mhrovQty ?? doc.mhrovQty ?? 0;
          const returnedQty = reta?.returnedQty ?? doc.returnedQty ?? 0;
          const transferInQty = sta?.transferInQty ?? doc.transferInQty ?? 0;
          const transferOutQty = sta?.transferOutQty ?? doc.transferOutQty ?? 0;

          const balLoaBilled = (doc.loaQty || 0) - (doc.billedQty || 0);
          const balBomBilled = (doc.bomQty || 0) - (doc.billedQty || 0);
          const goodDispatch = doc.actQty || 0;
          const balDispatchVsDi = (doc.diQty || 0) - (doc.actQty || 0);
          const diBalAsPerLoa = (doc.loaQty || 0) - (doc.actQty || 0);
          const diBalAsPerBom = (doc.bomQty || 0) - (doc.actQty || 0);
          const balDiIssuedAsPerLoa = (doc.loaQty || 0) - (doc.diQty || 0);
          const balDiIssuedAsPerBom = (doc.bomQty || 0) - (doc.diQty || 0);

          const remainingLoa = balLoaBilled;
          const remainingBom = (doc.bomQty || 0) - (doc.actQty || 0);
          const completionPercent = doc.loaQty ? ((doc.actQty || 0) / doc.loaQty) * 100 : 0;
          const variance = balDispatchVsDi;
          const pendingInvoice = (doc.actQty || 0) - (doc.billedQty || 0);

          return {
            ...doc,
            grnNo,
            inwardDate,
            receivedQty,
            diNo,
            diDate,
            diStatus,
            piNo,
            piDate,
            piStatus,
            poNo,
            poDate,
            poStatus,
            minNo,
            minDate,
            contractorName,
            dnNo,
            dnDate,
            dnQty: doc.demandQty,
            mrhovNo,
            mrhovStatus,
            woNo,
            woDate,
            raNo,
            raDate,
            ra60Qty,
            ra60Amt,
            ra30Qty,
            ra30Amt,
            ra10Qty,
            ra10Amt,
            er90Qty,
            er90Amt,
            er10Qty,
            er10Amt,
            cBillQty,
            cBillAmt,
            mhrovQty,
            returnedQty,
            transferInQty,
            transferOutQty,
            balLoaBilled,
            balBomBilled,
            goodDispatch,
            balDispatchVsDi,
            diBalAsPerLoa,
            diBalAsPerBom,
            balDiIssuedAsPerLoa,
            balDiIssuedAsPerBom,
            remainingLoa,
            remainingBom,
            completionPercent: parseFloat(completionPercent.toFixed(2)),
            variance,
            pendingInvoice
          };
        });
      }

      const responsePayload = {
        items: enrichedSummaries,
        totals,
        pagination: {
          totalItems,
          currentPage: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(totalItems / limitNum)
        }
      };

      itemSummaryCache.set(cacheKey, { timestamp: Date.now(), data: responsePayload, promise: null });
      return responsePayload;
    })();

    itemSummaryCache.set(cacheKey, { timestamp: Date.now(), data: null, promise: fetchPromise });
    try {
      return await fetchPromise;
    } catch (err) {
      itemSummaryCache.delete(cacheKey);
      throw err;
    }
  }

  static clearCache() {
    itemSummaryCache.clear();
  }

  /**
   * Performs an optimized, batch-wide synchronization across all collections,
   * updating ItemSummary records in MongoDB with exact live billing & movement values.
   */
  static async syncAllSummaries() {
    try {
      const db = mongoose.connection.db;
      if (!db) return;

      const [
        cbAgg,
        ciAgg,
        mhrovAgg,
        retAgg,
        stAgg,
        dnAgg,
        inwardAgg
      ] = await Promise.all([
        db.collection('clientbills').aggregate([
          { $match: { status: { $ne: 'Rejected' } } },
          { $unwind: "$items" },
          { $group: {
              _id: "$items.itemId",
              ra60Qty: {
                $sum: {
                  $cond: [
                    { $and: [{ $eq: ["$billType", "Supply"] }, { $eq: ["$stage", "60%"] }] },
                    { $ifNull: ["$items.raBillQty", "$items.sourceDoneQty"] },
                    0
                  ]
                }
              },
              ra60Amt: {
                $sum: {
                  $cond: [
                    { $and: [{ $eq: ["$billType", "Supply"] }, { $eq: ["$stage", "60%"] }] },
                    { $ifNull: ["$items.totalAmount", 0] },
                    0
                  ]
                }
              },
              ra30Qty: {
                $sum: {
                  $cond: [
                    { $and: [{ $eq: ["$billType", "Supply"] }, { $eq: ["$stage", "30%"] }] },
                    { $ifNull: ["$items.raBillQty", "$items.sourceDoneQty"] },
                    0
                  ]
                }
              },
              ra30Amt: {
                $sum: {
                  $cond: [
                    { $and: [{ $eq: ["$billType", "Supply"] }, { $eq: ["$stage", "30%"] }] },
                    { $ifNull: ["$items.totalAmount", 0] },
                    0
                  ]
                }
              },
              ra10Qty: {
                $sum: {
                  $cond: [
                    { $and: [{ $eq: ["$billType", "Supply"] }, { $eq: ["$stage", "10%"] }] },
                    { $ifNull: ["$items.raBillQty", "$items.sourceDoneQty"] },
                    0
                  ]
                }
              },
              ra10Amt: {
                $sum: {
                  $cond: [
                    { $and: [{ $eq: ["$billType", "Supply"] }, { $eq: ["$stage", "10%"] }] },
                    { $ifNull: ["$items.totalAmount", 0] },
                    0
                  ]
                }
              },
              er90Qty: {
                $sum: {
                  $cond: [
                    { $and: [{ $eq: ["$billType", "Erection"] }, { $eq: ["$stage", "90%"] }] },
                    { $ifNull: ["$items.raBillQty", "$items.sourceDoneQty"] },
                    0
                  ]
                }
              },
              er90Amt: {
                $sum: {
                  $cond: [
                    { $and: [{ $eq: ["$billType", "Erection"] }, { $eq: ["$stage", "90%"] }] },
                    { $ifNull: ["$items.totalAmount", 0] },
                    0
                  ]
                }
              },
              er10Qty: {
                $sum: {
                  $cond: [
                    { $and: [{ $eq: ["$billType", "Erection"] }, { $eq: ["$stage", "10%"] }] },
                    { $ifNull: ["$items.raBillQty", "$items.sourceDoneQty"] },
                    0
                  ]
                }
              },
              er10Amt: {
                $sum: {
                  $cond: [
                    { $and: [{ $eq: ["$billType", "Erection"] }, { $eq: ["$stage", "10%"] }] },
                    { $ifNull: ["$items.totalAmount", 0] },
                    0
                  ]
                }
              }
            }
          }
        ]).toArray(),

        db.collection('contractorinvoices').aggregate([
          { $match: { status: { $ne: 'Rejected' } } },
          { $unwind: "$lineItems" },
          { $group: {
              _id: "$lineItems.itemId",
              cBillQty: { $sum: { $ifNull: ["$lineItems.erectedQty", "$lineItems.jmcDoneQty"] } },
              cBillAmt: { $sum: { $ifNull: ["$lineItems.totalAmount", "$lineItems.baseAmount"] } }
            }
          }
        ]).toArray(),

        db.collection('mhrovs').aggregate([
          { $match: { status: { $ne: 'Cancelled' } } },
          { $unwind: "$items" },
          { $group: {
              _id: "$items.itemId",
              mhrovQty: { $sum: "$items.mhrovDoneQty" }
            }
          }
        ]).toArray(),

        db.collection('contractorreturns').aggregate([
          { $match: { status: { $ne: 'Cancelled' } } },
          { $unwind: "$lineItems" },
          { $group: {
              _id: "$lineItems.itemId",
              returnedQty: { $sum: { $ifNull: ["$lineItems.returnQty", { $ifNull: ["$lineItems.quantity", "$lineItems.acceptedQuantity"] }] } }
            }
          }
        ]).toArray(),

        db.collection('storetransfers').aggregate([
          { $match: { status: { $ne: 'Cancelled' } } },
          { $unwind: "$items" },
          { $group: {
              _id: "$items.itemId",
              transferOutQty: { $sum: { $ifNull: ["$items.dispatchedQty", { $ifNull: ["$items.transferQty", "$items.receivedQty"] }] } },
              transferInQty: { $sum: { $ifNull: ["$items.receivedQty", 0] } }
            }
          }
        ]).toArray(),

        db.collection('demandnotes').aggregate([
          { $match: { status: { $ne: 'Rejected' } } },
          { $unwind: "$items" },
          { $group: {
              _id: "$items.itemId",
              demandQty: { $sum: "$items.demandQty" }
            }
          }
        ]).toArray(),

        db.collection('storeinwardentries').aggregate([
          { $group: {
              _id: "$itemId",
              receivedQty: { $sum: { $ifNull: ["$totalQty", "$invoiceQty"] } }
            }
          }
        ]).toArray()
      ]);

      const itemUpdates = new Map<string, any>();
      const getOrCreate = (id: any) => {
        const s = id.toString();
        if (!itemUpdates.has(s)) itemUpdates.set(s, {});
        return itemUpdates.get(s);
      };

      cbAgg.forEach((r: any) => {
        if (!r._id) return;
        const u = getOrCreate(r._id);
        u.ra60Qty = r.ra60Qty || 0;
        u.ra60Amt = r.ra60Amt || 0;
        u.ra30Qty = r.ra30Qty || 0;
        u.ra30Amt = r.ra30Amt || 0;
        u.ra10Qty = r.ra10Qty || 0;
        u.ra10Amt = r.ra10Amt || 0;
        u.er90Qty = r.er90Qty || 0;
        u.er90Amt = r.er90Amt || 0;
        u.er10Qty = r.er10Qty || 0;
        u.er10Amt = r.er10Amt || 0;
      });

      ciAgg.forEach((r: any) => {
        if (!r._id) return;
        const u = getOrCreate(r._id);
        u.cBillQty = r.cBillQty || 0;
        u.cBillAmt = r.cBillAmt || 0;
      });

      mhrovAgg.forEach((r: any) => {
        if (!r._id) return;
        const u = getOrCreate(r._id);
        u.mhrovQty = r.mhrovQty || 0;
      });

      retAgg.forEach((r: any) => {
        if (!r._id) return;
        const u = getOrCreate(r._id);
        u.returnedQty = r.returnedQty || 0;
      });

      stAgg.forEach((r: any) => {
        if (!r._id) return;
        const u = getOrCreate(r._id);
        u.transferOutQty = r.transferOutQty || 0;
        u.transferInQty = r.transferInQty || 0;
      });

      dnAgg.forEach((r: any) => {
        if (!r._id) return;
        const u = getOrCreate(r._id);
        u.demandQty = r.demandQty || 0;
      });

      inwardAgg.forEach((r: any) => {
        if (!r._id) return;
        const u = getOrCreate(r._id);
        u.receivedQty = r.receivedQty || 0;
      });

      const bulkOps: any[] = [];
      for (const [idStr, fields] of itemUpdates.entries()) {
        bulkOps.push({
          updateMany: {
            filter: { itemId: new mongoose.Types.ObjectId(idStr) },
            update: { $set: fields }
          }
        });
      }

      if (bulkOps.length > 0) {
        await db.collection('itemsummaries').bulkWrite(bulkOps);
      }
      SummaryService.clearCache();
    } catch (err) {
      console.error('Error syncing all ItemSummaries:', err);
    }
  }
}

const itemSummaryCache = new Map<string, { timestamp: number; data: any; promise: Promise<any> | null }>();
const ITEM_SUMMARY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

