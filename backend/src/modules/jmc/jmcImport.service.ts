import * as xlsx from 'xlsx';
import stringSimilarity from 'string-similarity';
import mongoose from 'mongoose';
import { JmcRegister } from './jmc.schema';
import { Contractor } from '../contractors/contractor.schema';
import Item from '../items/item.model';
import { ContractorWorkOrder } from '../contractors/contractorWorkOrder.schema';
import { sseService } from '../../core/utils/sse.service';

const normalize = (s: any): string => String(s || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

const normLabel = (cell: any): string => {
  if (cell === null || cell === undefined) return '';
  return String(cell).trim().toLowerCase().replace(/[\s\-_.:/()]+/g, ' ');
};

const yieldLoop = () => new Promise(resolve => setImmediate(resolve));

export interface IResolvedItemMatch {
  itemId: mongoose.Types.ObjectId;
  activity: string;
  loaSerialNo: string;
  loaSrNo: string;
  tempCode: string;
  totalLoaQty: number;
  unit: string;
}

export class JmcImportService {
  /**
   * Pre-fetch and index all master items, contractors, and historical records
   */
  static async buildResolutionContext() {
    const [allContractors, allItems, pastJmcRecords, pastCwoRecords] = await Promise.all([
      Contractor.find({}).lean(),
      Item.find({ isDeleted: { $ne: true } }).lean(),
      JmcRegister.find({}).select('circle items.itemId items.activity items.description items.tempCode items.loaSrNo items.loaSerialNo items.unit items.totalLoaQty').lean(),
      ContractorWorkOrder.find({}).select('circle lineItems.itemId lineItems.activity lineItems.description lineItems.itemDescription lineItems.tempCode lineItems.loaSrNo lineItems.loaSerialNo lineItems.uom').lean()
    ]);

    const itemMapById = new Map<string, any>();
    allItems.forEach(it => itemMapById.set(it._id.toString(), it));

    const historyMap = new Map<string, any>();
    const descOnlyHistoryMap = new Map<string, any>();
    const globalDescHistoryMap = new Map<string, any>();

    const addToHistory = (circle: any, activity: any, desc: any, item: any) => {
      if (!item || !desc) return;
      const cNorm = normalize(circle);
      const aNorm = normalize(activity);
      const dNorm = normalize(desc);
      if (cNorm && aNorm && dNorm) historyMap.set(`${cNorm}|||${aNorm}|||${dNorm}`, item);
      if (cNorm && dNorm && !descOnlyHistoryMap.has(`${cNorm}|||${dNorm}`)) {
        descOnlyHistoryMap.set(`${cNorm}|||${dNorm}`, item);
      }
      if (dNorm && !globalDescHistoryMap.has(dNorm)) {
        globalDescHistoryMap.set(dNorm, item);
      }
    };

    pastJmcRecords.forEach((jmc: any) => {
      const circle = jmc.circle || jmc.legacyMetadata?.circle;
      (jmc.items || []).forEach((it: any) => {
        if (it.itemId) addToHistory(circle, it.activity, it.description, it);
      });
    });

    pastCwoRecords.forEach((cwo: any) => {
      const circle = cwo.circle || cwo.legacyMetadata?.circle;
      (cwo.lineItems || []).forEach((li: any) => {
        if (li.itemId) addToHistory(circle, li.activity, li.description || li.itemDescription, li);
      });
    });

    const circleItemsMap = new Map<string, any[]>();
    const allItemsByTempCode = new Map<string, any[]>();
    const itemsByLoa = new Map<string, any[]>();
    const itemsByTempCode = new Map<string, any[]>();
    const itemsByCircle = new Map<string, any[]>();
    const itemsByDescription = new Map<string, any[]>();

    allItems.forEach(it => {
      const d = it.dynamicData || {};
      const c = normalize(d.circle || it.circle);
      const tc = String(d.tempCode || it.tempCode || '').trim().toLowerCase();
      const loa = String(d.sku || d.loaSrNo || d.loaSerialNo || '').trim().toLowerCase();
      const desc = String(d.description || d.name || it.name || '').trim().toLowerCase();

      if (c) {
        if (!circleItemsMap.has(c)) circleItemsMap.set(c, []);
        circleItemsMap.get(c)!.push(it);
        if (!itemsByCircle.has(c)) itemsByCircle.set(c, []);
        itemsByCircle.get(c)!.push(it);
      }
      if (tc) {
        if (!allItemsByTempCode.has(tc)) allItemsByTempCode.set(tc, []);
        allItemsByTempCode.get(tc)!.push(it);
        if (!itemsByTempCode.has(tc)) itemsByTempCode.set(tc, []);
        itemsByTempCode.get(tc)!.push(it);
      }
      if (loa) {
        if (!itemsByLoa.has(loa)) itemsByLoa.set(loa, []);
        itemsByLoa.get(loa)!.push(it);
      }
      if (desc) {
        if (!itemsByDescription.has(desc)) itemsByDescription.set(desc, []);
        itemsByDescription.get(desc)!.push(it);
      }
    });

    const contractorNames = allContractors.map((c: any) => c.name || c.dynamicData?.companyName || c.dynamicData?.displayName || c.dynamicData?.name).filter(Boolean);

    return {
      allContractors,
      contractorNames,
      allItems,
      itemMapById,
      historyMap,
      descOnlyHistoryMap,
      globalDescHistoryMap,
      circleItemsMap,
      allItemsByTempCode,
      itemsByLoa,
      itemsByTempCode,
      itemsByCircle,
      itemsByDescription
    };
  }

  /**
   * Infers tempCode based on standard RDSS tender terminology
   */
  static inferTempCode(desc: string, act: string): string | null {
    const lower = `${desc} ${act}`.toLowerCase();

    // Jointing kits & termination kits
    if (lower.includes('straight through jointing kit') || lower.includes('straight through joint') || lower.includes('straight through kit')) return '148';
    if (lower.includes('t-jointing kit') || lower.includes('t jointing kit')) return '149';
    if (lower.includes('outdoor type termination kit') || lower.includes('outdoor termination kit')) return '141';
    if (lower.includes('indoor type termination kit') || lower.includes('indoor termination kit')) return '142';
    if (lower.includes('termination kit')) return '147';

    // Poles & structures
    if (lower.includes('steel tubular pole') || lower.includes('tublar pole') || lower.includes('stp')) {
      if (lower.includes('11 m') || lower.includes('11m')) return '2';
      if (lower.includes('10 m') || lower.includes('10m')) return '3';
      return '1';
    }
    if (lower.includes('muff')) return '4';
    if (lower.includes('stay set')) return lower.includes('20mm') || lower.includes('ht') ? '70' : '69';
    if (lower.includes('stay wire')) return lower.includes('4.00') ? '95' : '94';

    // Hardware fittings & clamps
    if (lower.includes('clamps fittings') || lower.includes('clamp fitting')) return '119';
    if (lower.includes('full clamp')) return '119';
    if (lower.includes('half clamp')) return '120';
    if (lower.includes('d iron') || lower.includes('d-iron') || lower.includes('u clamp')) return '60';
    if (lower.includes('red oxide')) return '126';
    if (lower.includes('aluminium paint')) return '125';
    if (lower.includes('anchoring assembly')) return lower.includes('ht') ? '77' : '76';
    if (lower.includes('suspension assembly')) return lower.includes('ht') ? '78' : '79';
    if (lower.includes('facade hook') || lower.includes('i hook')) return lower.includes('ht') ? '80' : '81';
    if (lower.includes('piercing connector') || lower.includes('ipc')) return '82';
    if (lower.includes('distribution box') || lower.includes('smc ltdb') || lower.includes('ltdb')) return '24';
    if (lower.includes('coil earthing') || lower.includes('lt earthing')) return '74';
    if (lower.includes('pipe earthing')) return '73';
    if (lower.includes('barbed wire')) return '91';
    if (lower.includes('danger plate')) return '65';
    if (lower.includes('warning tape')) return '150';
    if (lower.includes('bolt') && lower.includes('nut')) return '127';
    if (lower.includes('cross arm') || lower.includes('x-arm') || lower.includes('x arm')) return '105';

    // Transformers (DTR)
    if (lower.includes('distribution transformer') || lower.includes('dtr')) {
      if (lower.includes('10 kva') || lower.includes('10kva')) return '9';
      if (lower.includes('16 kva') || lower.includes('16kva')) return '10';
      if (lower.includes('25 kva') || lower.includes('25kva')) return '11';
      if (lower.includes('63 kva') || lower.includes('63kva')) return '12';
      if (lower.includes('100 kva') || lower.includes('100kva')) return '13';
      if (lower.includes('250 kva') || lower.includes('250kva')) return '14';
      if (lower.includes('400 kva') || lower.includes('400kva')) return '15';
      if (lower.includes('630 kva') || lower.includes('630kva')) return '16';
    }

    // Panel box / LTDB by DTR rating
    if (lower.includes('distribution panel box') || lower.includes('ltdb')) {
      if (lower.includes('16 kva') || lower.includes('16kva')) return '18';
      if (lower.includes('25 kva') || lower.includes('25kva')) return '18';
      if (lower.includes('63 kva') || lower.includes('63kva')) return '19';
      if (lower.includes('100 kva') || lower.includes('100kva')) return '20';
      if (lower.includes('250 kva') || lower.includes('250kva')) return '21';
      if (lower.includes('400 kva') || lower.includes('400kva')) return '22';
      if (lower.includes('630 kva') || lower.includes('630kva')) return '23';
      return '24';
    }

    // Capacitors
    if (lower.includes('capacitor')) {
      if (lower.includes('4 kvar') || lower.includes('4kvar')) return '236';
      if (lower.includes('8 kvar') || lower.includes('8kvar')) return '237';
      if (lower.includes('12 kvar') || lower.includes('12kvar')) return '238';
      if (lower.includes('24 kvar') || lower.includes('24kvar')) return '239';
      if (lower.includes('60') || lower.includes('60var') || lower.includes('60kvar')) return '238';
      return '238';
    }

    // Cables by size & type
    if (lower.includes('cable') || lower.includes('conductor')) {
      if (lower.includes('3.5x120') || lower.includes('3.5 x 120') || lower.includes('120 mm sq') || lower.includes('120 sqmm') || lower.includes('120mm²')) return '47';
      if (lower.includes('3.5x240') || lower.includes('3.5 x 240') || lower.includes('3x240') || lower.includes('240 sqmm') || lower.includes('240mm²')) return '35';
      if (lower.includes('3.5x185') || lower.includes('3.5 x 185') || lower.includes('3x185') || lower.includes('185 sqmm') || lower.includes('185mm²')) return '38';
      if (lower.includes('3.5x300') || lower.includes('3.5 x 300') || lower.includes('300 sqmm') || lower.includes('300mm²')) return '49';
      if (lower.includes('3.5x400') || lower.includes('3.5 x 400') || lower.includes('400 sqmm') || lower.includes('400mm²')) return '50';
      if (lower.includes('3.5x95') || lower.includes('3.5 x 95') || lower.includes('3x95') || lower.includes('95 sqmm') || lower.includes('95mm²')) return '34';
      if (lower.includes('3.5x70') || lower.includes('3.5 x 70') || lower.includes('3x70') || lower.includes('70 sqmm') || lower.includes('70mm²')) return '33';
      if (lower.includes('3.5x50') || lower.includes('3.5 x 50') || lower.includes('3x50') || lower.includes('50 sqmm') || lower.includes('50mm²')) return '32';
      if (lower.includes('3.5x35') || lower.includes('3.5 x 35') || lower.includes('35 sqmm') || lower.includes('35mm²')) return '43';
      if (lower.includes('rabbit')) return '28';
      if (lower.includes('dog')) return '29';
      if (lower.includes('wolf')) return '30';
      if (lower.includes('panther')) return '31';
    }

    return null;
  }

  /**
   * Resolves a row from the sheet to a valid Master Item
   */
  static resolveItem(sr: any, uploadedCircle: string, ctx: any): IResolvedItemMatch | null {
    const uc = normalize(uploadedCircle);
    const desc = sr.description || sr.itemDescription || '';
    const act = sr.activity || '';
    const dNorm = normalize(desc);
    const aNorm = normalize(act);
    const srLoa = String(sr.loaSerialNo || sr.loa || '').trim().toLowerCase();
    const srTemp = String(sr.tempCode || '').trim().toLowerCase();

    const formatMatch = (itemOrHistory: any): IResolvedItemMatch => {
      const itId = itemOrHistory.itemId || itemOrHistory._id;
      const master = itemOrHistory.dynamicData ? itemOrHistory : (ctx.itemMapById.get(itId ? itId.toString() : '') || itemOrHistory);
      const d = master.dynamicData || {};
      return {
        itemId: itId,
        activity: master.activity || d.activity || itemOrHistory.activity || act || '',
        loaSerialNo: master.loaSerialNo || master.loaSrNo || d.sku || d.loaSrNo || d.loaSerialNo || srLoa || '',
        loaSrNo: master.loaSrNo || master.loaSerialNo || d.sku || d.loaSrNo || d.loaSerialNo || srLoa || '',
        tempCode: master.tempCode || d.tempCode || master.rawItem?.tempCode || srTemp || '',
        totalLoaQty: Number(master.totalLoaQty || d.loaQty || d.loaQuantity || d.totalLoaQuantity || d.qty || d.quantity || 0),
        unit: master.unit || master.uom || d.uom || d.unit || itemOrHistory.unit || sr.unit || ''
      };
    };

    // 1. History match (circle + activity + description)
    if (uc && aNorm && dNorm && ctx.historyMap.has(`${uc}|||${aNorm}|||${dNorm}`)) {
      return formatMatch(ctx.historyMap.get(`${uc}|||${aNorm}|||${dNorm}`));
    }
    // 2. History match (circle + description)
    if (uc && dNorm && ctx.descOnlyHistoryMap.has(`${uc}|||${dNorm}`)) {
      return formatMatch(ctx.descOnlyHistoryMap.get(`${uc}|||${dNorm}`));
    }

    // 3. Circle items match
    const cItems = ctx.circleItemsMap.get(uc) || [];
    if (srTemp) {
      const match = cItems.find((it: any) => String(it.dynamicData?.tempCode || it.tempCode || '').trim().toLowerCase() === srTemp);
      if (match) return formatMatch(match);
    }
    if (srLoa && cItems.length > 0) {
      const match = cItems.find((it: any) => String(it.dynamicData?.sku || it.dynamicData?.loaSrNo || '').trim().toLowerCase() === srLoa);
      if (match) return formatMatch(match);
    }

    // Exact description in circle items
    let itemMatch = cItems.find((it: any) => {
      const itDesc = normalize(it.dynamicData?.description || it.dynamicData?.name || it.name);
      return itDesc === dNorm;
    });
    if (itemMatch) return formatMatch(itemMatch);

    // 4. Synonym / Tender rule
    const tc = this.inferTempCode(desc, act);
    if (tc) {
      itemMatch = cItems.find((it: any) => {
        const itTc = String(it.dynamicData?.tempCode || it.tempCode || '').trim();
        const itAct = normalize(it.dynamicData?.activity);
        return itTc === tc && itAct && aNorm && (itAct.includes(aNorm) || aNorm.includes(itAct));
      }) || cItems.find((it: any) => String(it.dynamicData?.tempCode || it.tempCode || '').trim() === tc);

      if (itemMatch) return formatMatch(itemMatch);

      const crossCircleItems = ctx.allItemsByTempCode.get(tc);
      if (crossCircleItems && crossCircleItems.length > 0) {
        return formatMatch(crossCircleItems[0]);
      }
    }

    // 5. Global history match by description
    if (dNorm && ctx.globalDescHistoryMap.has(dNorm)) {
      return formatMatch(ctx.globalDescHistoryMap.get(dNorm));
    }

    // 6. Fuzzy substring match in circle items
    if (dNorm.length >= 8) {
      itemMatch = cItems.find((it: any) => {
        const itDesc = normalize(it.dynamicData?.description || it.dynamicData?.name || it.name);
        return itDesc.length >= 8 && (itDesc.includes(dNorm) || dNorm.includes(itDesc));
      });
      if (itemMatch) return formatMatch(itemMatch);
    }

    return null;
  }

  /**
   * Parse one workbook into structured site-records.
   * Only rows with non-empty, positive numeric quantities (qty > 0) are kept.
   */
  static parseWorkbook(file: any) {
    const workbook = xlsx.read(file.buffer, { type: 'buffer' });
    const sourceFile = file.originalname;
    const sheets: any[] = [];

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: null });

      const metaRows: Record<number, string> = {};
      let headerRowIdx = -1;

      for (let r = 0; r < Math.min(50, rows.length); r++) {
        const row = rows[r];
        if (!row) continue;

        let labelFound = false;
        for (let c = 0; c < 5; c++) {
          const cell = row[c];
          if (cell) {
            const norm = normLabel(cell);
            let field = null;
            if (norm.includes("circle") && !norm.includes("sub")) field = "Circle";
            else if (norm.includes("sub") && norm.includes("circle")) field = "SubCircle";
            else if (norm.includes("division") && !norm.includes("sub")) field = "Division";
            else if (norm.includes("sub") && (norm.includes("div") || norm.includes("division"))) field = "SubDivision";
            else if (norm.includes("sub") && (norm.includes("station") || norm.includes("stn"))) field = "SubStation";
            else if (norm.includes("feeder")) field = "Feeder";
            else if (norm.includes("location") || norm.includes("site")) field = "Location";
            else if (norm.includes("drawing")) field = "DrawingNo";
            else if (norm.includes("contractor") || norm.includes("agency")) field = "Contractor";
            else if (norm.includes("jmc number") || norm.includes("jmc no")) field = "JmcNumber";

            if (field) {
              metaRows[r] = field;
              labelFound = true;
              break;
            }
          }
          if (labelFound) break;
        }

        let isHeader = false;
        let matchCount = 0;
        for (let c = 0; c < 5; c++) {
          const h = normLabel(row[c]);
          if (h && (
            h.includes("loa") || h.includes("code") || h.includes("temp code") || h === "temp" || 
            h.includes("sched") || h.includes("activity") || h === "description" || h.includes("desc") || h.includes("disc") || 
            h === "unit" || h.includes("sr no") || h.includes("sr.") || h.includes("s.no") || 
            h.includes("item") || h.includes("qty") || h.includes("quantity")
          )) {
            matchCount++;
          }
        }
        if (matchCount >= 2) {
          isHeader = true;
          headerRowIdx = r;
          break;
        }
      }

      if (headerRowIdx === -1) {
        sheets.push({ sourceFile, sheetName, skipped: true, reason: "Could not find header row" });
        continue;
      }

      const maxCol = rows.reduce((max, r) => Math.max(max, r.length), 0);
      const headerRow = rows[headerRowIdx];
      let loaIdx = -1, tempCodeIdx = -1, schedIdx = -1, activityIdx = -1, descIdx = -1, unitIdx = -1;

      for (let c = 0; c < headerRow.length; c++) {
        const h = normLabel(headerRow[c]);
        if (!h) continue;
        if (h.includes("loa") && loaIdx === -1) loaIdx = c;
        else if (h.includes("code") && tempCodeIdx === -1) tempCodeIdx = c;
        else if (h.includes("sched") && schedIdx === -1) schedIdx = c;
        else if (h.includes("activity") && activityIdx === -1) activityIdx = c;
        else if ((h.includes("desc") || h.includes("disc")) && descIdx === -1) descIdx = c;
        else if (h.includes("unit") && unitIdx === -1) unitIdx = c;
      }

      let startSiteCol = Math.max(loaIdx, tempCodeIdx, schedIdx, activityIdx, descIdx, unitIdx) + 1;
      if (startSiteCol <= 0) {
        startSiteCol = 5;
        loaIdx = 0; schedIdx = 1; activityIdx = 2; descIdx = 3; unitIdx = 4;
      }

      const siteCols: number[] = [];
      for (let c = startSiteCol; c < maxCol; c++) {
        const headerVal = rows[headerRowIdx][c];
        const hasMeta = Object.keys(metaRows).some(rIdx => {
          const val = rows[Number(rIdx)][c];
          return val !== null && val !== undefined && val !== "";
        });
        if (hasMeta || (headerVal !== null && headerVal !== undefined && headerVal !== "")) {
          siteCols.push(c);
        }
      }

      const globalMeta: any = {};
      for (const [rIdxStr, field] of Object.entries(metaRows)) {
        const rIdx = Number(rIdxStr);
        const rowData = rows[rIdx];
        let foundLabel = false;
        let val = null;
        for (let i = 0; i < rowData.length; i++) {
          const cell = rowData[i];
          if (cell !== null && cell !== undefined && String(cell).trim() !== '') {
            const strCell = String(cell).trim();
            if (!foundLabel) {
              foundLabel = true;
              if (strCell.includes(':')) {
                const parts = strCell.split(':');
                if (parts.length > 1 && parts[1].trim() !== '') {
                  val = parts.slice(1).join(':').trim();
                  break;
                }
              } else {
                const lower = strCell.toLowerCase();
                if (field === 'Contractor' && lower.includes('agency')) {
                   const potentialVal = strCell.substring(lower.indexOf('agency') + 6).replace(/^[^a-zA-Z0-9]+/, '').trim();
                   if (potentialVal) { val = potentialVal; break; }
                } else if (field === 'Contractor' && lower.includes('contractor')) {
                   const potentialVal = strCell.substring(lower.indexOf('contractor') + 10).replace(/^[^a-zA-Z0-9]+/, '').trim();
                   if (potentialVal) { val = potentialVal; break; }
                } else if (field === 'Circle' && lower.includes('circle')) {
                   const potentialVal = strCell.substring(lower.indexOf('circle') + 6).replace(/^[^a-zA-Z0-9]+/, '').trim();
                   if (potentialVal) { val = potentialVal; break; }
                }
              }
            } else {
              val = cell;
              break;
            }
          }
        }
        globalMeta[field] = val;
      }

      const siteMeta: Record<number, any> = {};
      for (const c of siteCols) {
        const d: any = { ...globalMeta };
        for (const [rIdxStr, field] of Object.entries(metaRows)) {
          const rIdx = Number(rIdxStr);
          let cellVal = rows[rIdx][c];
          if (cellVal === null || cellVal === undefined || String(cellVal).trim() === '') {
            for (let left = c - 1; left >= startSiteCol; left--) {
              const leftVal = rows[rIdx][left];
              if (leftVal !== null && leftVal !== undefined && String(leftVal).trim() !== '') {
                cellVal = leftVal;
                break;
              }
            }
          }
          if (cellVal !== null && cellVal !== undefined && String(cellVal).trim() !== '') {
            d[field] = cellVal;
          }
        }
        d.Status = rows[headerRowIdx][c];
        siteMeta[c] = d;
      }

      const recordsBySite: Record<number, any[]> = {};
      for (const c of siteCols) recordsBySite[c] = [];

      let currentActivityGroup = '';
      for (let r = headerRowIdx + 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row) continue;

        const loa = loaIdx !== -1 ? row[loaIdx] : null;
        const tempCodeVal = tempCodeIdx !== -1 ? row[tempCodeIdx] : null;
        const sched = schedIdx !== -1 ? row[schedIdx] : null;
        const activity = activityIdx !== -1 ? row[activityIdx] : null;
        const desc = descIdx !== -1 ? row[descIdx] : null;
        const unit = unitIdx !== -1 ? row[unitIdx] : null;

        if (!loa && !tempCodeVal && !sched && !activity && !desc) continue;

        if (!unit || String(unit).trim() === '') {
          if (desc) currentActivityGroup = String(desc).trim();
          continue;
        }

        for (const c of siteCols) {
          const qty = row[c];
          if (qty === null || qty === undefined || qty === "") continue;
          const numQty = parseFloat(qty);
          // CRITICAL: Only parse rows where quantity is positive (claimed work)
          // Rows with 0 are template rows not executed at this site
          if (!isNaN(numQty) && numQty > 0) {
            recordsBySite[c].push({
              rowNum: r + 1, loa, tempCode: tempCodeVal, sched, activity: activity || currentActivityGroup, description: desc || activity, unit, quantity: numQty
            });
          }
        }
      }

      sheets.push({ sourceFile, sheetName, siteCols, siteMeta, recordsBySite });
    }

    return sheets;
  }

  /**
   * Executes full bulk upload processing with Pass 1 (validation) and Pass 2 (saving)
   */
  static async processBulkUpload(files: any[], user: any, conflictStrategy: string, clientId?: string) {
    if (clientId) {
      sseService.sendEvent(clientId, { stage: 'parsing', progress: 5, message: 'Fetching metadata and indexing items...' });
    }

    const ctx = await this.buildResolutionContext();

    const validationErrors: { sourceFile: string; sheetName: string; description: string; circle: string; row?: number }[] = [];
    const parsedSheets: any[] = [];
    const totalFiles = files.length;
    let fileIdx = 0;

    // ——— PASS 1: VALIDATION ——————————————————————————————————————
    for (const file of files) {
      try {
        if (clientId) {
          sseService.sendEvent(clientId, { 
            stage: 'parsing', 
            progress: 10 + (fileIdx / totalFiles) * 20, 
            message: `Reading file ${fileIdx + 1} of ${totalFiles}: ${file.originalname}...` 
          });
        }

        const sheets = this.parseWorkbook(file);
        for (const sheet of sheets) {
          if (sheet.skipped) continue;
          const { sourceFile, sheetName, siteCols, siteMeta, recordsBySite } = sheet;

          let colIdx = 0;
          for (const c of siteCols) {
            if (clientId) {
              sseService.sendEvent(clientId, {
                stage: 'validation',
                progress: 30 + (fileIdx / totalFiles) * 30 + (colIdx / siteCols.length) * 10,
                message: `Validating and mapping ${recordsBySite[c].length} items for column ${c}...`
              });
            }

            const meta = siteMeta[c];

            if (!meta.DrawingNo || String(meta.DrawingNo).trim() === '') {
              const siteHeader = meta.Location || meta.SubStation || meta.Division || meta.Circle || `Column ${c}`;
              throw new Error(`Validation Error in sheet '${sheetName}' (Site: ${siteHeader}): 'Drawing No' is mandatory but was not found in the header metadata.`);
            }

            if (user?.assignedCircle && meta.Circle) {
              const assigned = String(user.assignedCircle).trim().toLowerCase();
              const sheetCirc = String(meta.Circle).trim().toLowerCase();
              const SUB_STORE_MAP: Record<string, string[]> = {
                'solan': ['solan', 'kumarhatti', 'nalagarh'],
                'nahan': ['nahan'],
                'rohru': ['rohru'],
                'rampur': ['rampur'],
              };
              const allowedCircles = SUB_STORE_MAP[assigned] || [assigned];
              if (!allowedCircles.includes(sheetCirc)) {
                throw new Error(`Permission Denied: You are assigned to circle '${user.assignedCircle}', but the sheet '${sheetName}' contains data for circle '${meta.Circle}'. Allowed circles: ${allowedCircles.join(', ')}.`);
              }
            }

            const uploadedCircle = user?.assignedCircle || meta.Circle || '';

            let count = 0;
            for (const sr of recordsBySite[c]) {
              count++;
              if (count % 50 === 0) await yieldLoop();

              const resolved = this.resolveItem(sr, uploadedCircle, ctx);
              if (!resolved) {
                validationErrors.push({
                  sourceFile,
                  sheetName,
                  description: `Row ${sr.rowNum}: ${sr.description || sr.activity || 'Unknown item'} (Not found in Master)`,
                  circle: uploadedCircle,
                  row: sr.rowNum
                });
              }
            }
            colIdx++;
          }
          parsedSheets.push(sheet);
        }
      } catch (e: any) {
        validationErrors.push({ sourceFile: file.originalname, sheetName: '', description: `Parse error: ${e.message}`, circle: '' });
      }
      fileIdx++;
    }

    if (validationErrors.length > 0) {
      const uniqueErrors = validationErrors.filter((e, idx, arr) =>
        arr.findIndex(x => x.description === e.description && x.circle === e.circle) === idx
      );
      return {
        success: false,
        totalSaved: 0,
        missingItems: uniqueErrors.map(e => ({
          file: e.sourceFile,
          sheet: e.sheetName,
          description: e.description,
          circle: e.circle,
          row: e.row
        }))
      };
    }

    // ——— PASS 2: ALL VALIDATED — NOW SAVE ——————————————————————————————
    const flagged: any[] = [];
    let totalSaved = 0;
    const currentYearStr = new Date().getFullYear().toString().slice(-2);
    const lastJmc = await JmcRegister.findOne({ jmcNumber: new RegExp(`^JMC/${currentYearStr}/`) }).sort({ jmcNumber: -1 }).select('jmcNumber').lean();
    let initialCount = 0;
    if (lastJmc && lastJmc.jmcNumber) {
      const parts = lastJmc.jmcNumber.split('/');
      if (parts.length === 3) {
        initialCount = parseInt(parts[2], 10) || 0;
      }
    }
    let savedSheetsIdx = 0;

    for (const sheet of parsedSheets) {
      const { sourceFile, sheetName, siteCols, siteMeta, recordsBySite } = sheet;

      let colIdx = 0;
      for (const c of siteCols) {
        if (clientId) {
          sseService.sendEvent(clientId, {
            stage: 'saving',
            progress: 70 + (savedSheetsIdx / parsedSheets.length) * 30 + (colIdx / siteCols.length) * 10,
            message: `Saving drafts for sheet ${savedSheetsIdx + 1} of ${parsedSheets.length}, column ${c}...`
          });
        }

        const siteRecords = recordsBySite[c];
        if (siteRecords.length === 0) {
          const meta = siteMeta[c] || {};
          const siteName = meta.Location || meta.SubStation || meta.Division || meta.Circle || `Column ${c}`;
          flagged.push({ sourceFile, sheetName, issue: `Site '${siteName}' was skipped because it has no item quantities filled.` });
          colIdx++;
          continue;
        }

        const meta = siteMeta[c];
        const pkg = user?.assignedPackage || meta.Location || meta.DrawingNo || '';
        const circ = user?.assignedCircle || meta.Circle || '';
        const subCirc = meta.SubCircle || '';
        const div = meta.Division || '';
        const subDiv = meta.SubDivision || '';
        const loc = meta.Location || '';
        const subStn = meta.SubStation || '';
        const feeder = meta.Feeder || '';
        const uploadedCircle = circ;

        // Resolve contractor
        let contractorId = null;
        const contractorNameStr = meta.Contractor ? String(meta.Contractor) : "";
        if (contractorNameStr && ctx.contractorNames.length > 0) {
          const lowerInput = contractorNameStr.trim().toLowerCase();
          const lowerNames = ctx.contractorNames.map((n: string) => String(n).trim().toLowerCase());
          const bestMatch = stringSimilarity.findBestMatch(lowerInput, lowerNames);
          if (bestMatch.bestMatch.rating > 0.4) {
            const matchedContractor = ctx.allContractors.find((contractor: any) => {
              const name = contractor.name || contractor.dynamicData?.companyName || contractor.dynamicData?.displayName || contractor.dynamicData?.name;
              return name && String(name).trim().toLowerCase() === bestMatch.bestMatch.target;
            });
            if (matchedContractor) contractorId = matchedContractor._id;
          }
        }

        if (!contractorId) {
          const siteHeader = meta.Location || meta.SubStation || meta.Division || meta.Circle || `Column ${c}`;
          throw new Error(`Validation Error in sheet '${sheetName}' (Site: ${siteHeader}): Contractor '${contractorNameStr || 'Unknown'}' not found in the database.`);
        }

        // Build items and aggregate any duplicate rows for the same item and activity
        const jmcItems: any[] = [];
        const itemIndexMap = new Map<string, number>();

        let count = 0;
        for (const sr of siteRecords) {
          count++;
          if (count % 50 === 0) await yieldLoop();

          const resolved = this.resolveItem(sr, uploadedCircle, ctx)!;
          const key = `${resolved.itemId.toString()}_${(resolved.activity || '').trim().toLowerCase()}`;

          if (itemIndexMap.has(key)) {
            const idx = itemIndexMap.get(key)!;
            jmcItems[idx].claimedQty += sr.quantity;
          } else {
            itemIndexMap.set(key, jmcItems.length);
            jmcItems.push({
              itemId: resolved.itemId,
              loaSerialNo: resolved.loaSerialNo,
              loaSrNo: resolved.loaSrNo,
              tempCode: resolved.tempCode,
              totalLoaQty: resolved.totalLoaQty,
              activity: resolved.activity,
              description: sr.description || '',
              unit: resolved.unit || sr.unit || '',
              prevQty: 0,
              claimedQty: sr.quantity,
              approvedQty: 0,
              rate: 0,
              amount: 0,
              remarks: ''
            });
          }
        }

        // Compute prevQty
        const pastApprovedJmcs = await JmcRegister.find({
          contractorId: contractorId || null, package: pkg, location: loc, circle: circ, division: div, subDivision: subDiv, subStation: subStn, feeder, status: 'Approved'
        }).lean();

        const prevQtyMap: Record<string, number> = {};
        for (const pastJmc of pastApprovedJmcs) {
          for (const item of (pastJmc as any).items) {
            if (item.itemId) {
              const idStr = item.itemId.toString();
              prevQtyMap[idStr] = (prevQtyMap[idStr] || 0) + (item.approvedQty || 0);
            }
          }
        }
        for (const item of jmcItems) {
          if (item.itemId) item.prevQty = prevQtyMap[item.itemId.toString()] || 0;
        }

        // Match existing JMC by Contractor + Circle + (DrawingNo OR Location)
        const matchConditions: any[] = [];
        if (meta.DrawingNo && String(meta.DrawingNo).trim() !== '') {
          matchConditions.push({
            contractorId: contractorId || null,
            circle: new RegExp(`^${circ}$`, 'i'),
            drawingNo: String(meta.DrawingNo).trim()
          });
        }
        if (loc && String(loc).trim() !== '') {
          const escapedLoc = loc.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          matchConditions.push({
            contractorId: contractorId || null,
            circle: new RegExp(`^${circ}$`, 'i'),
            location: new RegExp(`^${escapedLoc}$`, 'i')
          });
        }

        const existingJmc = matchConditions.length > 0 
          ? await JmcRegister.findOne({ $or: matchConditions })
          : null;

        if (existingJmc) {
          if (conflictStrategy === 'skip') {
            flagged.push({ sourceFile, issue: `Skipped duplicate JMC for ${circ} - ${subDiv} - ${loc}` });
            colIdx++;
            continue;
          } else if (conflictStrategy === 'replace') {
            if (existingJmc.status !== 'Approved') {
              await JmcRegister.deleteOne({ _id: existingJmc._id });
            } else {
              flagged.push({ sourceFile, issue: `Cannot replace Approved JMC for ${circ} - ${subDiv} - ${loc}` });
              colIdx++;
              continue;
            }
          } else if (conflictStrategy === 'update') {
            if (existingJmc.status !== 'Approved') {
              if (meta.DrawingNo && !existingJmc.drawingNo) existingJmc.drawingNo = String(meta.DrawingNo).trim();
              if (subStn && !existingJmc.subStation) existingJmc.subStation = subStn;
              if (feeder && !existingJmc.feeder) existingJmc.feeder = feeder;
              for (const newItem of jmcItems) {
                const existingItem = existingJmc.items.find((i: any) => 
                  (i.itemId && newItem.itemId && i.itemId.toString() === newItem.itemId.toString()) ||
                  (!i.itemId && !newItem.itemId && i.description === newItem.description && i.activity === newItem.activity)
                );
                if (existingItem) {
                  existingItem.claimedQty = newItem.claimedQty || 0;
                } else {
                  existingJmc.items.push(newItem);
                }
              }
              await existingJmc.save();
              totalSaved++;
              colIdx++;
              continue;
            } else {
              flagged.push({ sourceFile, issue: `Cannot update Approved JMC for ${circ} - ${subDiv} - ${loc}` });
              colIdx++;
              continue;
            }
          }
        }

        const existingJmcNo = meta.JmcNumber || null;

        if (existingJmcNo) {
          await JmcRegister.findOneAndUpdate({ jmcNumber: existingJmcNo }, {
            $set: {
              date: new Date(),
              contractorId: contractorId || null,
              package: pkg,
              drawingNo: meta.DrawingNo,
              location: loc,
              circle: circ,
              subCircle: subCirc,
              division: div,
              subDivision: subDiv,
              subStation: subStn,
              feeder,
              items: jmcItems,
              remarks: `Updated via Bulk Upload from ${sourceFile} (${sheetName}).`,
            },
            $setOnInsert: {
              claimedAmount: 0,
              approvedAmount: 0,
              status: 'Submitted',
              createdBy: user._id
            }
          }, { upsert: true });
        } else {
          let saved = false;
          let attempts = 0;
          while (!saved && attempts < 10) {
            try {
              initialCount++;
              const jmcNumber = `JMC/${currentYearStr}/${initialCount.toString().padStart(4, '0')}`;

              await JmcRegister.create({
                jmcNumber,
                date: new Date(),
                contractorId: contractorId || null,
                package: pkg,
                drawingNo: meta.DrawingNo,
                location: loc,
                circle: circ,
                subCircle: subCirc,
                division: div,
                subDivision: subDiv,
                subStation: subStn,
                feeder,
                items: jmcItems,
                claimedAmount: 0,
                approvedAmount: 0,
                status: 'Submitted',
                approvalStatus: 'Draft',
                remarks: `Uploaded from ${sourceFile} (${sheetName}). ${!meta.Contractor ? 'Warning: No contractor name found in sheet.' : ''}`.trim(),
                createdBy: user._id
              });
              saved = true;
            } catch (err: any) {
              if (err.code === 11000 && err.keyPattern && err.keyPattern.jmcNumber) {
                attempts++;
                const latest = await JmcRegister.findOne({ jmcNumber: new RegExp(`^JMC/${currentYearStr}/`) }).sort({ jmcNumber: -1 }).select('jmcNumber').lean();
                if (latest && latest.jmcNumber) {
                  const parts = latest.jmcNumber.split('/');
                  if (parts.length === 3) {
                    initialCount = parseInt(parts[2], 10) || initialCount;
                  }
                }
              } else {
                throw err;
              }
            }
          }
        }

        totalSaved++;
        colIdx++;
      }
      savedSheetsIdx++;
    }

    if (clientId) {
      sseService.sendEvent(clientId, {
        stage: 'COMPLETED',
        progress: 100,
        message: 'Upload and processing complete!'
      });
    }

    return {
      success: true,
      totalSaved,
      flagged
    };
  }
}
