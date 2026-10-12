import { StoreInwardEntry } from '../../store/storeInwardEntry.schema';
import { ContractorAssignment } from '../../contractors/contractorAssignment.schema';
import { ContractorReturn } from '../../contractors/contractorReturn.schema';
import { StoreTransfer } from '../../store/storeTransfer.schema';
import { DI } from '../../di/di.schema';
import { Mhrov } from '../../store/mhrov.schema';
import Item from '../../items/item.model';
import { expandCircle } from '../../../utils/hierarchy';

const storeItemisedCache = new Map<string, { timestamp: number; data: any | null; promise: Promise<any> | null }>();
const STORE_ITEMISED_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const clearStoreItemisedCache = () => {
  storeItemisedCache.clear();
};

const getVariants = (val: string): string[] => {
  if (!val) return [];
  const t = val.trim();
  return Array.from(new Set([t, t.toUpperCase(), t.toLowerCase(), t.charAt(0).toUpperCase() + t.slice(1).toLowerCase(), `${t} `]));
};

const getCirclePackage = (circ?: string, fallbackPkg?: string): string => {
  const c = (circ || '').toLowerCase();
  if (c.includes('nahan') || c.includes('solan')) {
    return 'Package 1(S/N)';
  }
  if (c.includes('rampur') || c.includes('rohru')) {
    return 'Package 2(R/R)';
  }
  return fallbackPkg || 'All Packages';
};

export async function computeStoreItemisedSummary(params: {
  circle?: string;
  store?: string;
  package?: string;
  search?: string;
  tempCode?: string;
  itemName?: string;
  hideZeroBalance?: boolean;
  viewMode?: 'item' | 'loa';
}): Promise<{ rows: any[]; totals: any }> {
  const cacheKey = JSON.stringify(params);
  const cached = storeItemisedCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp < STORE_ITEMISED_CACHE_TTL)) {
    if (cached.promise) return await cached.promise;
    if (cached.data) return cached.data;
  }

  let resolvePromise: (data: any) => void;
  let rejectPromise: (err: any) => void;
  const dataPromise = new Promise<any>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  
  storeItemisedCache.set(cacheKey, { timestamp: Date.now(), data: null, promise: dataPromise });

  try {
    const data = await computeStoreItemisedSummaryInner(params);
    storeItemisedCache.set(cacheKey, { timestamp: Date.now(), data, promise: null });
    resolvePromise!(data);
    return data;
  } catch (error) {
    storeItemisedCache.delete(cacheKey);
    rejectPromise!(error);
    throw error;
  }
}

