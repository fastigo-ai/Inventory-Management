/**
 * Script to generate sample Excel files for JMC, WIP Consumed, and WIP Required bulk import.
 * These files follow the transposed multi-site format that the upload endpoints expect.
 * 
 * Output: 3 .xlsx files in frontend/public/
 */

import * as xlsx from 'xlsx';
import path from 'path';

const PUBLIC_DIR = path.resolve(__dirname, '../../..', 'frontend/public');

function buildTransposedSheet(
  type: 'JMC' | 'WIP-Consumed' | 'WIP-Required',
  sites: { circle: string; division: string; subDivision: string; subStation: string; feeder: string; location: string; drawingNo: string; contractor: string }[],
  items: { loa: number | string; description: string; unit: string; activity?: string }[]
) {
  const rows: any[][] = [];

  // Metadata rows
  const labels = [
    'Name Of Circle : ',
    'Name Of Division : ',
    'Name Of Sub/Division :  ',
    'Name Of Sub/Station :  ',
    'Name Of Feeder :  ',
    'Location : ',
    'Drawing No :  ',
    'Name of Contractor',
  ];
  const keys: (keyof typeof sites[0])[] = ['circle', 'division', 'subDivision', 'subStation', 'feeder', 'location', 'drawingNo', 'contractor'];

  for (let i = 0; i < labels.length; i++) {
    const row: any[] = [null, labels[i], null];
    for (const site of sites) {
      row.push(site[keys[i]]);
    }
    rows.push(row);
  }

  // Header row
  const headerRow: any[] = ['LOA SR.NO.', 'Description', 'Unit'];
  for (let i = 0; i < sites.length; i++) {
    headerRow.push(type);
  }
  rows.push(headerRow);

  // Activity group rows + item rows
  let currentActivity = '';
  for (const item of items) {
    if (item.activity && item.activity !== currentActivity) {
      currentActivity = item.activity;
      // Activity group header row (no unit, no qty)
      const actRow: any[] = [null, currentActivity, null];
      rows.push(actRow);
    }

    const dataRow: any[] = [item.loa, item.description, item.unit];
    for (let s = 0; s < sites.length; s++) {
      // Put sample quantity values — varied per site
      const baseQty = Math.round(Math.random() * 50 + 5);
      dataRow.push(baseQty);
    }
    rows.push(dataRow);
  }

  return rows;
}

function createWorkbook(rows: any[][], sheetName: string): xlsx.WorkBook {
  const ws = xlsx.utils.aoa_to_sheet(rows);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, sheetName);
  return wb;
}

// ─── Sample Data ─────────────────────────────────────────

const sampleSites = [
  {
    circle: 'SOLAN',
    division: 'SOLAN',
    subDivision: 'ARKI',
    subStation: '33/11 KV ARKI',
    feeder: '11 KV FEEDER NO.1',
    location: 'ARKI TOWN',
    drawingNo: '101A',
    contractor: 'Sample Contractor Pvt Ltd'
  },
  {
    circle: 'SOLAN',
    division: 'SOLAN',
    subDivision: 'ARKI',
    subStation: '33/11 KV ARKI',
    feeder: '11 KV FEEDER NO.2',
    location: 'ARKI BAZAR',
    drawingNo: '102B',
    contractor: 'Sample Contractor Pvt Ltd'
  },
  {
    circle: 'SOLAN',
    division: 'SOLAN',
    subDivision: 'KUNIHAR',
    subStation: '33/11 KV KUNIHAR',
    feeder: '11 KV INDUSTRIAL',
    location: 'KUNIHAR MAIN',
    drawingNo: '203C',
    contractor: 'Sample Contractor Pvt Ltd'
  }
];

const sampleItems = [
  // Activity group: AB Cabling works
  { loa: 1, description: 'AB Cabling works, 33KV, 22KV, 11KV & LT Line overhead', unit: '', activity: 'AB Cabling works ,33KV,22KV,11KV & LT Line overhead Line Ab Cabling & other Cabling Works' },
  { loa: 2, description: 'LT AB Cable on poles [Size: (3x95 Sq. mm) +70sqmm +16 sqmm]', unit: 'km', activity: '' },
  { loa: 3, description: 'Steel Tubular Poles (9 m, Working Load > 200 kgf/m²)', unit: 'No', activity: '' },
  { loa: 4, description: 'Muffs with concrete filling', unit: 'No', activity: '' },
  { loa: 5, description: 'Stay Set Complete', unit: 'No', activity: '' },
  { loa: 6, description: 'Stay Wire (7/3.15 mm) (7.0 kg Per Stay Set)', unit: 'Kg', activity: '' },
  // Activity group: HT Works  
  { loa: 7, description: 'HT AB Cable works, 11 KV', unit: '', activity: 'HT AB Cable works, 11 KV' },
  { loa: 8, description: '11 KV HT AB Cable [Size: 3x95 Sq. mm]', unit: 'km', activity: '' },
  { loa: 9, description: 'HT Poles (11 m, Working Load > 300 kgf/m²)', unit: 'No', activity: '' },
  { loa: 10, description: 'Disc Insulator (11 KV)', unit: 'No', activity: '' },
  { loa: 11, description: 'Lightning Arrester (9 KV, 5 KA)', unit: 'No', activity: '' },
  { loa: 12, description: 'DO Fuse Set (11 KV, 100A)', unit: 'No', activity: '' },
];

// ─── Generate JMC Sample ─────────────────────────────────
const jmcRows = buildTransposedSheet('JMC', sampleSites, sampleItems);
const jmcWb = createWorkbook(jmcRows, 'JMC Sample');
xlsx.writeFile(jmcWb, path.join(PUBLIC_DIR, 'jmc_bulk_upload_sample.xlsx'));
console.log('Created: jmc_bulk_upload_sample.xlsx');

// ─── Generate WIP Consumed Sample ────────────────────────
const wipConsumedRows = buildTransposedSheet('WIP-Consumed', sampleSites, sampleItems);
const wipConsumedWb = createWorkbook(wipConsumedRows, 'WIP Consumed Sample');
xlsx.writeFile(wipConsumedWb, path.join(PUBLIC_DIR, 'wip_consumed_bulk_upload_sample.xlsx'));
console.log('Created: wip_consumed_bulk_upload_sample.xlsx');

// ─── Generate WIP Required Sample ────────────────────────
const wipRequiredRows = buildTransposedSheet('WIP-Required', sampleSites, sampleItems);
const wipRequiredWb = createWorkbook(wipRequiredRows, 'WIP Required Sample');
xlsx.writeFile(wipRequiredWb, path.join(PUBLIC_DIR, 'wip_required_bulk_upload_sample.xlsx'));
console.log('Created: wip_required_bulk_upload_sample.xlsx');

console.log('All sample files generated successfully!');
