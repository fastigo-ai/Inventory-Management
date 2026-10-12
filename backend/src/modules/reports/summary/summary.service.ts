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
    ra30Qty?: number;
    ra10Qty?: number;
    er90Qty?: number;
    er10Qty?: number;
    jmcQty?: number;
    wipQty?: number;
    cBillQty?: number;
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
            if (qty > 0) {
              await SummaryService.updateSummary({
                itemId, circle: inv.legacyMetadata?.circle || '', package: inv.legacyMetadata?.package || '',
                increments: { cBillQty: qty },
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
            if (qty > 0) {
              const increments: any = {};
              if (cb.billType === 'Supply') {
                if (cb.stage === '60%') increments.ra60Qty = qty;
                else if (cb.stage === '30%') increments.ra30Qty = qty;
                else if (cb.stage === '10%') increments.ra10Qty = qty;
              } else if (cb.billType === 'Erection') {
                if (cb.stage === '90%') increments.er90Qty = qty;
                else if (cb.stage === '10%') increments.er10Qty = qty;
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
            woQty: { $sum: "$woQty" }
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
            totalWoQty: { $sum: "$woQty" }
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
            ra30Qty: { $sum: "$ra30Qty" },
            ra10Qty: { $sum: "$ra10Qty" },
            er90Qty: { $sum: "$er90Qty" },
            er10Qty: { $sum: "$er10Qty" },
            jmcQty: { $sum: "$jmcQty" },
            wipQty: { $sum: "$wipQty" },
            cBillQty: { $sum: "$cBillQty" },
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
        { $unwind: { path: '$masterItem', preserveNullAndEmptyArrays: true } }
      ];

      // If paginated (limit <= 100), apply sort/skip/limit FIRST, then perform doc lookups on the small slice
      if (limitNum <= 100) {
        basePipeline.push(
          { $sort: sortObj },
          { $skip: skip },
          { $limit: limitNum },
          { $lookup: {
              from: 'dis',
              localField: 'itemId',
              foreignField: 'lineItems.itemId',
              pipeline: [{ $sort: { createdAt: -1 } }, { $limit: 1 }],
              as: 'latestDI'
            }
          },
          { $unwind: { path: '$latestDI', preserveNullAndEmptyArrays: true } },
          { $lookup: {
              from: 'purchaseinvoices',
              localField: 'itemId',
              foreignField: 'lineItems.itemId',
              pipeline: [{ $sort: { createdAt: -1 } }, { $limit: 1 }],
              as: 'latestPI'
            }
          },
          { $unwind: { path: '$latestPI', preserveNullAndEmptyArrays: true } },
          { $lookup: {
              from: 'purchaseorders',
              localField: 'itemId',
              foreignField: 'lineItems.itemId',
              pipeline: [{ $sort: { createdAt: -1 } }, { $limit: 1 }],
              as: 'latestPO'
            }
          },
          { $unwind: { path: '$latestPO', preserveNullAndEmptyArrays: true } },
          { $lookup: {
              from: 'storeinwardentries',
              localField: 'itemId',
              foreignField: 'itemId',
              pipeline: [{ $sort: { createdAt: -1 } }, { $limit: 1 }],
              as: 'latestInward'
            }
          },
          { $unwind: { path: '$latestInward', preserveNullAndEmptyArrays: true } },
          { $lookup: {
              from: 'contractorassignments',
              localField: 'itemId',
              foreignField: 'lineItems.itemId',
              pipeline: [{ $sort: { createdAt: -1 } }, { $limit: 1 }],
              as: 'latestMIN'
            }
          },
          { $unwind: { path: '$latestMIN', preserveNullAndEmptyArrays: true } },
          { $lookup: {
              from: 'contractorworkorders',
              localField: 'itemId',
              foreignField: 'items.itemId',
              pipeline: [{ $sort: { createdAt: -1 } }, { $limit: 1 }],
              as: 'latestWO'
            }
          },
          { $unwind: { path: '$latestWO', preserveNullAndEmptyArrays: true } },
          { $lookup: {
              from: 'demandnotes',
              localField: 'itemId',
              foreignField: 'items.itemId',
              pipeline: [{ $sort: { createdAt: -1 } }, { $limit: 1 }],
              as: 'latestDN'
            }
          },
          { $unwind: { path: '$latestDN', preserveNullAndEmptyArrays: true } },
          { $lookup: {
              from: 'mhrovs',
              localField: 'itemId',
              foreignField: 'items.itemId',
              pipeline: [{ $sort: { createdAt: -1 } }, { $limit: 1 }],
              as: 'latestMHROV'
            }
          },
          { $unwind: { path: '$latestMHROV', preserveNullAndEmptyArrays: true } },
          { $lookup: {
              from: 'clientbills',
              localField: 'itemId',
              foreignField: 'items.itemId',
              pipeline: [{ $sort: { createdAt: -1 } }, { $limit: 1 }],
              as: 'latestClientBill'
            }
          },
          { $unwind: { path: '$latestClientBill', preserveNullAndEmptyArrays: true } }
        );
      }

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
          ra30Qty: 1,
          ra10Qty: 1,
          er90Qty: 1,
          er10Qty: 1,
          jmcQty: 1,
          wipQty: 1,
          cBillQty: 1,
          vendors: 1,
          contractors: 1,
          contractorBreakdown: 1,
          contractorName: { $ifNull: ["$latestMIN.contractorFarmName", { $ifNull: ["$latestDN.contractorName", ""] }] },
          transferInQty: 1,
          transferOutQty: 1,
          issuedQty: 1,
          returnedQty: 1,
          woQty: 1,
          demandQty: 1,
          receivedQty: { $ifNull: ["$latestInward.totalQty", { $ifNull: ["$receivedQty", "$invQty"] }] },
          diNo: "$latestDI.diNumber",
          diDate: { $ifNull: ["$latestDI.diDate", "$latestDI.date"] },
          diStatus: "$latestDI.status",
          piNo: "$latestPI.invoiceNumber",
          piDate: { $ifNull: ["$latestPI.invoiceDate", "$latestPI.date"] },
          piStatus: { $ifNull: ["$latestPI.paymentStatus", "$latestPI.status"] },
          poNo: "$latestPO.poNumber",
          poDate: "$latestPO.poDate",
          poStatus: "$latestPO.status",
          grnNo: { $ifNull: ["$latestInward.grNumber", "$latestInward.inwardId"] },
          inwardDate: { $ifNull: ["$latestInward.receivedDate", "$latestInward.invoiceDate"] },
          minNo: { $ifNull: ["$latestMIN.minNo", "$latestMIN.assignmentNumber"] },
          minDate: { $ifNull: ["$latestMIN.minDate", "$latestMIN.date"] },
          woNo: "$latestWO.workOrderNumber",
          woDate: "$latestWO.createdAt",
          dnNo: "$latestDN.demandNoteNumber",
          dnDate: "$latestDN.createdAt",
          dnQty: "$demandQty",
          mrhovNo: "$latestMHROV.mhrovNumber",
          mrhovStatus: "$latestMHROV.status",
          raNo: "$latestClientBill.billNumber",
          raDate: "$latestClientBill.billDate",
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

      // If bulk mode (limit > 100), sort, skip, and limit at the end of the fast pipeline
      if (limitNum > 100) {
        basePipeline.push(
          { $sort: sortObj },
          { $skip: skip },
          { $limit: limitNum }
        );
      }

      const summaries = await ItemSummary.aggregate(basePipeline);

      const enrichedSummaries = summaries.map(doc => {
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
}

const itemSummaryCache = new Map<string, { timestamp: number; data: any; promise: Promise<any> | null }>();
const ITEM_SUMMARY_CACHE_TTL = 30 * 1000;

