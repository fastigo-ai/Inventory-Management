async function computeItemMatrixSummary(params: {
  package?: string;
  circle?: string;
  targetCircle?: string;
  search?: string;
}) {
  const { package: pkg, circle, targetCircle = 'SOLAN', search } = params;

  const cacheKey = `${pkg || ''}___${circle || ''}___${targetCircle || ''}___${search || ''}`;
  const cached = matrixCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < MATRIX_CACHE_TTL)) {
    return cached.data;
  }

  const itemFilter: any = { isDeleted: { $ne: true } };

  if (pkg && pkg !== 'all' && pkg !== '') {
    itemFilter['dynamicData.package'] = { $regex: new RegExp(pkg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') };
  }
  if (circle && circle !== 'all' && circle !== '') {
    itemFilter['dynamicData.circle'] = { $regex: new RegExp(`^${circle}$`, 'i') };
  }
  if (search) {
    const searchTerm = search.toString().trim();
    const isNumeric = !isNaN(Number(searchTerm)) && searchTerm !== '';

    if (isNumeric) {
      itemFilter['dynamicData.tempCode'] = searchTerm;
    } else {
      const s = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      itemFilter.$or = [
        { 'dynamicData.name': { $regex: s, $options: 'i' } },
        { 'dynamicData.tempCode': searchTerm },
        { 'dynamicData.sku': { $regex: s, $options: 'i' } },
        { 'dynamicData.loaSerialNo': { $regex: s, $options: 'i' } }
      ];
    }
  }

  const items = await Item.find(itemFilter, { dynamicData: 1, tempCode: 1, sku: 1, name: 1, unit: 1, circle: 1, package: 1 }).lean();

  // Group master items by unique Circle + LOA Sr No
  const groupedItemsMap = new Map<string, {
    loaSerialNo: string;
    tempCode: string;
    itemName: string;
    unit: string;
    package: string;
    circle: string;
    itemIds: string[];
    nahanLoaQty: number;
    nahanBomQty: number;
    solanLoaQty: number;
    solanBomQty: number;
    rampurLoaQty: number;
    rampurBomQty: number;
    rohruLoaQty: number;
    rohruBomQty: number;
  }>();

  const itemIdToKeyMap = new Map<string, string>();
  const tempCodeToKeyMap = new Map<string, string>();

  items.forEach(it => {
    const d = it.dynamicData || {};
    const loaSrNo = String(d.loaSerialNo || d.loaSrNo || d.sku || d.tempCode || it.sku || it.tempCode || '').trim() || it._id.toString();
    const tc = String(d.tempCode || it.tempCode || '').trim();
    const name = String(d.name || d.itemName || d.description || it.name || '').trim();
    const unit = String(d.unit || it.unit || '').trim();
    const pkgVal = String(d.package || it.package || '').trim();
    const circleVal = String(d.circle || it.circle || '').trim();

    // Grouping by Package + Circle + LOA Sr No ensures an item only belongs to its own circle
    const groupKey = `${pkgVal ? pkgVal + '___' : ''}${loaSrNo}`;

    if (!groupedItemsMap.has(groupKey)) {
      groupedItemsMap.set(groupKey, {
        loaSerialNo: loaSrNo,
        tempCode: tc,
        itemName: name,
        unit,
        package: pkgVal,
        circle: circleVal,
        itemIds: [],
        nahanLoaQty: 0,
        nahanBomQty: 0,
        solanLoaQty: 0,
        solanBomQty: 0,
        rampurLoaQty: 0,
        rampurBomQty: 0,
        rohruLoaQty: 0,
        rohruBomQty: 0,
      });
    }

    const grp = groupedItemsMap.get(groupKey)!;
    grp.itemIds.push(it._id.toString());
    itemIdToKeyMap.set(it._id.toString(), groupKey);
    if (tc) tempCodeToKeyMap.set(`${pkgVal ? pkgVal + '___' : ''}${tc}`, groupKey);
    if (tc) tempCodeToKeyMap.set(`${pkgVal ? pkgVal + '___' : ''}${circleVal ? circleVal + '___' : ''}${tc}`, groupKey);

    if (!grp.itemName && name) grp.itemName = name;
    if (!grp.tempCode && tc) grp.tempCode = tc;
    if (!grp.unit && unit) grp.unit = unit;
    if (circleVal && !grp.circle.toLowerCase().includes(circleVal.toLowerCase())) {
      grp.circle += `, ${circleVal}`;
    }

    const circleLower = circleVal.toLowerCase();
    const loaQty = Number(d.loaQuantity || d.quantity || 0);
    const bomQty = Number(d.bomQuantity || d.bomQty || 0);

    // Each item strictly belongs to ONE circle
    if (circleLower.includes('solan')) {
      grp.solanLoaQty += loaQty || Number(d.solanLoaQuantity || 0);
      grp.solanBomQty += bomQty || Number(d.solanBomQuantity || 0);
    } else if (circleLower.includes('nahan')) {
      grp.nahanLoaQty += loaQty || Number(d.nahanLoaQuantity || 0);
      grp.nahanBomQty += bomQty || Number(d.nahanBomQuantity || 0);
    } else if (circleLower.includes('rampur')) {
      grp.rampurLoaQty += loaQty || Number(d.rampurLoaQuantity || 0);
      grp.rampurBomQty += bomQty || Number(d.rampurBomQuantity || 0);
    } else if (circleLower.includes('rohru')) {
      grp.rohruLoaQty += loaQty || Number(d.rohruLoaQuantity || 0);
      grp.rohruBomQty += bomQty || Number(d.rohruBomQuantity || 0);
    }
  });

  const getTargetTempCodes = (lineItemId: any, lineTempCode: any, lineLoaSrNo?: any, linePkg?: any, lineCircle?: any): string[] => {
    const idStr = lineItemId ? lineItemId.toString() : '';
    const circ = String(lineCircle || '').trim().toLowerCase();

    if (idStr && itemIdToKeyMap.has(idStr)) {
      const mappedKey = itemIdToKeyMap.get(idStr)!;
      const grp = groupedItemsMap.get(mappedKey);
      
      // Validation: If the circle is specified in the transaction (e.g. MIN was for Rohru)
      // but the master item we got by ID belongs to Solan, the ID is an erroneous cross-circle 
      // assignment from the UI. We should ignore it and rely on the fallback logic below.
      if (grp && circ && !grp.circle.toLowerCase().includes(circ)) {
         // Cross-circle mismatch, ignore this itemId
      } else {
         return [mappedKey];
      }
    }
    const loaSr = String(lineLoaSrNo || '').trim();

    if (loaSr && circ) {
      for (const [k, grp] of groupedItemsMap.entries()) {
        if (grp.loaSerialNo === loaSr && grp.circle.toLowerCase().includes(circ)) {
          return [k];
        }
      }
    }
    if (loaSr) {
      for (const [k, grp] of groupedItemsMap.entries()) {
        if (grp.loaSerialNo === loaSr) {
          return [k];
        }
      }
    }
    let tc = String(lineTempCode || '').trim();
    if (!tc && lineItemId) {
      const k = itemIdToKeyMap.get(lineItemId.toString());
      if (k) {
        tc = groupedItemsMap.get(k)?.tempCode || '';
      }
    }

    if (tc && circ) {
      const matches: string[] = [];
      for (const [k, grp] of groupedItemsMap.entries()) {
        if (grp.tempCode === tc && grp.circle.toLowerCase().includes(circ)) {
          matches.push(k);
        }
      }
      if (matches.length > 0) return matches; // Return ALL matches for proportional distribution
    }
    
    if (lineItemId) {
      const k = itemIdToKeyMap.get(lineItemId.toString());
      if (k) return [k];
    }
    return [];
  };

  // 1-5. Run all 7 transaction queries concurrently in parallel with tight field projection
  const [dis, inwards, mhrovs, mins, jmcs, contractorInvoices, pis] = await Promise.all([
    DI.find(
      { status: { $ne: 'Cancelled' } },
      { circle: 1, 'lineItems.quantity': 1, 'lineItems.itemId': 1, 'lineItems.tempCode': 1, 'lineItems.loaSerialNo': 1, 'lineItems.loaSrNo': 1, 'lineItems.circle': 1 }
    ).lean(),
    StoreInwardEntry.find(
      {},
      { circle: 1, subcircle: 1, billingFrom: 1, invoiceQty: 1, acceptedQty: 1, totalQty: 1, itemId: 1, tempCode: 1, loaSerialNo: 1, loaSrNo: 1, serialNumber: 1, package: 1 }
    ).lean(),
    Mhrov.find(
      { status: { $ne: 'Cancelled' } },
      { circle: 1, 'items.mhrovDoneQty': 1, 'items.itemId': 1 }
    ).lean(),
    ContractorAssignment.find(
      {},
      { circle: 1, 'lineItems.quantity': 1, 'lineItems.itemId': 1, 'lineItems.tempCode': 1, 'lineItems.loaSerialNo': 1, 'lineItems.loaSrNo': 1, 'lineItems.circle': 1 }
    ).lean(),
    JmcRegister.find(
      { status: { $nin: ['Rejected', 'Cancelled'] } },
      { circle: 1, 'items.approvedQty': 1, 'items.claimedQty': 1, 'items.itemId': 1, 'items.tempCode': 1, 'items.loaSerialNo': 1, 'items.loaSrNo': 1, 'items.circle': 1 }
    ).lean(),
    ContractorInvoice.find(
      { status: { $ne: 'Cancelled' as any } },
      { circle: 1, 'lineItems.quantity': 1, 'lineItems.installedQty': 1, 'lineItems.itemId': 1, 'lineItems.tempCode': 1, 'lineItems.loaSerialNo': 1, 'lineItems.loaSrNo': 1, 'lineItems.circle': 1 }
    ).lean(),
    PurchaseInvoice.find(
      { status: { $ne: 'Cancelled' } },
      { circle: 1, 'lineItems.quantity': 1, 'lineItems.act': 1, 'lineItems.itemId': 1, 'lineItems.tempCode': 1, 'lineItems.loaSerialNo': 1, 'lineItems.loaSrNo': 1, 'lineItems.circle': 1 }
    ).lean()
  ]);

  // 1. Dispatched (DI)
  const diMap = new Map<string, Record<string, number>>();
  dis.forEach(d => {
    const docCircle = (d.circle || '').toLowerCase();
    (d.lineItems || []).forEach((line: any) => {
      const qty = Number(line.quantity || 0);
      if (qty > 0) {
        const lineCirc = (line.circle || docCircle || '').toLowerCase();
        const targetTCs = getTargetTempCodes(line.itemId, line.tempCode, line.loaSerialNo || line.loaSrNo || line.sku, line.package || d.package, lineCirc);
        if (targetTCs.length === 1) {
           const tc = targetTCs[0];
           if (!diMap.has(tc)) diMap.set(tc, { solan: 0, nahan: 0, rampur: 0, rohru: 0 });
           const obj = diMap.get(tc)!;
           if (lineCirc.includes('solan')) obj.solan += qty;
           else if (lineCirc.includes('nahan')) obj.nahan += qty;
           else if (lineCirc.includes('rampur')) obj.rampur += qty;
           else if (lineCirc.includes('rohru')) obj.rohru += qty;
           else obj.nahan += qty;
        } else if (targetTCs.length > 1) {
           let totalLoaQty = 0;
           targetTCs.forEach(tc => {
              const grp = groupedItemsMap.get(tc);
              if (grp) {
                 if (lineCirc.includes('solan')) totalLoaQty += grp.solanLoaQty;
                 else if (lineCirc.includes('nahan')) totalLoaQty += grp.nahanLoaQty;
                 else if (lineCirc.includes('rampur')) totalLoaQty += grp.rampurLoaQty;
                 else if (lineCirc.includes('rohru')) totalLoaQty += grp.rohruLoaQty;
              }
           });
           targetTCs.forEach(tc => {
              const grp = groupedItemsMap.get(tc);
              if (grp) {
                 let myLoaQty = 0;
                 if (lineCirc.includes('solan')) myLoaQty = grp.solanLoaQty;
                 else if (lineCirc.includes('nahan')) myLoaQty = grp.nahanLoaQty;
                 else if (lineCirc.includes('rampur')) myLoaQty = grp.rampurLoaQty;
                 else if (lineCirc.includes('rohru')) myLoaQty = grp.rohruLoaQty;
                 
                 const distributedQty = totalLoaQty > 0 ? (qty * (myLoaQty / totalLoaQty)) : (qty / targetTCs.length);
                 if (!diMap.has(tc)) diMap.set(tc, { solan: 0, nahan: 0, rampur: 0, rohru: 0 });
                 const obj = diMap.get(tc)!;
                 if (lineCirc.includes('solan')) obj.solan += distributedQty;
                 else if (lineCirc.includes('nahan')) obj.nahan += distributedQty;
                 else if (lineCirc.includes('rampur')) obj.rampur += distributedQty;
                 else if (lineCirc.includes('rohru')) obj.rohru += distributedQty;
                 else obj.nahan += distributedQty;
              }
           });
        }
      }
    });
  });

  // 2. Inward (Store Receipts / MRHOV / SRV)
  const inwardMap = new Map<string, Record<string, number>>();
  inwards.forEach(doc => {
    const qty = Number(doc.invoiceQty || doc.acceptedQty || doc.totalQty || 0);
    if (qty > 0) {
      const circ = (doc.circle || doc.subcircle || doc.billingFrom || '').toLowerCase();
      const targetTCs = getTargetTempCodes(doc.itemId, doc.tempCode, doc.serialNumber || doc.loaSerialNo || (doc as any).loaSrNo || (doc as any).sku, (doc as any).package, circ);
      
      if (targetTCs.length === 1) {
         const tc = targetTCs[0];
         if (!inwardMap.has(tc)) inwardMap.set(tc, { solan: 0, nahan: 0, rampur: 0, rohru: 0 });
         const m = inwardMap.get(tc)!;
         if (circ.includes('solan')) m.solan += qty;
         else if (circ.includes('nahan')) m.nahan += qty;
         else if (circ.includes('rampur')) m.rampur += qty;
         else if (circ.includes('rohru')) m.rohru += qty;
         else m.nahan += qty;
      } else if (targetTCs.length > 1) {
         let totalLoaQty = 0;
         targetTCs.forEach(tc => {
            const grp = groupedItemsMap.get(tc);
            if (grp) {
               if (circ.includes('solan')) totalLoaQty += grp.solanLoaQty;
               else if (circ.includes('nahan')) totalLoaQty += grp.nahanLoaQty;
               else if (circ.includes('rampur')) totalLoaQty += grp.rampurLoaQty;
               else if (circ.includes('rohru')) totalLoaQty += grp.rohruLoaQty;
            }
         });
         targetTCs.forEach(tc => {
            const grp = groupedItemsMap.get(tc);
            if (grp) {
               let myLoaQty = 0;
               if (circ.includes('solan')) myLoaQty = grp.solanLoaQty;
               else if (circ.includes('nahan')) myLoaQty = grp.nahanLoaQty;
               else if (circ.includes('rampur')) myLoaQty = grp.rampurLoaQty;
               else if (circ.includes('rohru')) myLoaQty = grp.rohruLoaQty;
               
               const distributedQty = totalLoaQty > 0 ? (qty * (myLoaQty / totalLoaQty)) : (qty / targetTCs.length);
               if (!inwardMap.has(tc)) inwardMap.set(tc, { solan: 0, nahan: 0, rampur: 0, rohru: 0 });
               const m = inwardMap.get(tc)!;
               if (circ.includes('solan')) m.solan += distributedQty;
               else if (circ.includes('nahan')) m.nahan += distributedQty;
               else if (circ.includes('rampur')) m.rampur += distributedQty;
               else if (circ.includes('rohru')) m.rohru += distributedQty;
               else m.nahan += distributedQty;
            }
         });
      }
    }
  });

  // 2b. MHROV
  const mhrovMap = new Map<string, Record<string, number>>();
  mhrovs.forEach(doc => {
    const docCirc = (doc.circle || '').toLowerCase();
    (doc.items || []).forEach((line: any) => {
      const qty = Number(line.mhrovDoneQty || 0);
      if (qty > 0) {
        const targetTCs = getTargetTempCodes(line.itemId, undefined, undefined, undefined, docCirc);
        if (targetTCs.length === 1) {
          const tc = targetTCs[0];
          if (!mhrovMap.has(tc)) mhrovMap.set(tc, { solan: 0, nahan: 0, rampur: 0, rohru: 0 });
          const m = mhrovMap.get(tc)!;
          if (docCirc.includes('solan')) m.solan += qty;
          else if (docCirc.includes('nahan')) m.nahan += qty;
          else if (docCirc.includes('rampur')) m.rampur += qty;
          else if (docCirc.includes('rohru')) m.rohru += qty;
          else m.nahan += qty;
        } else if (targetTCs.length > 1) {
          let totalLoaQty = 0;
          targetTCs.forEach(tc => {
            const grp = groupedItemsMap.get(tc);
            if (grp) {
               if (docCirc.includes('solan')) totalLoaQty += grp.solanLoaQty;
               else if (docCirc.includes('nahan')) totalLoaQty += grp.nahanLoaQty;
               else if (docCirc.includes('rampur')) totalLoaQty += grp.rampurLoaQty;
               else if (docCirc.includes('rohru')) totalLoaQty += grp.rohruLoaQty;
            }
          });
          targetTCs.forEach(tc => {
            const grp = groupedItemsMap.get(tc);
            if (grp) {
               let myLoaQty = 0;
               if (docCirc.includes('solan')) myLoaQty = grp.solanLoaQty;
               else if (docCirc.includes('nahan')) myLoaQty = grp.nahanLoaQty;
               else if (docCirc.includes('rampur')) myLoaQty = grp.rampurLoaQty;
               else if (docCirc.includes('rohru')) myLoaQty = grp.rohruLoaQty;
               
               const distributedQty = totalLoaQty > 0 ? (qty * (myLoaQty / totalLoaQty)) : (qty / targetTCs.length);
               if (!mhrovMap.has(tc)) mhrovMap.set(tc, { solan: 0, nahan: 0, rampur: 0, rohru: 0 });
               const m = mhrovMap.get(tc)!;
               if (docCirc.includes('solan')) m.solan += distributedQty;
               else if (docCirc.includes('nahan')) m.nahan += distributedQty;
               else if (docCirc.includes('rampur')) m.rampur += distributedQty;
               else if (docCirc.includes('rohru')) m.rohru += distributedQty;
               else m.nahan += distributedQty;
            }
          });
        }
      }
    });
  });

  // 3. MIN / Issue (Contractor Assignment)
  const minMap = new Map<string, Record<string, number>>();
  mins.forEach(doc => {
    const docCirc = (doc.circle || '').toLowerCase();
    (doc.lineItems || []).forEach((line: any) => {
      const qty = Number(line.quantity || 0);
      if (qty > 0) {
        const lineCirc = (line.circle || docCirc || '').toLowerCase();
        const targetTCs = getTargetTempCodes(line.itemId, line.tempCode, line.loaSerialNo || line.loaSrNo || line.sku, line.package || (doc as any).package, lineCirc);
        
        if (targetTCs.length === 1) {
           const tc = targetTCs[0];
           if (!minMap.has(tc)) minMap.set(tc, { solan: 0, nahan: 0, rampur: 0, rohru: 0 });
           const m = minMap.get(tc)!;
           if (lineCirc.includes('solan')) m.solan += qty;
           else if (lineCirc.includes('nahan')) m.nahan += qty;
           else if (lineCirc.includes('rampur')) m.rampur += qty;
           else if (lineCirc.includes('rohru')) m.rohru += qty;
           else m.nahan += qty;
        } else if (targetTCs.length > 1) {
           let totalLoaQty = 0;
           targetTCs.forEach(tc => {
              const grp = groupedItemsMap.get(tc);
              if (grp) {
                 if (lineCirc.includes('solan')) totalLoaQty += grp.solanLoaQty;
                 else if (lineCirc.includes('nahan')) totalLoaQty += grp.nahanLoaQty;
                 else if (lineCirc.includes('rampur')) totalLoaQty += grp.rampurLoaQty;
                 else if (lineCirc.includes('rohru')) totalLoaQty += grp.rohruLoaQty;
              }
           });
           targetTCs.forEach(tc => {
              const grp = groupedItemsMap.get(tc);
              if (grp) {
                 let myLoaQty = 0;
                 if (lineCirc.includes('solan')) myLoaQty = grp.solanLoaQty;
                 else if (lineCirc.includes('nahan')) myLoaQty = grp.nahanLoaQty;
                 else if (lineCirc.includes('rampur')) myLoaQty = grp.rampurLoaQty;
                 else if (lineCirc.includes('rohru')) myLoaQty = grp.rohruLoaQty;
                 
                 const distributedQty = totalLoaQty > 0 ? (qty * (myLoaQty / totalLoaQty)) : (qty / targetTCs.length);
                 if (!minMap.has(tc)) minMap.set(tc, { solan: 0, nahan: 0, rampur: 0, rohru: 0 });
                 const m = minMap.get(tc)!;
                 if (lineCirc.includes('solan')) m.solan += distributedQty;
                 else if (lineCirc.includes('nahan')) m.nahan += distributedQty;
                 else if (lineCirc.includes('rampur')) m.rampur += distributedQty;
                 else if (lineCirc.includes('rohru')) m.rohru += distributedQty;
                 else m.nahan += distributedQty;
              }
           });
        }
      }
    });
  });

  // 4a. JMC Work (formerly IMC Work)
  const imcMap = new Map<string, Record<string, number>>();
  jmcs.forEach(doc => {
    const docCirc = ((doc as any).circle || '').toLowerCase();
    ((doc as any).items || []).forEach((line: any) => {
      const qty = Number(line.approvedQty || line.claimedQty || 0);
      if (qty > 0) {
        const lineCirc = (line.circle || docCirc || '').toLowerCase();
        const targetTCs = getTargetTempCodes(line.itemId, line.tempCode, line.loaSerialNo || line.loaSrNo || line.sku, line.package || (doc as any).package, lineCirc);
        if (targetTCs.length === 1) {
           const tc = targetTCs[0];
           if (!imcMap.has(tc)) imcMap.set(tc, { solan: 0, nahan: 0, rampur: 0, rohru: 0 });
           const imcObj = imcMap.get(tc)!;
           if (lineCirc.includes('solan')) imcObj.solan += qty;
           else if (lineCirc.includes('nahan')) imcObj.nahan += qty;
           else if (lineCirc.includes('rampur')) imcObj.rampur += qty;
           else if (lineCirc.includes('rohru')) imcObj.rohru += qty;
           else imcObj.nahan += qty;
        } else if (targetTCs.length > 1) {
           let totalLoaQty = 0;
           targetTCs.forEach(tc => {
              const grp = groupedItemsMap.get(tc);
              if (grp) {
                 if (lineCirc.includes('solan')) totalLoaQty += grp.solanLoaQty;
                 else if (lineCirc.includes('nahan')) totalLoaQty += grp.nahanLoaQty;
                 else if (lineCirc.includes('rampur')) totalLoaQty += grp.rampurLoaQty;
                 else if (lineCirc.includes('rohru')) totalLoaQty += grp.rohruLoaQty;
              }
           });
           targetTCs.forEach(tc => {
              const grp = groupedItemsMap.get(tc);
              if (grp) {
                 let myLoaQty = 0;
                 if (lineCirc.includes('solan')) myLoaQty = grp.solanLoaQty;
                 else if (lineCirc.includes('nahan')) myLoaQty = grp.nahanLoaQty;
                 else if (lineCirc.includes('rampur')) myLoaQty = grp.rampurLoaQty;
                 else if (lineCirc.includes('rohru')) myLoaQty = grp.rohruLoaQty;
                 
                 const distributedQty = totalLoaQty > 0 ? (qty * (myLoaQty / totalLoaQty)) : (qty / targetTCs.length);
                 if (!imcMap.has(tc)) imcMap.set(tc, { solan: 0, nahan: 0, rampur: 0, rohru: 0 });
                 const imcObj = imcMap.get(tc)!;
                 if (lineCirc.includes('solan')) imcObj.solan += distributedQty;
                 else if (lineCirc.includes('nahan')) imcObj.nahan += distributedQty;
                 else if (lineCirc.includes('rampur')) imcObj.rampur += distributedQty;
                 else if (lineCirc.includes('rohru')) imcObj.rohru += distributedQty;
                 else imcObj.nahan += distributedQty;
              }
           });
        }
      }
    });
  });

  // 4b. Erection Billed
  const erectionMap = new Map<string, Record<string, number>>();
  contractorInvoices.forEach(doc => {
    const docCirc = ((doc as any).circle || '').toLowerCase();
    ((doc as any).lineItems || []).forEach((line: any) => {
      const qty = Number(line.quantity || line.installedQty || 0);
      if (qty > 0) {
        const lineCirc = (line.circle || docCirc || '').toLowerCase();
        const targetTCs = getTargetTempCodes(line.itemId, line.tempCode, line.loaSerialNo || line.loaSrNo || line.sku, line.package || (doc as any).package, lineCirc);
        if (targetTCs.length === 1) {
           const tc = targetTCs[0];
           if (!erectionMap.has(tc)) erectionMap.set(tc, { solan: 0, nahan: 0, rampur: 0, rohru: 0 });
           const erecObj = erectionMap.get(tc)!;
           if (lineCirc.includes('solan')) erecObj.solan += qty;
           else if (lineCirc.includes('nahan')) erecObj.nahan += qty;
           else if (lineCirc.includes('rampur')) erecObj.rampur += qty;
           else if (lineCirc.includes('rohru')) erecObj.rohru += qty;
           else erecObj.nahan += qty;
        } else if (targetTCs.length > 1) {
           let totalLoaQty = 0;
           targetTCs.forEach(tc => {
              const grp = groupedItemsMap.get(tc);
              if (grp) {
                 if (lineCirc.includes('solan')) totalLoaQty += grp.solanLoaQty;
                 else if (lineCirc.includes('nahan')) totalLoaQty += grp.nahanLoaQty;
                 else if (lineCirc.includes('rampur')) totalLoaQty += grp.rampurLoaQty;
                 else if (lineCirc.includes('rohru')) totalLoaQty += grp.rohruLoaQty;
              }
           });
           targetTCs.forEach(tc => {
              const grp = groupedItemsMap.get(tc);
              if (grp) {
                 let myLoaQty = 0;
                 if (lineCirc.includes('solan')) myLoaQty = grp.solanLoaQty;
                 else if (lineCirc.includes('nahan')) myLoaQty = grp.nahanLoaQty;
                 else if (lineCirc.includes('rampur')) myLoaQty = grp.rampurLoaQty;
                 else if (lineCirc.includes('rohru')) myLoaQty = grp.rohruLoaQty;
                 
                 const distributedQty = totalLoaQty > 0 ? (qty * (myLoaQty / totalLoaQty)) : (qty / targetTCs.length);
                 if (!erectionMap.has(tc)) erectionMap.set(tc, { solan: 0, nahan: 0, rampur: 0, rohru: 0 });
                 const erecObj = erectionMap.get(tc)!;
                 if (lineCirc.includes('solan')) erecObj.solan += distributedQty;
                 else if (lineCirc.includes('nahan')) erecObj.nahan += distributedQty;
                 else if (lineCirc.includes('rampur')) erecObj.rampur += distributedQty;
                 else if (lineCirc.includes('rohru')) erecObj.rohru += distributedQty;
                 else erecObj.nahan += distributedQty;
              }
           });
        }
      }
    });
  });

  // 5. Supply Billed (Purchase Invoice)
  const supplyBilledMap = new Map<string, Record<string, number>>();
  pis.forEach(doc => {
    const docCirc = (doc.circle || '').toLowerCase();
    (doc.lineItems || []).forEach((line: any) => {
      const qty = Number(line.quantity || line.act || 0);
      if (qty > 0) {
        const lineCirc = (line.circle || docCirc || '').toLowerCase();
        const targetTCs = getTargetTempCodes(line.itemId, line.tempCode, line.loaSerialNo || line.loaSrNo || line.sku, line.package || (doc as any).package, lineCirc);
        if (targetTCs.length === 1) {
           const tc = targetTCs[0];
           if (!supplyBilledMap.has(tc)) supplyBilledMap.set(tc, { solan: 0, nahan: 0, rampur: 0, rohru: 0 });
           const supObj = supplyBilledMap.get(tc)!;
           if (lineCirc.includes('solan')) supObj.solan += qty;
           else if (lineCirc.includes('nahan')) supObj.nahan += qty;
           else if (lineCirc.includes('rampur')) supObj.rampur += qty;
           else if (lineCirc.includes('rohru')) supObj.rohru += qty;
           else supObj.nahan += qty;
        } else if (targetTCs.length > 1) {
           let totalLoaQty = 0;
           targetTCs.forEach(tc => {
              const grp = groupedItemsMap.get(tc);
              if (grp) {
                 if (lineCirc.includes('solan')) totalLoaQty += grp.solanLoaQty;
                 else if (lineCirc.includes('nahan')) totalLoaQty += grp.nahanLoaQty;
                 else if (lineCirc.includes('rampur')) totalLoaQty += grp.rampurLoaQty;
                 else if (lineCirc.includes('rohru')) totalLoaQty += grp.rohruLoaQty;
              }
           });
           targetTCs.forEach(tc => {
              const grp = groupedItemsMap.get(tc);
              if (grp) {
                 let myLoaQty = 0;
                 if (lineCirc.includes('solan')) myLoaQty = grp.solanLoaQty;
                 else if (lineCirc.includes('nahan')) myLoaQty = grp.nahanLoaQty;
                 else if (lineCirc.includes('rampur')) myLoaQty = grp.rampurLoaQty;
                 else if (lineCirc.includes('rohru')) myLoaQty = grp.rohruLoaQty;
                 
                 const distributedQty = totalLoaQty > 0 ? (qty * (myLoaQty / totalLoaQty)) : (qty / targetTCs.length);
                 if (!supplyBilledMap.has(tc)) supplyBilledMap.set(tc, { solan: 0, nahan: 0, rampur: 0, rohru: 0 });
                 const supObj = supplyBilledMap.get(tc)!;
                 if (lineCirc.includes('solan')) supObj.solan += distributedQty;
                 else if (lineCirc.includes('nahan')) supObj.nahan += distributedQty;
                 else if (lineCirc.includes('rampur')) supObj.rampur += distributedQty;
                 else if (lineCirc.includes('rohru')) supObj.rohru += distributedQty;
                 else supObj.nahan += distributedQty;
              }
           });
        }
      }
    });
  });

  // Build matrix rows for grouped items
  const matrixRows = Array.from(groupedItemsMap.entries()).map(([groupKey, grp], idx) => {
    const tc = grp.tempCode;
    const tempNum = Number(tc);
    const itemName = grp.itemName || 'Unnamed Item';
    const itemCircle = (grp.circle || '').toUpperCase();

    const nahanLoaQty = grp.nahanLoaQty;
    const nahanBomQty = grp.nahanBomQty;
    const solanLoaQty = grp.solanLoaQty;
    const solanBomQty = grp.solanBomQty;
    const rampurLoaQty = grp.rampurLoaQty;
    const rampurBomQty = grp.rampurBomQty;
    const rohruLoaQty = grp.rohruLoaQty;
    const rohruBomQty = grp.rohruBomQty;

    const diObj = diMap.get(groupKey) || { solan: 0, nahan: 0, rampur: 0, rohru: 0 };
    const invObj = inwardMap.get(groupKey) || { solan: 0, nahan: 0, rampur: 0, rohru: 0 };
    const mhrovObj = mhrovMap.get(groupKey) || { solan: 0, nahan: 0, rampur: 0, rohru: 0 };
    const minObj = minMap.get(groupKey) || { solan: 0, nahan: 0, rampur: 0, rohru: 0 };
    const imcObj = imcMap.get(groupKey) || { solan: 0, nahan: 0, rampur: 0, rohru: 0 };
    const supObj = supplyBilledMap.get(groupKey) || { solan: 0, nahan: 0, rampur: 0, rohru: 0 };
    const erecObj = erectionMap.get(groupKey) || { solan: 0, nahan: 0, rampur: 0, rohru: 0 };

    const tCirc = (targetCircle as string).toUpperCase();
    const evalCircle = (tCirc === 'ALL' || !tCirc) ? itemCircle : tCirc;

    let targetLoa = 0;
    let targetBom = 0;
    let targetDi = 0;
    let targetInward = 0;
    let targetMhrov = 0;
    let targetMin = 0;
    let targetImc = 0;
    let targetSupBilled = 0;
    let targetErecBilled = 0;

    if (evalCircle.includes('SOLAN')) {
      targetLoa = solanLoaQty; targetBom = solanBomQty; targetDi = diObj.solan; targetInward = invObj.solan; targetMhrov = mhrovObj.solan; targetMin = minObj.solan; targetImc = imcObj.solan; targetSupBilled = supObj.solan; targetErecBilled = erecObj.solan;
    } else if (evalCircle.includes('NAHAN')) {
      targetLoa = nahanLoaQty; targetBom = nahanBomQty; targetDi = diObj.nahan; targetInward = invObj.nahan; targetMhrov = mhrovObj.nahan; targetMin = minObj.nahan; targetImc = imcObj.nahan; targetSupBilled = supObj.nahan; targetErecBilled = erecObj.nahan;
    } else if (evalCircle.includes('RAMPUR')) {
      targetLoa = rampurLoaQty; targetBom = rampurBomQty; targetDi = diObj.rampur; targetInward = invObj.rampur; targetMhrov = mhrovObj.rampur; targetMin = minObj.rampur; targetImc = imcObj.rampur; targetSupBilled = supObj.rampur; targetErecBilled = erecObj.rampur;
    } else if (evalCircle.includes('ROHRU')) {
      targetLoa = rohruLoaQty; targetBom = rohruBomQty; targetDi = diObj.rohru; targetInward = invObj.rohru; targetMhrov = mhrovObj.rohru; targetMin = minObj.rohru; targetImc = imcObj.rohru; targetSupBilled = supObj.rohru; targetErecBilled = erecObj.rohru;
    }

    const balDiLoa = targetLoa - targetDi;
    const balDiBom = targetBom - targetDi;
    const balMrn = targetDi - targetInward;
    const balMhrov = targetInward - targetMhrov;
    const balImc = targetMhrov - targetMin;
    const balSupplyBill = targetInward - targetSupBilled;
    const balErectionBill = targetImc - targetErecBilled;

    const allBalances = {
      solan: {
        diVsLoa: solanLoaQty - diObj.solan,
        diVsBom: solanBomQty - diObj.solan,
        mrn: diObj.solan - invObj.solan,
        mhrov: invObj.solan - mhrovObj.solan,
        imc: mhrovObj.solan - minObj.solan,
        supplyBill: invObj.solan - supObj.solan,
        erectionBill: imcObj.solan - erecObj.solan
      },
      nahan: {
        diVsLoa: nahanLoaQty - diObj.nahan,
        diVsBom: nahanBomQty - diObj.nahan,
        mrn: diObj.nahan - invObj.nahan,
        mhrov: invObj.nahan - mhrovObj.nahan,
        imc: mhrovObj.nahan - minObj.nahan,
        supplyBill: invObj.nahan - supObj.nahan,
        erectionBill: imcObj.nahan - erecObj.nahan
      },
      rampur: {
        diVsLoa: rampurLoaQty - diObj.rampur,
        diVsBom: rampurBomQty - diObj.rampur,
        mrn: diObj.rampur - invObj.rampur,
        mhrov: invObj.rampur - mhrovObj.rampur,
        imc: mhrovObj.rampur - minObj.rampur,
        supplyBill: invObj.rampur - supObj.rampur,
        erectionBill: imcObj.rampur - erecObj.rampur
      },
      rohru: {
        diVsLoa: rohruLoaQty - diObj.rohru,
        diVsBom: rohruBomQty - diObj.rohru,
        mrn: diObj.rohru - invObj.rohru,
        mhrov: invObj.rohru - mhrovObj.rohru,
        imc: mhrovObj.rohru - minObj.rohru,
        supplyBill: invObj.rohru - supObj.rohru,
        erectionBill: imcObj.rohru - erecObj.rohru
      }
    };

    return {
      _id: grp.itemIds[0],
      itemId: grp.itemIds[0],
      tempNum: isNaN(tempNum) ? 999999 : tempNum,
      srNo: idx + 1,
      loaSerialNo: grp.loaSerialNo,
      tempCode: tc,
      itemName,
      unit: grp.unit || 'NOS',
      package: grp.package,
      circle: grp.circle,

      // Flat LOA & BOM
      solanLoaQty,
      solanBomQty,
      nahanLoaQty,
      nahanBomQty,
      rampurLoaQty,
      rampurBomQty,
      rohruLoaQty,
      rohruBomQty,

      // Flat DI
      dispatchedNahan: diObj.nahan,
      dispatchedSolan: diObj.solan,
      dispatchedRampur: diObj.rampur,
      dispatchedRohru: diObj.rohru,

      // Flat Inward
      inwardNahan: invObj.nahan,
      inwardSolan: invObj.solan,
      inwardRampur: invObj.rampur,
      inwardRohru: invObj.rohru,
      
      // Flat MHROV
      mhrovNahan: mhrovObj.nahan,
      mhrovSolan: mhrovObj.solan,
      mhrovRampur: mhrovObj.rampur,
      mhrovRohru: mhrovObj.rohru,

      // Flat MIN
      minNahan: minObj.nahan,
      minSolan: minObj.solan,
      minRampur: minObj.rampur,
      minRohru: minObj.rohru,

      // Flat IMC
      imcNahan: imcObj.nahan,
      imcSolan: imcObj.solan,
      imcRampur: imcObj.rampur,
      imcRohru: imcObj.rohru,

      // Flat Supply Billed
      supplyBilledNahan: supObj.nahan,
      supplyBilledSolan: supObj.solan,
      supplyBilledRampur: supObj.rampur,
      supplyBilledRohru: supObj.rohru,

      // Flat Erection Billed
      erectionBilledNahan: erecObj.nahan,
      erectionBilledSolan: erecObj.solan,
      erectionBilledRampur: erecObj.rampur,
      erectionBilledRohru: erecObj.rohru,

      // Flat Balances
      balDiLoa,
      balDiBom,
      balMrn,
      balMhrov,
      balImc,
      balSupplyBill,
      balErectionBill,

      // Nested objects
      loaQuantities: { nahan: nahanLoaQty, solan: solanLoaQty, rampur: rampurLoaQty, rohru: rohruLoaQty },
      bomQuantities: { nahan: nahanBomQty, solan: solanBomQty, rampur: rampurBomQty, rohru: rohruBomQty },
      dispatched: diObj,
      inward: invObj,
      mhrov: mhrovObj,
      min: minObj,
      imc: imcObj,
      supplyBilled: supObj,
      erectionBilled: erecObj,
      balances: {
        diVsLoa: balDiLoa,
        diVsBom: balDiBom,
        mrn: balMrn,
        mhrov: balMhrov,
        imc: balImc,
        supplyBill: balSupplyBill,
        erectionBill: balErectionBill
      },
      allBalances
    };
  });

  // Sort by temp code numerical order
  matrixRows.sort((a, b) => a.tempNum - b.tempNum);
  matrixRows.forEach((r, i) => r.srNo = i + 1);

  matrixCache.set(cacheKey, { timestamp: Date.now(), data: matrixRows });

  return matrixRows;
}