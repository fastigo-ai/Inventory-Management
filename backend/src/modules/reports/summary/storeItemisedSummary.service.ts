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
  const variants = [t, t.toUpperCase(), t.toLowerCase(), t.charAt(0).toUpperCase() + t.slice(1).toLowerCase(), `${t} `];
  variants.push(`${t} Store`, `${t.toUpperCase()} STORE`, `${t.toLowerCase()} store`);
  if (/kumar\s*hat/i.test(t)) {
    variants.push('KUMAR HATI STORE', 'Kumar Hati Store', 'KUMAR HATI', 'Kumar Hati', 'Kumarhatti Store', 'Kumarhatti', 'Solan - Kumarhatti');
  }
  if (/solan/i.test(t)) {
    variants.push('Solan Store', 'SOLAN STORE', 'Solan - Kumarhatti');
  }
  if (/rampur/i.test(t)) {
    variants.push('RAMPUR STORE', 'Rampur Store');
  }
  if (/nahan/i.test(t)) {
    variants.push('NAHAN STORE', 'Nahan Store');
  }
  if (/rohru/i.test(t)) {
    variants.push('Rohru Store', 'Rohru store', 'ROHRU STORE');
  }
  return Array.from(new Set(variants));
};

const buildStoreRegex = (names: string[]): RegExp | null => {
  if (!names || names.length === 0) return null;
  const parts: string[] = [];
  names.forEach(n => {
    const clean = n.trim().replace(/store|circle/gi, '').trim();
    if (!clean) return;
    if (/kumar\s*hat/i.test(clean)) {
      parts.push('kumar\\s*hat[ti]*(\\s+(store|circle))?');
    } else if (/solan/i.test(clean)) {
      parts.push('solan(\\s*-\\s*kumarhatti)?(\\s+(store|circle))?');
    } else {
      parts.push(`${clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s+(store|circle))?`);
    }
  });
  if (parts.length === 0) return null;
  return new RegExp(`^(${parts.join('|')})$`, 'i');
};

const round3 = (val: number) => Math.round((Number(val || 0) + Number.EPSILON) * 1000) / 1000;