async function computeStoreItemisedSummaryInner(params: {
  circle?: string;
  store?: string;
  package?: string;
  search?: string;
  tempCode?: string;
  itemName?: string;
  hideZeroBalance?: boolean;
  viewMode?: 'item' | 'loa';
}) {
  const { circle, store, package: pkg, search, tempCode, itemName, hideZeroBalance, viewMode = 'item' } = params;

  // Filter items (only match name, tempCode, search)
  const itemFilter: any = { isDeleted: { $ne: true } };

  if (tempCode && tempCode.trim() !== '') {
    const t = tempCode.trim();
    itemFilter['dynamicData.tempCode'] = isNaN(Number(t)) ? t : { $in: [t, Number(t)] };
  }
  if (itemName && itemName.trim() !== '') {
    const n = itemName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    itemFilter['dynamicData.name'] = { $regex: n, $options: 'i' };
  }
  if (search && search.trim() !== '') {
    const s = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    itemFilter.$or = [
      { 'dynamicData.name': { $regex: s, $options: 'i' } },
      { 'dynamicData.tempCode': { $regex: s, $options: 'i' } },
      { 'dynamicData.sku': { $regex: s, $options: 'i' } }
    ];
  }

  // 1. Determine Item Filter Variants (Indexed)
  let itemLocVariants: string[] = [];
  if (circle && circle !== 'all') {
    itemLocVariants = getVariants(circle);
  } else if (pkg && pkg !== 'all') {
    if (pkg.includes('Package 1')) {
      itemLocVariants = [...getVariants('Solan'), ...getVariants('Nahan'), ...getVariants('Kumarhatti'), ...getVariants('Nalagarh')];
    } else if (pkg.includes('Package 2')) {
      itemLocVariants = [...getVariants('Rampur'), ...getVariants('Rohru')];
    }
  }

  if (itemLocVariants.length > 0) {
    const locCondition = {
      $or: [
        { 'dynamicData.circle': { $in: itemLocVariants } },
        { circle: { $in: itemLocVariants } }
      ]
    };
    if (itemFilter.$or) {
      itemFilter.$and = [{ $or: itemFilter.$or }, locCondition];
      delete itemFilter.$or;
    } else {
      itemFilter.$or = locCondition.$or;
    }
  }

  // 2. Determine Transaction Filter Variants (Indexed)
  let transLocVariants: string[] = [];
  const transTarget = store && store !== 'all' ? store : (circle && circle !== 'all' ? circle : null);
  if (transTarget) {
    const expanded = expandCircle(transTarget) || [transTarget];
    expanded.forEach(c => transLocVariants.push(...getVariants(c)));
  } else if (pkg && pkg !== 'all') {
    if (pkg.includes('Package 1')) {
      ['Solan', 'Kumarhatti', 'Nalagarh', 'Nahan'].forEach(c => transLocVariants.push(...getVariants(c)));
    } else if (pkg.includes('Package 2')) {
      ['Rampur', 'Rohru'].forEach(c => transLocVariants.push(...getVariants(c)));
    }
  }
  transLocVariants = Array.from(new Set(transLocVariants));

  const items = await Item.find(itemFilter)
    .select('dynamicData.tempCode dynamicData.name dynamicData.unit dynamicData.circle dynamicData.sku dynamicData.loaSerialNo dynamicData.package tempCode name unit circle sku package')
    .lean();

  if (viewMode === 'item') {
    // ----------------------------------------------------
    // A. ITEM-WISE AGGREGATION (Grouped by Temp Code / Name)
    // ----------------------------------------------------
    const groupMap = new Map<string, any>();
    const itemIdToGroup = new Map<string, any>();
    const tempCodeToGroup = new Map<string, any>();
    const nameToGroup = new Map<string, any>();

    items.forEach(it => {
      const d = it.dynamicData || {};
      const temp = String(d.tempCode || (it as any).tempCode || '').trim();
      const tempNum = Number(temp);
      const hasValidTemp = !isNaN(tempNum) && tempNum > 0;
      const name = String(d.name || (d as any).itemName || (d as any).description || (it as any).name || (it as any).itemName || (it as any).description || 'Unnamed Item').trim();
      const unit = String(d.unit || (it as any).unit || 'Nos').trim();
      const circleVal = String(d.circle || (it as any).circle || circle || '').trim();
      const sku = String(d.sku || (d as any).loaSerialNo || (it as any).sku || '').trim();

      const groupKey = hasValidTemp ? `TEMP_${temp}` : `NAME_${name.toLowerCase()}`;

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          itemIds: new Set<string>(),
          tempCode: temp || '-',
          tempNum: hasValidTemp ? tempNum : 9999999,
          sku: sku || '-',
          name,
          unit,
          circle: circleVal,
          receiptQty: 0,
          issuedQty: 0,
          returnedQty: 0,
          transferOutQty: 0,
          transferInQty: 0,
          balAtStore: 0,
          diQty: 0,
          mhrovQty: 0
        });
      }

      const grp = groupMap.get(groupKey)!;
      const idStr = it._id.toString();
      grp.itemIds.add(idStr);

      itemIdToGroup.set(idStr, grp);
      if (temp && temp !== '-') tempCodeToGroup.set(temp, grp);
      if (name) nameToGroup.set(name.toLowerCase(), grp);
    });

    // Match conditions for transactions
    const inwardFilter: any = {};
    const assignFilter: any = { status: { $ne: 'Cancelled' } };
    const returnFilter: any = {};
    const transferOutFilter: any = { registerType: 'OUTWARD', status: { $nin: ['Cancelled', 'REJECTED', 'CANCELLED'] } };
    const transferInFilter: any = { status: { $in: ['RECEIVED', 'IN_TRANSIT'] } };
    const diFilter: any = { status: { $ne: 'Cancelled' } };
    const mhrovFilter: any = {};

    if (transLocVariants.length > 0) {
      inwardFilter.$or = [
        { circle: { $in: transLocVariants } },
        { subcircle: { $in: transLocVariants } },
        { billingFrom: { $in: transLocVariants } },
        { store: { $in: transLocVariants } }
      ];
      assignFilter.$or = [
        { location: { $in: transLocVariants } },
        { circle: { $in: transLocVariants } },
        { subcircle: { $in: transLocVariants } },
        { division: { $in: transLocVariants } },
        { 'lineItems.circle': { $in: transLocVariants } }
      ];
      returnFilter.$or = [
        { store: { $in: transLocVariants } },
        { circle: { $in: transLocVariants } },
        { subcircle: { $in: transLocVariants } },
        { division: { $in: transLocVariants } }
      ];
      transferOutFilter.fromStore = { $in: transLocVariants };
      transferInFilter.toStore = { $in: transLocVariants };
    }

    if (itemLocVariants.length > 0) {
      diFilter.$or = [
        { circle: { $in: itemLocVariants } },
        { 'lineItems.circle': { $in: itemLocVariants } }
      ];
      mhrovFilter.circle = { $in: itemLocVariants };
    }

    // Parallel fetch of all 7 collections with projections
    const [inwards, assignments, returns, transfersOut, transfersIn, dis, mhrovs] = await Promise.all([
      StoreInwardEntry.find(inwardFilter)
        .select('itemId totalQty invoiceQty acceptedQty receivedQty tempCode itemName name description')
        .lean(),

      ContractorAssignment.find(assignFilter)
        .select('lineItems.itemId lineItems.quantity lineItems.acceptedQuantity lineItems.issuedQty lineItems.tempCode lineItems.itemName lineItems.name lineItems.description')
        .lean(),

      ContractorReturn.find(returnFilter)
        .select('lineItems items')
        .lean(),

      StoreTransfer.find(transferOutFilter)
        .select('items.itemId items.dispatchedQty items.quantity items.requestedQty items.receivedQty items.tempCode items.itemName items.name items.description')
        .lean(),

      StoreTransfer.find(transferInFilter)
        .select('items.itemId items.receivedQty items.dispatchedQty items.quantity items.requestedQty items.tempCode items.itemName items.name items.description')
        .lean(),

      DI.find(diFilter)
        .select('lineItems.itemId lineItems.quantity lineItems.tempCode lineItems.itemName')
        .lean(),

      Mhrov.find(mhrovFilter)
        .select('items.itemId items.mhrovDoneQty')
        .lean()
    ]);

    // Fast O(1) in-memory accumulations
    inwards.forEach(doc => {
      const idStr = doc.itemId ? doc.itemId.toString() : null;
      const qty = Number(doc.totalQty || (doc as any).invoiceQty || (doc as any).acceptedQty || (doc as any).receivedQty || 0);
      const temp = String(doc.tempCode || '').trim();
      const name = String(doc.itemName || (doc as any).name || (doc as any).description || '').trim().toLowerCase();

      const grp = (idStr && itemIdToGroup.get(idStr)) || (temp && temp !== '-' && tempCodeToGroup.get(temp)) || (name && nameToGroup.get(name));
      if (grp) grp.receiptQty += qty;
    });

    assignments.forEach(doc => {
      (doc.lineItems || []).forEach((li: any) => {
        const idStr = li.itemId ? li.itemId.toString() : null;
        const qty = Number(li.quantity || li.acceptedQuantity || li.issuedQty || 0);
        const temp = String(li.tempCode || '').trim();
        const name = String(li.itemName || li.name || li.description || '').trim().toLowerCase();

        const grp = (idStr && itemIdToGroup.get(idStr)) || (temp && temp !== '-' && tempCodeToGroup.get(temp)) || (name && nameToGroup.get(name));
        if (grp) grp.issuedQty += qty;
      });
    });

    returns.forEach(doc => {
      (doc.lineItems || (doc as any).items || []).forEach((li: any) => {
        const idStr = li.itemId ? li.itemId.toString() : null;
        const qty = Number(li.quantity || li.acceptedQuantity || (li as any).returnedQty || 0);
        const temp = String(li.tempCode || '').trim();
        const name = String(li.itemName || li.name || li.description || '').trim().toLowerCase();

        const grp = (idStr && itemIdToGroup.get(idStr)) || (temp && temp !== '-' && tempCodeToGroup.get(temp)) || (name && nameToGroup.get(name));
        if (grp) grp.returnedQty += qty;
      });
    });

    transfersOut.forEach(doc => {
      (doc.items || []).forEach((it: any) => {
        const idStr = it.itemId ? it.itemId.toString() : null;
        const qty = Number(it.dispatchedQty || it.quantity || it.requestedQty || it.receivedQty || 0);
        const temp = String(it.tempCode || '').trim();
        const name = String(it.itemName || it.name || it.description || '').trim().toLowerCase();

        const grp = (idStr && itemIdToGroup.get(idStr)) || (temp && tempCodeToGroup.get(temp)) || (name && nameToGroup.get(name));
        if (grp) grp.transferOutQty += qty;
      });
    });

    transfersIn.forEach(doc => {
      (doc.items || []).forEach((it: any) => {
        const idStr = it.itemId ? it.itemId.toString() : null;
        const qty = Number(it.receivedQty || it.dispatchedQty || it.quantity || it.requestedQty || 0);
        const temp = String(it.tempCode || '').trim();
        const name = String(it.itemName || it.name || it.description || '').trim().toLowerCase();

        const grp = (idStr && itemIdToGroup.get(idStr)) || (temp && tempCodeToGroup.get(temp)) || (name && nameToGroup.get(name));
        if (grp) grp.transferInQty += qty;
      });
    });

    dis.forEach(doc => {
      (doc.lineItems || []).forEach((li: any) => {
        const idStr = li.itemId ? li.itemId.toString() : null;
        const qty = Number(li.quantity || 0);
        const temp = String(li.tempCode || '').trim();
        const name = String(li.itemName || '').trim().toLowerCase();

        const grp = (idStr && itemIdToGroup.get(idStr)) || (temp && temp !== '-' && tempCodeToGroup.get(temp)) || (name && nameToGroup.get(name));
        if (grp) grp.diQty += qty;
      });
    });

    mhrovs.forEach(doc => {
      (doc.items || []).forEach((it: any) => {
        const idStr = it.itemId ? it.itemId.toString() : null;
        const qty = Number(it.mhrovDoneQty || 0);
        const grp = idStr && itemIdToGroup.get(idStr);
        if (grp) grp.mhrovQty += qty;
      });
    });

    let rows = Array.from(groupMap.values()).map(r => {
      r.balAtStore = r.receiptQty - r.issuedQty + r.returnedQty - r.transferOutQty + r.transferInQty;
      if (circle && circle !== 'all') {
        const cStr = circle.toString();
        r.circle = cStr.toUpperCase();
        r.package = getCirclePackage(cStr, r.package);
      }
      return r;
    });

    if (hideZeroBalance || transLocVariants.length > 0 || (pkg && pkg !== 'all')) {
      rows = rows.filter(r => r.receiptQty > 0 || r.issuedQty > 0 || r.returnedQty > 0 || r.transferOutQty > 0 || r.transferInQty > 0 || r.balAtStore !== 0);
    }

    // Sort by tempNum asc, then name
    rows.sort((a, b) => {
      if (a.tempNum !== b.tempNum) return a.tempNum - b.tempNum;
      return a.name.localeCompare(b.name);
    });

    const totals = rows.reduce((acc, curr) => {
      acc.receiptQty += curr.receiptQty;
      acc.issuedQty += curr.issuedQty;
      acc.returnedQty += curr.returnedQty;
      acc.transferOutQty += curr.transferOutQty;
      acc.transferInQty += curr.transferInQty;
      acc.balAtStore += curr.balAtStore;
      acc.diQty += curr.diQty;
      acc.mhrovQty += curr.mhrovQty;
      return acc;
    }, {
      receiptQty: 0,
      issuedQty: 0,
      returnedQty: 0,
      transferOutQty: 0,
      transferInQty: 0,
      balAtStore: 0,
      diQty: 0,
      mhrovQty: 0
    });

    const indexedRows = rows.map((r, index) => ({
      srNo: index + 1,
      ...r
    }));

    return { rows: indexedRows, totals };

  } else {
    // ----------------------------------------------------
    // B. LOA BOM DETAILED VIEW (Row by Row per Item ID)
    // ----------------------------------------------------
    const itemMap = new Map<string, any>();
    items.forEach(it => {
      const d = it.dynamicData || {};
      const temp = String(d.tempCode || (it as any).tempCode || '').trim();
      const tempNum = Number(temp);
      const hasValidTemp = !isNaN(tempNum) && tempNum > 0;
      const name = String(d.name || (d as any).itemName || (d as any).description || (it as any).name || (it as any).itemName || (it as any).description || 'Unnamed Item').trim();

      itemMap.set(it._id.toString(), {
        itemId: it._id,
        tempCode: temp,
        tempNum: hasValidTemp ? tempNum : 9999999,
        sku: String(d.sku || (d as any).loaSerialNo || (it as any).sku || '').trim(),
        name,
        unit: d.unit || (it as any).unit || 'Nos',
        package: d.package || (it as any).package || '',
        circle: d.circle || (it as any).circle || circle || '',
        receiptQty: 0,
        issuedQty: 0,
        returnedQty: 0,
        transferOutQty: 0,
        transferInQty: 0,
        balAtStore: 0
      });
    });

    const inwardFilter: any = {};
    const assignFilter: any = { status: { $ne: 'Cancelled' } };
    const returnFilter: any = {};
    const transferOutFilter: any = { status: { $nin: ['Cancelled', 'REJECTED', 'CANCELLED'] } };
    const transferInFilter: any = { status: { $nin: ['Cancelled', 'REJECTED', 'CANCELLED'] } };

    if (transLocVariants.length > 0) {
      inwardFilter.$or = [
        { circle: { $in: transLocVariants } },
        { subcircle: { $in: transLocVariants } },
        { billingFrom: { $in: transLocVariants } },
        { store: { $in: transLocVariants } }
      ];
      assignFilter.$or = [
        { location: { $in: transLocVariants } },
        { division: { $in: transLocVariants } },
        { 'lineItems.circle': { $in: transLocVariants } }
      ];
      returnFilter.$or = [
        { store: { $in: transLocVariants } },
        { circle: { $in: transLocVariants } }
      ];
      transferOutFilter.fromStore = { $in: transLocVariants };
      transferInFilter.toStore = { $in: transLocVariants };
    }

    const [inwards, assignments, returns, transfersOut, transfersIn] = await Promise.all([
      StoreInwardEntry.find(inwardFilter).select('itemId totalQty invoiceQty acceptedQty receivedQty').lean(),
      ContractorAssignment.find(assignFilter).select('lineItems.itemId lineItems.quantity lineItems.acceptedQuantity lineItems.issuedQty').lean(),
      ContractorReturn.find(returnFilter).select('lineItems items').lean(),
      StoreTransfer.find(transferOutFilter).select('items.itemId items.dispatchedQty items.quantity items.requestedQty items.receivedQty').lean(),
      StoreTransfer.find(transferInFilter).select('items.itemId items.receivedQty items.dispatchedQty items.quantity items.requestedQty').lean()
    ]);

    inwards.forEach(doc => {
      const idStr = doc.itemId ? doc.itemId.toString() : null;
      const qty = Number(doc.totalQty || (doc as any).invoiceQty || (doc as any).acceptedQty || (doc as any).receivedQty || 0);
      if (idStr && itemMap.has(idStr)) {
        itemMap.get(idStr)!.receiptQty += qty;
      }
    });

    assignments.forEach(doc => {
      (doc.lineItems || []).forEach((li: any) => {
        const idStr = li.itemId ? li.itemId.toString() : null;
        const qty = Number(li.quantity || li.acceptedQuantity || li.issuedQty || 0);
        if (idStr && itemMap.has(idStr)) {
          itemMap.get(idStr)!.issuedQty += qty;
        }
      });
    });

    returns.forEach(doc => {
      (doc.lineItems || (doc as any).items || []).forEach((li: any) => {
        const idStr = li.itemId ? li.itemId.toString() : null;
        const qty = Number(li.quantity || li.acceptedQuantity || (li as any).returnedQty || 0);
        if (idStr && itemMap.has(idStr)) {
          itemMap.get(idStr)!.returnedQty += qty;
        }
      });
    });

    transfersOut.forEach(doc => {
      (doc.items || []).forEach((it: any) => {
        const idStr = it.itemId ? it.itemId.toString() : null;
        const qty = Number(it.dispatchedQty || it.quantity || it.requestedQty || it.receivedQty || 0);
        if (idStr && itemMap.has(idStr)) {
          itemMap.get(idStr)!.transferOutQty += qty;
        }
      });
    });

    transfersIn.forEach(doc => {
      (doc.items || []).forEach((it: any) => {
        const idStr = it.itemId ? it.itemId.toString() : null;
        const qty = Number(it.receivedQty || it.dispatchedQty || it.quantity || it.requestedQty || 0);
        if (idStr && itemMap.has(idStr)) {
          itemMap.get(idStr)!.transferInQty += qty;
        }
      });
    });

    let rows = Array.from(itemMap.values()).map(row => {
      row.balAtStore = row.receiptQty - row.issuedQty + row.returnedQty - row.transferOutQty + row.transferInQty;
      return row;
    });

    if (hideZeroBalance || transLocVariants.length > 0 || (pkg && pkg !== 'all')) {
      rows = rows.filter(r => r.receiptQty > 0 || r.issuedQty > 0 || r.returnedQty > 0 || r.transferOutQty > 0 || r.transferInQty > 0 || r.balAtStore !== 0);
    }

    rows.sort((a, b) => {
      if (a.tempNum !== b.tempNum) return a.tempNum - b.tempNum;
      const skuA = Number(a.sku) || 0;
      const skuB = Number(b.sku) || 0;
      if (skuA !== skuB) return skuA - skuB;
      return a.name.localeCompare(b.name);
    });

    const totals = rows.reduce((acc, curr) => {
      acc.receiptQty += curr.receiptQty;
      acc.issuedQty += curr.issuedQty;
      acc.returnedQty += curr.returnedQty;
      acc.transferOutQty += curr.transferOutQty;
      acc.transferInQty += curr.transferInQty;
      acc.balAtStore += curr.balAtStore;
      return acc;
    }, {
      receiptQty: 0,
      issuedQty: 0,
      returnedQty: 0,
      transferOutQty: 0,
      transferInQty: 0,
      balAtStore: 0
    });

    const indexedRows = rows.map((r, index) => ({
      srNo: index + 1,
      ...r
    }));

    return { rows: indexedRows, totals };
  }
}
