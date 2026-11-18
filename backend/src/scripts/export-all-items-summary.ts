import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function run() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('No MONGO_URI provided in .env');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);

  const { computeItemMatrixSummary } = require('../modules/reports/summary/summary.controller');
  
  const allRows: any[] = await computeItemMatrixSummary({
    package: 'all',
    circle: 'all',
    targetCircle: 'ALL'
  });

  const artifactDir = '/Users/Apple/.gemini/antigravity/brain/73a2f214-aa5e-4c65-97f9-54a00c155bbb';
  const outputPath = path.join(artifactDir, 'all_items_realtime_summary.md');

  // Compute grand totals using exact field mapping from frontend
  let totalLoa = 0;
  let totalBom = 0;
  let totalDi = 0;
  let totalInward = 0;
  let totalMhrov = 0;
  let totalBalMhrov = 0;
  let totalMin = 0;
  let totalJmc = 0;
  let totalBalJmc = 0;
  let totalSupply60 = 0;
  let totalSupply30 = 0;
  let totalSupply10 = 0;
  let totalBalSupply = 0;

  const mappedRows = allRows.map((r, idx) => {
    const loaQty = (r.solanLoaQty || 0) + (r.nahanLoaQty || 0) + (r.rampurLoaQty || 0) + (r.rohruLoaQty || 0);
    const bomQty = (r.solanBomQty || 0) + (r.nahanBomQty || 0) + (r.rampurBomQty || 0) + (r.rohruBomQty || 0);
    const diQty = (r.dispatchedSolan || 0) + (r.dispatchedNahan || 0) + (r.dispatchedRampur || 0) + (r.dispatchedRohru || 0);
    const inwardQty = (r.inwardSolan || 0) + (r.inwardNahan || 0) + (r.inwardRampur || 0) + (r.inwardRohru || 0);
    const mhrovQty = (r.mhrovSolan || 0) + (r.mhrovNahan || 0) + (r.mhrovRampur || 0) + (r.mhrovRohru || 0);
    const minQty = (r.minSolan || 0) + (r.minNahan || 0) + (r.minRampur || 0) + (r.minRohru || 0);
    const jmcQty = (r.imcSolan || 0) + (r.imcNahan || 0) + (r.imcRampur || 0) + (r.imcRohru || 0);
    
    const supply60 = (r.supplyBilledSolan_60 || 0) + (r.supplyBilledNahan_60 || 0) + (r.supplyBilledRampur_60 || 0) + (r.supplyBilledRohru_60 || 0);
    const supply30 = (r.supplyBilledSolan_30 || 0) + (r.supplyBilledNahan_30 || 0) + (r.supplyBilledRampur_30 || 0) + (r.supplyBilledRohru_30 || 0);
    const supply10 = (r.supplyBilledSolan_10 || 0) + (r.supplyBilledNahan_10 || 0) + (r.supplyBilledRampur_10 || 0) + (r.supplyBilledRohru_10 || 0);
    
    const balMhrov = r.balances?.mhrov ?? (inwardQty - mhrovQty);
    const balJmc = r.balances?.imc ?? (mhrovQty - minQty);
    const balSupply = r.balances?.supplyBill ?? (inwardQty - (supply60 + supply30 + supply10));

    totalLoa += loaQty;
    totalBom += bomQty;
    totalDi += diQty;
    totalInward += inwardQty;
    totalMhrov += mhrovQty;
    totalBalMhrov += balMhrov;
    totalMin += minQty;
    totalJmc += jmcQty;
    totalBalJmc += balJmc;
    totalSupply60 += supply60;
    totalSupply30 += supply30;
    totalSupply10 += supply10;
    totalBalSupply += balSupply;

    return {
      srNo: r.loaSerialNo || String(idx + 1),
      tempCode: r.tempCode || '-',
      name: r.itemName || r.name || 'Unknown Item',
      package: r.package || '-',
      circle: r.circle || '-',
      loaQty,
      bomQty,
      diQty,
      inwardQty,
      mhrovQty,
      balMhrov,
      minQty,
      jmcQty,
      balJmc,
      supply60,
      supply30,
      supply10,
      balSupply
    };
  });

  const fmt = (n: number) => Math.round(n).toLocaleString('en-IN');
  const fmtVal = (v: any) => {
    const num = Number(v) || 0;
    return num === 0 ? '-' : Math.round(num).toLocaleString('en-IN');
  };

  let md = `# Real-Time Item Summary Report (All Items)\n\n`;
  md += `**Total SKUs / Line Items in Project:** ${allRows.length}\n`;
  md += `**Data Source:** Live MongoDB Aggregation (Item Master, Store Inward, MRHOV, Contractor MIN, JMC Register, Client Supply Bills)\n`;
  md += `**Generated At:** ${new Date().toLocaleString('en-IN')}\n\n`;

  md += `### Project Overall Grand Totals (Across All 3,001 Items)\n\n`;
  md += `| Milestone Stage | Metric | Total Project Quantity |\n`;
  md += `| :--- | :--- | :--- |\n`;
  md += `| Contract Baseline | **Total Contract LOA Quantity** | **${fmt(totalLoa)}** |\n`;
  md += `| Engineering Approval | **Total Approved BOM Quantity** | **${fmt(totalBom)}** |\n`;
  md += `| Factory Dispatch | **Dispatch Instruction (DI) Released** | **${fmt(totalDi)}** |\n`;
  md += `| Warehouse Receipt | **Store Inward Received (PI)** | **${fmt(totalInward)}** |\n`;
  md += `| Quality Handover | **MRHOV (Store Accepted)** | **${fmt(totalMhrov)}** |\n`;
  md += `| Store Pending Quality | **Bal for MRHOV (Inward - MRHOV)** | **${fmt(totalBalMhrov)}** |\n`;
  md += `| Field Issuance | **Contractor Issued (MIN)** | **${fmt(totalMin)}** |\n`;
  md += `| Physical Work Execution | **Total JMC Certified (Done)** | **${fmt(totalJmc)}** |\n`;
  md += `| Contractor Stock Liability | **Balance for JMC (MRHOV - MIN)** | **${fmt(totalBalJmc)}** |\n`;
  md += `| Client Billing 60% | **Supply Bill 60% Stage** | **${fmt(totalSupply60)}** |\n`;
  md += `| Client Billing 30% | **Supply Bill 30% Stage** | **${fmt(totalSupply30)}** |\n`;
  md += `| Client Billing 10% | **Supply Bill 10% Stage** | **${fmt(totalSupply10)}** |\n`;
  md += `| Unbilled Supply Backlog | **Bal for Supply Bill (Inward - Billed)** | **${fmt(totalBalSupply)}** |\n\n`;

  md += `### Real-Time Items Ledger (First 150 Active Items Displayed)\n\n`;
  md += `| Sr. No. | Temp Code | Item Description | Package | Circle | LOA Qty | BOM Qty | DI Qty | Inward Qty | MRHOV Qty | Bal for MRHOV | Contractor MIN | Total JMC Done | Bal for JMC | Supply Bill 60% | Supply Bill 30% | Supply Bill 10% |\n`;
  md += `| :---: | :---: | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |\n`;

  for (const r of mappedRows.slice(0, 150)) {
    const sr = r.srNo;
    const tc = r.tempCode;
    const name = r.name.replace(/\|/g, '/');
    const pkg = r.package;
    const circle = r.circle;
    const loa = fmtVal(r.loaQty);
    const bom = fmtVal(r.bomQty);
    const di = fmtVal(r.diQty);
    const inw = fmtVal(r.inwardQty);
    const mhrov = fmtVal(r.mhrovQty);
    const balMhrov = r.balMhrov === 0 ? '0' : fmtVal(r.balMhrov);
    const min = fmtVal(r.minQty);
    const jmc = fmtVal(r.jmcQty);
    const balJmc = r.balJmc !== undefined && r.balJmc !== null ? Math.round(r.balJmc).toLocaleString('en-IN') : '-';
    const s60 = fmtVal(r.supply60);
    const s30 = fmtVal(r.supply30);
    const s10 = fmtVal(r.supply10);

    md += `| ${sr} | ${tc} | ${name} | ${pkg} | ${circle} | ${loa} | ${bom} | ${di} | ${inw} | ${mhrov} | ${balMhrov} | ${min} | ${jmc} | ${balJmc} | ${s60} | ${s30} | ${s10} |\n`;
  }

  fs.writeFileSync(outputPath, md, 'utf-8');

  console.log('SUMMARY_DATA_JSON_START');
  console.log(JSON.stringify({
    totalItems: allRows.length,
    totalLoa,
    totalBom,
    totalDi,
    totalInward,
    totalMhrov,
    totalBalMhrov,
    totalMin,
    totalJmc,
    totalBalJmc,
    totalSupply60,
    totalSupply30,
    totalSupply10,
    totalBalSupply,
    sampleRows: mappedRows.slice(0, 15)
  }, null, 2));
  console.log('SUMMARY_DATA_JSON_END');

  process.exit(0);
}

run().catch((err) => {
  console.error('Error running summary export:', err);
  process.exit(1);
});