const normalizeCircle = (circ?: string): string => {
  if (!circ) return '';
  const c = circ.trim().toLowerCase();
  if (/solan|kumar\s*hat[ti]+|nalagarh/.test(c)) return 'Solan';
  if (/nahan/.test(c)) return 'Nahan';
  if (/rampur/.test(c)) return 'Rampur';
  if (/rohru/.test(c)) return 'Rohru';
  return circ.trim().charAt(0).toUpperCase() + circ.trim().slice(1).toLowerCase();
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
  // When store is a subcircle (e.g. Kumarhatti), resolve its parent circle so items tagged
  // with the parent circle are correctly included in the results.
  let itemLocVariants: string[] = [];
  const resolveItemCircles = (target: string): string[] => {
    const norm = normalizeCircle(target);
    const exp = expandCircle(norm || target) || [target];
    const results: string[] = [];
    exp.forEach(e => results.push(...getVariants(e)));
    // Also include the subcircle itself in variants
    results.push(...getVariants(target));
    return results;
  };

  if (store && store !== 'all' && store !== '') {
    // Store filter specified — include parent circle variants to catch items tagged with parent
    itemLocVariants = resolveItemCircles(store);
    if (circle && circle !== 'all' && circle !== 'All Circles') {
      const circleArr = circle.includes(',') ? circle.split(',').map(c => c.trim()).filter(Boolean) : [circle];
      circleArr.forEach(c => {
        const exp = expandCircle(c) || [c];
        exp.forEach(e => itemLocVariants.push(...getVariants(e)));
      });
    }
  } else if (circle && circle !== 'all' && circle !== 'All Circles') {
    const circleArr = circle.includes(',') ? circle.split(',').map(c => c.trim()).filter(Boolean) : [circle];
    circleArr.forEach(c => {
      const exp = expandCircle(c) || [c];
      exp.forEach(e => itemLocVariants.push(...getVariants(e)));
    });
  } else if (pkg && pkg !== 'all' && pkg !== 'All Packages') {
    if (pkg.includes('Package 1')) {
      itemLocVariants = [...getVariants('Solan'), ...getVariants('Nahan'), ...getVariants('Kumarhatti'), ...getVariants('Nalagarh')];
    } else if (pkg.includes('Package 2')) {
      itemLocVariants = [...getVariants('Rampur'), ...getVariants('Rohru')];
    }
  }
  itemLocVariants = Array.from(new Set(itemLocVariants));

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

  // 2. Determine Transaction Filter Variants & Regex
  let transLocTargets: string[] = [];
  const transTarget = store && store !== 'all' ? store : (circle && circle !== 'all' && circle !== 'All Circles' ? circle : null);
  if (transTarget) {
    const targets = transTarget.includes(',') ? transTarget.split(',').map(c => c.trim()).filter(Boolean) : [transTarget];
    targets.forEach(tgt => {
      const expanded = expandCircle(tgt) || [tgt];
      transLocTargets.push(...expanded);
    });
  } else if (pkg && pkg !== 'all' && pkg !== 'All Packages') {
    if (pkg.includes('Package 1')) {
      transLocTargets.push('Solan', 'Kumarhatti', 'Nalagarh', 'Nahan');
    } else if (pkg.includes('Package 2')) {
      transLocTargets.push('Rampur', 'Rohru');
    }
  }
  transLocTargets = Array.from(new Set(transLocTargets));
  const transLocRegex = buildStoreRegex(transLocTargets);

  let transLocVariants: string[] = [];
  transLocTargets.forEach(t => transLocVariants.push(...getVariants(t)));
  transLocVariants = Array.from(new Set(transLocVariants));

  const items = await Item.find(itemFilter)
    .select('dynamicData.tempCode dynamicData.name dynamicData.unit dynamicData.circle dynamicData.sku dynamicData.loaSerialNo dynamicData.package tempCode name unit circle sku package')
    .lean();

  if (viewMode === 'item') {
    // ----------------------------------------------------
    // A. ITEM-WISE AGGREGATION (Grouped by Temp Code / Name and Circle)
    // ----------------------------------------------------
    const groupMap = new Map<string, any>();
    const itemIdToGroup = new Map<string, any>();
    const tempCodeAndCircleToGroup = new Map<string, any>();
    const nameAndCircleToGroup = new Map<string, any>();

    items.forEach(it => {
      const d = it.dynamicData || {};
      const temp = String(d.tempCode || (it as any).tempCode || '').trim();
      const tempNum = Number(temp);
      const hasValidTemp = !isNaN(tempNum) && tempNum > 0;
      const name = String(d.name || (d as any).itemName || (d as any).description || (it as any).name || (it as any).itemName || (it as any).description || 'Unnamed Item').trim();
      const unit = String(d.unit || (it as any).unit || 'Nos').trim();
      const rawCircle = String(d.circle || (it as any).circle || circle || '').trim();
      const circleNorm = normalizeCircle(rawCircle) || 'Unknown';
      const sku = String(d.sku || (d as any).loaSerialNo || (it as any).sku || '').trim();
      const pkgName = getCirclePackage(circleNorm, d.package || (it as any).package || pkg);

      const groupKey = hasValidTemp ? `TEMP_${temp}_${circleNorm.toUpperCase()}` : `NAME_${name.toLowerCase()}_${circleNorm.toUpperCase()}`;

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          itemIds: new Set<string>(),
          tempCode: temp || '-',
          tempNum: hasValidTemp ? tempNum : 9999999,
          sku: sku || '-',
          name,
          unit,
          circle: circleNorm,
          package: pkgName,
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
      if (temp && temp !== '-') {
        tempCodeAndCircleToGroup.set(`${temp}_${circleNorm.toUpperCase()}`, grp);
        if (hasValidTemp) {
          tempCodeAndCircleToGroup.set(`${tempNum}_${circleNorm.toUpperCase()}`, grp);
        }
      }
      if (name) nameAndCircleToGroup.set(`${name.toLowerCase()}_${circleNorm.toUpperCase()}`, grp);
    });

    // Match conditions for transactions
    const inwardFilter: any = { status: { $ne: 'Voided' } };
    const assignFilter: any = { status: { $ne: 'Cancelled' } };
    const returnFilter: any = { status: { $nin: ['Cancelled', 'CANCELLED'] } };
    const transferOutFilter: any = { status: { $nin: ['Cancelled', 'REJECTED', 'CANCELLED'] } };
    const transferInFilter: any = { status: { $nin: ['Cancelled', 'REJECTED', 'CANCELLED'] } };
    const diFilter: any = { status: { $ne: 'Cancelled' } };
    const mhrovFilter: any = {};

    if (transLocRegex) {
      // Use both regex and $in for robustness (trailing spaces, casing edge cases)
      inwardFilter.$or = [
        { circle: transLocRegex },
        { subcircle: transLocRegex },
        { billingFrom: transLocRegex },
        { circle: { $in: transLocVariants } },
        { subcircle: { $in: transLocVariants } }
      ];
      assignFilter.$or = [
        { location: transLocRegex },
        { circle: transLocRegex },
        { subcircle: transLocRegex },
        { division: transLocRegex },
        { 'lineItems.circle': transLocRegex },
        { circle: { $in: transLocVariants } },
        { subcircle: { $in: transLocVariants } }
      ];
      returnFilter.$or = [
        { store: transLocRegex },
        { circle: transLocRegex },
        { location: transLocRegex },
        { subcircle: transLocRegex },
        { division: transLocRegex },
        { 'lineItems.circle': transLocRegex },
        { circle: { $in: transLocVariants } },
        { subcircle: { $in: transLocVariants } }
      ];
      transferOutFilter.$or = [
        { fromStore: transLocRegex },
        { fromStore: { $in: transLocVariants } }
      ];
      transferInFilter.$or = [
        { toStore: transLocRegex },
        { toStore: { $in: transLocVariants } }
      ];
    }

    if (itemLocVariants.length > 0) {
      diFilter.$or = [
        { circle: { $in: itemLocVariants } },
        { 'lineItems.circle': { $in: itemLocVariants } }
      ];
      mhrovFilter.circle = { $in: itemLocVariants };
    }

    // Parallel fetch of all 7 collections with full projections
    const [inwards, assignments, returns, transfersOut, transfersIn, dis, mhrovs] = await Promise.all([
      StoreInwardEntry.find(inwardFilter)
        .select('itemId totalQty invoiceQty acceptedQty receivedQty tempCode itemName name description circle store subcircle')
        .lean(),

      ContractorAssignment.find(assignFilter)
        .select('lineItems.itemId lineItems.quantity lineItems.acceptedQuantity lineItems.issuedQty lineItems.tempCode lineItems.itemName lineItems.circle circle location subcircle division')
        .lean(),

      ContractorReturn.find(returnFilter)
        .select('lineItems items circle store location subcircle division')
        .lean(),

      StoreTransfer.find(transferOutFilter)
        .select('items.itemId items.dispatchedQty items.quantity items.requestedQty items.receivedQty items.tempCode items.description items.itemName items.name items.loaSerialNo fromStore toStore registerType')
        .lean(),

      StoreTransfer.find(transferInFilter)
        .select('items.itemId items.receivedQty items.dispatchedQty items.quantity items.requestedQty items.tempCode items.description items.itemName items.name items.loaSerialNo fromStore toStore registerType')
        .lean(),

      DI.find(diFilter)
        .select('lineItems.itemId lineItems.quantity lineItems.tempCode lineItems.itemName lineItems.circle circle')
        .lean(),

      Mhrov.find(mhrovFilter)
        .select('items.itemId items.mhrovDoneQty circle')
        .lean()
    ]);

    const findGroup = (idStr: string | null, temp?: string, name?: string, docCircle?: string) => {
      const circNorm = normalizeCircle(docCircle || '');
      const cleanTemp = temp && temp !== '-' ? String(temp).trim() : '';
      const tempNum = Number(cleanTemp);
      const cleanName = name ? String(name).trim().toLowerCase() : '';

      if (circNorm) {
        if (cleanTemp && tempCodeAndCircleToGroup.has(`${cleanTemp}_${circNorm.toUpperCase()}`)) {
          return tempCodeAndCircleToGroup.get(`${cleanTemp}_${circNorm.toUpperCase()}`);
        }
        if (!isNaN(tempNum) && tempNum > 0 && tempCodeAndCircleToGroup.has(`${tempNum}_${circNorm.toUpperCase()}`)) {
          return tempCodeAndCircleToGroup.get(`${tempNum}_${circNorm.toUpperCase()}`);
        }
        if (cleanName && nameAndCircleToGroup.has(`${cleanName}_${circNorm.toUpperCase()}`)) {
          return nameAndCircleToGroup.get(`${cleanName}_${circNorm.toUpperCase()}`);
        }
      }

      if (idStr && itemIdToGroup.has(idStr)) {
        const grp = itemIdToGroup.get(idStr);
        if (!circNorm || grp.circle.toUpperCase() === circNorm.toUpperCase()) {
          return grp;
        }
      }

      if (idStr && itemIdToGroup.has(idStr)) return itemIdToGroup.get(idStr);

      if (cleanTemp) {
        for (const [key, grp] of tempCodeAndCircleToGroup.entries()) {
          if (key.startsWith(`${cleanTemp}_`)) return grp;
        }
      }

      return null;
    };

    // Fast O(1) in-memory accumulations
    inwards.forEach(doc => {
      const idStr = doc.itemId ? doc.itemId.toString() : null;
      const qty = Number(doc.totalQty || (doc as any).invoiceQty || (doc as any).acceptedQty || (doc as any).receivedQty || 0);
      const temp = String(doc.tempCode || '').trim();
      const name = String(doc.itemName || (doc as any).name || (doc as any).description || '').trim().toLowerCase();
      // Prefer subcircle for more specific location resolution (e.g. Kumarhatti over Solan)
      const docCircle = (doc as any).subcircle || (doc as any).circle || (doc as any).store;

      const grp = findGroup(idStr, temp, name, docCircle);
      if (grp) grp.receiptQty += qty;
    });

    assignments.forEach(doc => {
      (doc.lineItems || []).forEach((li: any) => {
        const idStr = li.itemId ? li.itemId.toString() : null;
        const qty = Number(li.quantity || li.acceptedQuantity || li.issuedQty || 0);
        const temp = String(li.tempCode || '').trim();
        const name = String(li.itemName || li.name || li.description || '').trim().toLowerCase();
        const docCircle = li.circle || doc.circle || (doc as any).location || (doc as any).subcircle || (doc as any).division;

        const grp = findGroup(idStr, temp, name, docCircle);
        if (grp) grp.issuedQty += qty;
      });
    });

    returns.forEach(doc => {
      (doc.lineItems || (doc as any).items || []).forEach((li: any) => {
        const idStr = li.itemId ? li.itemId.toString() : null;
        const qty = Number(li.quantity || li.acceptedQuantity || (li as any).returnedQty || (li as any).returnQty || 0);
        const temp = String(li.tempCode || '').trim();
        const name = String(li.itemName || li.name || li.description || '').trim().toLowerCase();
        const docCircle = li.circle || doc.circle || (doc as any).location || (doc as any).subcircle || (doc as any).division || (doc as any).store;

        const grp = findGroup(idStr, temp, name, docCircle);
        if (grp) grp.returnedQty += qty;
      });
    });

    transfersOut.forEach(doc => {
      (doc.items || []).forEach((it: any) => {
        const idStr = it.itemId ? it.itemId.toString() : null;
        const qty = Number(it.dispatchedQty || it.quantity || it.requestedQty || it.receivedQty || 0);
        const temp = String(it.tempCode || '').trim();
        const name = String(it.description || it.itemName || it.name || '').trim().toLowerCase();
        const docCircle = (doc as any).fromStore;

        const grp = findGroup(idStr, temp, name, docCircle);
        if (grp) grp.transferOutQty += qty;
      });
    });

    transfersIn.forEach(doc => {
      (doc.items || []).forEach((it: any) => {
        const idStr = it.itemId ? it.itemId.toString() : null;
        const qty = Number(it.receivedQty || it.dispatchedQty || it.quantity || it.requestedQty || 0);
        const temp = String(it.tempCode || '').trim();
        const name = String(it.description || it.itemName || it.name || '').trim().toLowerCase();
        const docCircle = (doc as any).toStore;

        const grp = findGroup(idStr, temp, name, docCircle);
        if (grp) grp.transferInQty += qty;
      });
    });

    dis.forEach(doc => {
      (doc.lineItems || []).forEach((li: any) => {
        const idStr = li.itemId ? li.itemId.toString() : null;
        const qty = Number(li.quantity || 0);
        const temp = String(li.tempCode || '').trim();
        const name = String(li.itemName || '').trim().toLowerCase();
        const docCircle = li.circle || doc.circle;

        const grp = findGroup(idStr, temp, name, docCircle);
        if (grp) grp.diQty += qty;
      });
    });

    mhrovs.forEach(doc => {
      (doc.items || []).forEach((it: any) => {
        const idStr = it.itemId ? it.itemId.toString() : null;
        const qty = Number(it.mhrovDoneQty || 0);
        const grp = findGroup(idStr, undefined, undefined, (doc as any).circle);
        if (grp) grp.mhrovQty += qty;
      });
    });

    let rows = Array.from(groupMap.values()).map(r => {
      r.receiptQty = round3(r.receiptQty);
      r.issuedQty = round3(r.issuedQty);
      r.returnedQty = round3(r.returnedQty);
      r.transferOutQty = round3(r.transferOutQty);
      r.transferInQty = round3(r.transferInQty);
      r.diQty = round3(r.diQty);
      r.mhrovQty = round3(r.mhrovQty);
      r.balAtStore = round3(r.receiptQty - r.issuedQty + r.returnedQty - r.transferOutQty + r.transferInQty);
      return r;
    });

    if (hideZeroBalance || transLocTargets.length > 0 || (pkg && pkg !== 'all')) {
      rows = rows.filter(r => r.receiptQty > 0 || r.issuedQty > 0 || r.returnedQty > 0 || r.transferOutQty > 0 || r.transferInQty > 0 || r.balAtStore !== 0);
    }

    // Sort by tempNum asc, then name, then circle
    rows.sort((a, b) => {
      if (a.tempNum !== b.tempNum) return a.tempNum - b.tempNum;
      if (a.name !== b.name) return a.name.localeCompare(b.name);
      return (a.circle || '').localeCompare(b.circle || '');
    });

    const totals = rows.reduce((acc, curr) => {
      acc.receiptQty = round3(acc.receiptQty + curr.receiptQty);
      acc.issuedQty = round3(acc.issuedQty + curr.issuedQty);
      acc.returnedQty = round3(acc.returnedQty + curr.returnedQty);
      acc.transferOutQty = round3(acc.transferOutQty + curr.transferOutQty);
      acc.transferInQty = round3(acc.transferInQty + curr.transferInQty);
      acc.balAtStore = round3(acc.balAtStore + curr.balAtStore);
      acc.diQty = round3(acc.diQty + curr.diQty);
      acc.mhrovQty = round3(acc.mhrovQty + curr.mhrovQty);
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
    const tempCodeCircleMap = new Map<string, any>();
    const skuCircleMap = new Map<string, any>();
    const tempCodeMap = new Map<string, any>();
    const skuMap = new Map<string, any>();
    const tempCodeCircleListMap = new Map<string, any[]>();

    items.forEach(it => {
      const d = it.dynamicData || {};
      const temp = String(d.tempCode || (it as any).tempCode || '').trim();
      const tempNum = Number(temp);
      const hasValidTemp = !isNaN(tempNum) && tempNum > 0;
      const name = String(d.name || (d as any).itemName || (d as any).description || (it as any).name || (it as any).itemName || (it as any).description || 'Unnamed Item').trim();
      const rawCircle = String(d.circle || (it as any).circle || circle || '').trim();
      const circleNorm = normalizeCircle(rawCircle) || 'Unknown';
      const pkgName = getCirclePackage(circleNorm, d.package || (it as any).package || pkg);
      const sku = String(d.sku || (d as any).loaSerialNo || (it as any).sku || '').trim();

      const row = {
        itemId: it._id,
        tempCode: temp,
        tempNum: hasValidTemp ? tempNum : 9999999,
        sku,
        name,
        unit: d.unit || (it as any).unit || 'Nos',
        package: pkgName,
        circle: circleNorm,
        receiptQty: 0,
        issuedQty: 0,
        returnedQty: 0,
        transferOutQty: 0,
        transferInQty: 0,
        balAtStore: 0,
        diQty: 0,
        mhrovQty: 0
      };

      const idStr = it._id.toString();
      itemMap.set(idStr, row);

      if (temp && temp !== '-') {
        tempCodeCircleMap.set(`${temp}_${circleNorm.toUpperCase()}`, row);
        tempCodeMap.set(temp, row);
        if (hasValidTemp) {
          tempCodeCircleMap.set(`${tempNum}_${circleNorm.toUpperCase()}`, row);
          tempCodeMap.set(String(tempNum), row);
        }

        const listKey = `${temp}_${circleNorm.toUpperCase()}`;
        if (!tempCodeCircleListMap.has(listKey)) {
          tempCodeCircleListMap.set(listKey, []);
        }
        tempCodeCircleListMap.get(listKey)!.push(row);
      }
      if (sku && sku !== '-') {
        skuCircleMap.set(`${sku}_${circleNorm.toUpperCase()}`, row);
        skuMap.set(sku, row);
      }
    });

    const findLoaItem = (idStr: string | null, temp?: string, sku?: string, docCircle?: string) => {
      if (idStr && itemMap.has(idStr)) return itemMap.get(idStr);
      const circNorm = normalizeCircle(docCircle || '');
      const cleanTemp = temp && temp !== '-' ? String(temp).trim() : '';
      const tempNum = Number(cleanTemp);
      const cleanSku = sku && sku !== '-' ? String(sku).trim() : '';

      if (circNorm) {
        if (cleanSku && skuCircleMap.has(`${cleanSku}_${circNorm.toUpperCase()}`)) {
          return skuCircleMap.get(`${cleanSku}_${circNorm.toUpperCase()}`);
        }
        if (cleanTemp && tempCodeCircleMap.has(`${cleanTemp}_${circNorm.toUpperCase()}`)) {
          return tempCodeCircleMap.get(`${cleanTemp}_${circNorm.toUpperCase()}`);
        }
        if (!isNaN(tempNum) && tempNum > 0 && tempCodeCircleMap.has(`${tempNum}_${circNorm.toUpperCase()}`)) {
          return tempCodeCircleMap.get(`${tempNum}_${circNorm.toUpperCase()}`);
        }
      }

      if (cleanSku && skuMap.has(cleanSku)) return skuMap.get(cleanSku);
      if (cleanTemp && tempCodeMap.has(cleanTemp)) return tempCodeMap.get(cleanTemp);
      if (!isNaN(tempNum) && tempNum > 0 && tempCodeMap.has(String(tempNum))) return tempCodeMap.get(String(tempNum));

      return null;
    };

    const inwardFilter: any = { status: { $ne: 'Voided' } };
    const assignFilter: any = { status: { $ne: 'Cancelled' } };
    const returnFilter: any = { status: { $nin: ['Cancelled', 'CANCELLED'] } };
    const transferOutFilter: any = { status: { $nin: ['Cancelled', 'REJECTED', 'CANCELLED'] } };
    const transferInFilter: any = { status: { $nin: ['Cancelled', 'REJECTED', 'CANCELLED'] } };
    const diFilter: any = { status: { $ne: 'Cancelled' } };
    const mhrovFilter: any = {};

    if (transLocRegex) {
      // Use both regex and $in for robustness (trailing spaces, casing edge cases)
      inwardFilter.$or = [
        { circle: transLocRegex },
        { subcircle: transLocRegex },
        { billingFrom: transLocRegex },
        { circle: { $in: transLocVariants } },
        { subcircle: { $in: transLocVariants } }
      ];
      assignFilter.$or = [
        { location: transLocRegex },
        { circle: transLocRegex },
        { subcircle: transLocRegex },
        { division: transLocRegex },
        { 'lineItems.circle': transLocRegex },
        { circle: { $in: transLocVariants } },
        { subcircle: { $in: transLocVariants } }
      ];
      returnFilter.$or = [
        { store: transLocRegex },
        { circle: transLocRegex },
        { location: transLocRegex },
        { subcircle: transLocRegex },
        { division: transLocRegex },
        { 'lineItems.circle': transLocRegex },
        { circle: { $in: transLocVariants } },
        { subcircle: { $in: transLocVariants } }
      ];
      transferOutFilter.$or = [
        { fromStore: transLocRegex },
        { fromStore: { $in: transLocVariants } }
      ];
      transferInFilter.$or = [
        { toStore: transLocRegex },
        { toStore: { $in: transLocVariants } }
      ];
    }

    if (itemLocVariants.length > 0) {
      diFilter.$or = [
        { circle: { $in: itemLocVariants } },
        { 'lineItems.circle': { $in: itemLocVariants } }
      ];
      mhrovFilter.circle = { $in: itemLocVariants };
    }

    const [inwards, assignments, returns, transfersOut, transfersIn, dis, mhrovs] = await Promise.all([
      StoreInwardEntry.find(inwardFilter)
        .select('itemId totalQty invoiceQty acceptedQty receivedQty tempCode itemName name description circle store subcircle loaSerialNo')
        .lean(),

      ContractorAssignment.find(assignFilter)
        .select('lineItems.itemId lineItems.quantity lineItems.acceptedQuantity lineItems.issuedQty lineItems.tempCode lineItems.itemName lineItems.circle lineItems.loaSerialNo lineItems.loaSrNo circle location subcircle division')
        .lean(),

      ContractorReturn.find(returnFilter)
        .select('lineItems items circle store location subcircle division')
        .lean(),

      StoreTransfer.find(transferOutFilter)
        .select('items.itemId items.dispatchedQty items.quantity items.requestedQty items.receivedQty items.tempCode items.description items.itemName items.name items.loaSerialNo fromStore toStore registerType')
        .lean(),

      StoreTransfer.find(transferInFilter)
        .select('items.itemId items.receivedQty items.dispatchedQty items.quantity items.requestedQty items.tempCode items.description items.itemName items.name items.loaSerialNo fromStore toStore registerType')
        .lean(),

      DI.find(diFilter)
        .select('lineItems.itemId lineItems.quantity lineItems.tempCode lineItems.itemName lineItems.circle circle')
        .lean(),

      Mhrov.find(mhrovFilter)
        .select('items.itemId items.mhrovDoneQty circle')
        .lean()
    ]);

    inwards.forEach(doc => {
      const idStr = doc.itemId ? doc.itemId.toString() : null;
      const qty = Number(doc.totalQty || (doc as any).invoiceQty || (doc as any).acceptedQty || (doc as any).receivedQty || 0);
      // Prefer subcircle for more specific location resolution (e.g. Kumarhatti over Solan)
      const docCircle = (doc as any).subcircle || (doc as any).circle || (doc as any).store;
      const row = findLoaItem(idStr, doc.tempCode, (doc as any).loaSerialNo, docCircle);
      if (row) {
        row.receiptQty += qty;
      }
    });

    assignments.forEach(doc => {
      (doc.lineItems || []).forEach((li: any) => {
        const idStr = li.itemId ? li.itemId.toString() : null;
        const qty = Number(li.quantity || li.acceptedQuantity || li.issuedQty || 0);
        const docCircle = li.circle || doc.circle || (doc as any).location || (doc as any).subcircle || (doc as any).division;
        const row = findLoaItem(idStr, li.tempCode, li.loaSrNo || li.loaSerialNo, docCircle);
        if (row) {
          row.issuedQty += qty;
        }
      });
    });

    returns.forEach(doc => {
      (doc.lineItems || (doc as any).items || []).forEach((li: any) => {
        const idStr = li.itemId ? li.itemId.toString() : null;
        const qty = Number(li.quantity || li.acceptedQuantity || (li as any).returnedQty || (li as any).returnQty || 0);
        const docCircle = li.circle || doc.circle || (doc as any).location || (doc as any).subcircle || (doc as any).division || (doc as any).store;
        const row = findLoaItem(idStr, li.tempCode, li.loaSrNo || li.loaSerialNo, docCircle);
        if (row) {
          row.returnedQty += qty;
        }
      });
    });

    // 1. Process Received Transfers (Inward)
    // When no specific LOA serial no is given, equally divide the received quantity across all LOA serial numbers of that item in the receiving store
    transfersIn.forEach(doc => {
      const circNorm = normalizeCircle(doc.toStore || '');
      (doc.items || []).forEach((it: any) => {
        const idStr = it.itemId ? it.itemId.toString() : null;
        const qty = Number(it.receivedQty || it.dispatchedQty || it.quantity || it.requestedQty || 0);
        if (qty <= 0) return;

        const cleanLoa = it.loaSerialNo && it.loaSerialNo !== '-' ? String(it.loaSerialNo).trim() : '';
        if (cleanLoa) {
          const row = findLoaItem(idStr, it.tempCode, cleanLoa, circNorm);
          if (row) row.transferInQty += qty;
        } else {
          const listKey = `${String(it.tempCode || '').trim()}_${circNorm.toUpperCase()}`;
          const matchingRows = tempCodeCircleListMap.get(listKey);
          if (matchingRows && matchingRows.length > 0) {
            const splitQty = round3(qty / matchingRows.length);
            matchingRows.forEach(r => {
              r.transferInQty += splitQty;
            });
          } else {
            const fallbackRow = findLoaItem(idStr, it.tempCode, undefined, circNorm);
            if (fallbackRow) fallbackRow.transferInQty += qty;
          }
        }
      });
    });

    // 2. Process Outward Transfers
    // When no specific LOA serial no is given, deduct from the LOA serial numbers that currently have positive available stock in that store
    transfersOut.forEach(doc => {
      const circNorm = normalizeCircle(doc.fromStore || '');
      (doc.items || []).forEach((it: any) => {
        const idStr = it.itemId ? it.itemId.toString() : null;
        let qtyToDeduct = Number(it.dispatchedQty || it.quantity || it.requestedQty || it.receivedQty || 0);
        if (qtyToDeduct <= 0) return;

        const cleanLoa = it.loaSerialNo && it.loaSerialNo !== '-' ? String(it.loaSerialNo).trim() : '';
        if (cleanLoa) {
          const row = findLoaItem(idStr, it.tempCode, cleanLoa, circNorm);
          if (row) row.transferOutQty += qtyToDeduct;
        } else {
          const listKey = `${String(it.tempCode || '').trim()}_${circNorm.toUpperCase()}`;
          const matchingRows = tempCodeCircleListMap.get(listKey);
          if (matchingRows && matchingRows.length > 0) {
            // Find rows with positive stock before transfer out
            const positiveRows = matchingRows.filter(r => (r.receiptQty - r.issuedQty + r.returnedQty + r.transferInQty - r.transferOutQty) > 0);
            const targetRows = positiveRows.length > 0 ? positiveRows : matchingRows;

            // Deduct from rows with positive balance first
            for (const r of targetRows) {
              if (qtyToDeduct <= 0) break;
              const currentBal = Math.max(0, r.receiptQty - r.issuedQty + r.returnedQty + r.transferInQty - r.transferOutQty);
              const deduct = positiveRows.length > 0 ? Math.min(qtyToDeduct, currentBal) : qtyToDeduct;
              r.transferOutQty += deduct;
              qtyToDeduct -= deduct;
            }

            // If any remainder, attribute to the first matching row
            if (qtyToDeduct > 0 && targetRows.length > 0) {
              targetRows[0].transferOutQty += qtyToDeduct;
            }
          } else {
            const fallbackRow = findLoaItem(idStr, it.tempCode, undefined, circNorm);
            if (fallbackRow) fallbackRow.transferOutQty += qtyToDeduct;
          }
        }
      });
    });

    dis.forEach(doc => {
      (doc.lineItems || []).forEach((li: any) => {
        const idStr = li.itemId ? li.itemId.toString() : null;
        const qty = Number(li.quantity || 0);
        const row = findLoaItem(idStr, li.tempCode, undefined, li.circle || doc.circle);
        if (row) {
          row.diQty += qty;
        }
      });
    });

    mhrovs.forEach(doc => {
      (doc.items || []).forEach((it: any) => {
        const idStr = it.itemId ? it.itemId.toString() : null;
        const qty = Number(it.mhrovDoneQty || 0);
        const row = findLoaItem(idStr, undefined, undefined, (doc as any).circle);
        if (row) {
          row.mhrovQty += qty;
        }
      });
    });

    let rows = Array.from(itemMap.values()).map(row => {
      row.receiptQty = round3(row.receiptQty);
      row.issuedQty = round3(row.issuedQty);
      row.returnedQty = round3(row.returnedQty);
      row.transferOutQty = round3(row.transferOutQty);
      row.transferInQty = round3(row.transferInQty);
      row.diQty = round3(row.diQty || 0);
      row.mhrovQty = round3(row.mhrovQty || 0);
      row.balAtStore = round3(row.receiptQty - row.issuedQty + row.returnedQty - row.transferOutQty + row.transferInQty);
      return row;
    });

    if (hideZeroBalance || transLocTargets.length > 0 || (pkg && pkg !== 'all')) {
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
      acc.receiptQty = round3(acc.receiptQty + curr.receiptQty);
      acc.issuedQty = round3(acc.issuedQty + curr.issuedQty);
      acc.returnedQty = round3(acc.returnedQty + curr.returnedQty);
      acc.transferOutQty = round3(acc.transferOutQty + curr.transferOutQty);
      acc.transferInQty = round3(acc.transferInQty + curr.transferInQty);
      acc.balAtStore = round3(acc.balAtStore + curr.balAtStore);
      acc.diQty = round3(acc.diQty + curr.diQty);
      acc.mhrovQty = round3(acc.mhrovQty + curr.mhrovQty);
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
  }
}
