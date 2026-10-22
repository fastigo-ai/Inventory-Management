import axios from 'axios';

async function testMatrixMapping() {
  try {
    const res = await axios.get('http://localhost:5000/reports/item-matrix-summary', {
      params: { circle: 'Solan', limit: 50000 }
    });
    const matrixItems = res.data?.data?.items || [];
    console.log(`Matrix returned ${matrixItems.length} items for Solan.`);

    // Map matrix items
    const mapped = matrixItems.map((d: any) => {
      const circ = d.circle || 'Solan';
      const c = circ.toLowerCase();
      
      let loaQty = 0;
      let bomQty = 0;
      let diQty = 0;
      let invQty = 0;
      let mhrovQty = 0;
      let issuedQty = 0;
      let jmcQty = 0;
      let supplyBilled = 0;
      let erectionBilled = 0;
      let wipCQty = 0;
      let wipRQty = 0;

      if (c.includes('solan')) {
        loaQty = d.solanLoaQty || 0;
        bomQty = d.solanBomQty || 0;
        diQty = d.dispatchedSolan || 0;
        invQty = d.inwardSolan || 0;
        mhrovQty = d.mhrovSolan || 0;
        issuedQty = d.minSolan || 0;
        jmcQty = d.imcSolan || 0;
        supplyBilled = d.supplyBilledSolan || 0;
        erectionBilled = d.erectionBilledSolan || 0;
        wipCQty = d.wipConsumedSolan || 0;
        wipRQty = d.wipRequiredSolan || 0;
      } else if (c.includes('nahan')) {
        loaQty = d.nahanLoaQty || 0;
        bomQty = d.nahanBomQty || 0;
        diQty = d.dispatchedNahan || 0;
        invQty = d.inwardNahan || 0;
        mhrovQty = d.mhrovNahan || 0;
        issuedQty = d.minNahan || 0;
        jmcQty = d.imcNahan || 0;
        supplyBilled = d.supplyBilledNahan || 0;
        erectionBilled = d.erectionBilledNahan || 0;
        wipCQty = d.wipConsumedNahan || 0;
        wipRQty = d.wipRequiredNahan || 0;
      } else if (c.includes('rampur')) {
        loaQty = d.rampurLoaQty || 0;
        bomQty = d.rampurBomQty || 0;
        diQty = d.dispatchedRampur || 0;
        invQty = d.inwardRampur || 0;
        mhrovQty = d.mhrovRampur || 0;
        issuedQty = d.minRampur || 0;
        jmcQty = d.imcRampur || 0;
        supplyBilled = d.supplyBilledRampur || 0;
        erectionBilled = d.erectionBilledRampur || 0;
        wipCQty = d.wipConsumedRampur || 0;
        wipRQty = d.wipRequiredRampur || 0;
      } else if (c.includes('rohru')) {
        loaQty = d.rohruLoaQty || 0;
        bomQty = d.rohruBomQty || 0;
        diQty = d.dispatchedRohru || 0;
        invQty = d.inwardRohru || 0;
        mhrovQty = d.mhrovRohru || 0;
        issuedQty = d.minRohru || 0;
        jmcQty = d.imcRohru || 0;
        supplyBilled = d.supplyBilledRohru || 0;
        erectionBilled = d.erectionBilledRohru || 0;
        wipCQty = d.wipConsumedRohru || 0;
        wipRQty = d.wipRequiredRohru || 0;
      }

      return {
        tempCode: d.tempCode,
        name: d.itemName,
        circle: circ,
        pkg: d.package,
        loaQty,
        bomQty,
        diQty,
        invQty,
        mhrovQty,
        issuedQty,
        jmcQty,
        supplyBilled,
        erectionBilled,
        wipCQty,
        wipRQty
      };
    });

    // Group by tempCode
    const tcMap = new Map<string, any>();
    for (const it of mapped) {
      const tc = String(it.tempCode || '').trim();
      if (!tcMap.has(tc)) {
        tcMap.set(tc, {
          tempCode: tc,
          name: it.name,
          loa: 0,
          bom: 0,
          di: 0,
          inv: 0,
          issued: 0,
          jmc: 0,
          supplyBilled: 0,
          count: 0
        });
      }
      const grp = tcMap.get(tc);
      grp.loa += it.loaQty;
      grp.bom += it.bomQty;
      grp.di += it.diQty;
      grp.inv += it.invQty;
      grp.issued += it.issuedQty;
      grp.jmc += it.jmcQty;
      grp.supplyBilled += it.supplyBilled;
      grp.count++;
    }

    console.log(`Unique Temp Codes for Solan: ${tcMap.size}`);
    const tc1 = tcMap.get('1');
    console.log('Solan Temp Code 1 aggregated:', tc1);
  } catch (err: any) {
    console.error(err.message);
  }
}
testMatrixMapping();
