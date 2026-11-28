import * as xlsx from 'xlsx';
import stringSimilarity from 'string-similarity';
import mongoose from 'mongoose';
import { WipRegister } from './wip.schema';
import { JmcRegister } from '../jmc/jmc.schema';
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

export class WipImportService {
  /**
   * Pre-fetch and index all master items, contractors, and historical records
   */
  static async buildResolutionContext() {
    const [allContractors, allItems, pastWipRecords, pastJmcRecords, pastCwoRecords] = await Promise.all([
      Contractor.find({}).lean(),
      Item.find({ isDeleted: { $ne: true } }).lean(),
      WipRegister.find({}).select('circle items.itemId items.activity items.description items.tempCode items.loaSrNo items.loaSerialNo items.unit items.totalLoaQty').lean(),
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

    pastWipRecords.forEach((wip: any) => {
      const circle = wip.circle || wip.legacyMetadata?.circle;
      (wip.items || []).forEach((it: any) => {
        if (it.itemId) addToHistory(circle, it.activity, it.description, it);
      });
    });

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

    const contractorNames = allContractors
      .map((c: any) => c.name || c.dynamicData?.companyName || c.dynamicData?.displayName || c.dynamicData?.name)
      .filter(Boolean);

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
   * Resolves a sheet row to an Item using multi-tier and synonym matching
   */
  static resolveItem(
    sr: {
      loa?: string | null;
      tempCode?: string | null;
      sched?: string | null;
      activity?: string | null;
      description?: string | null;
      unit?: string | null;
    },
    uploadedCircle: string,
    ctx: Awaited<ReturnType<typeof WipImportService.buildResolutionContext>>
  ): IResolvedItemMatch | null {
    const ucNorm = normalize(uploadedCircle);
    const srDesc = String(sr.description || '').trim();
    const srAct = String(sr.activity || '').trim();
    const srDescNorm = normalize(srDesc);
    const srActNorm = normalize(srAct);
    const srTemp = sr.tempCode ? String(sr.tempCode).trim().toLowerCase() : '';
    const srLoa = sr.loa ? String(sr.loa).trim().toLowerCase() : '';
    const fuzzy = (str: any) => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const srDescFuzzy = fuzzy(srDesc || srAct);

    // 1. Historical Exact Match: circle + activity + description
    if (ucNorm && srActNorm && srDescNorm) {
      const hit = ctx.historyMap.get(`${ucNorm}|||${srActNorm}|||${srDescNorm}`);
      if (hit && hit.itemId) {
        return {
          itemId: hit.itemId,
          activity: hit.activity || srAct,
          loaSerialNo: hit.loaSerialNo || srLoa || '',
          loaSrNo: hit.loaSrNo || srLoa || '',
          tempCode: hit.tempCode || srTemp || '',
          totalLoaQty: hit.totalLoaQty || 0,
          unit: hit.unit || sr.unit || ''
        };
      }
    }

    // 2. Historical Circle + Description Match
    if (ucNorm && srDescNorm) {
      const hit = ctx.descOnlyHistoryMap.get(`${ucNorm}|||${srDescNorm}`);
      if (hit && hit.itemId) {
        return {
          itemId: hit.itemId,
          activity: hit.activity || srAct,
          loaSerialNo: hit.loaSerialNo || srLoa || '',
          loaSrNo: hit.loaSrNo || srLoa || '',
          tempCode: hit.tempCode || srTemp || '',
          totalLoaQty: hit.totalLoaQty || 0,
          unit: hit.unit || sr.unit || ''
        };
      }
    }

    // 3. Global Historical Description Match
    if (srDescNorm) {
      const hit = ctx.globalDescHistoryMap.get(srDescNorm);
      if (hit && hit.itemId) {
        return {
          itemId: hit.itemId,
          activity: hit.activity || srAct,
          loaSerialNo: hit.loaSerialNo || srLoa || '',
          loaSrNo: hit.loaSrNo || srLoa || '',
          tempCode: hit.tempCode || srTemp || '',
          totalLoaQty: hit.totalLoaQty || 0,
          unit: hit.unit || sr.unit || ''
        };
      }
    }

    // 4. In-Memory Search within Target Circle
    let candidateItems: any[] = [];
    if (srLoa && ctx.itemsByLoa.has(srLoa)) {
      candidateItems = candidateItems.concat(ctx.itemsByLoa.get(srLoa) || []);
    }
    if (srTemp && ctx.itemsByTempCode.has(srTemp)) {
      candidateItems = candidateItems.concat(ctx.itemsByTempCode.get(srTemp) || []);
    }
    if (srDesc) {
      const descMatches = ctx.itemsByDescription.get(srDesc.toLowerCase()) || [];
      candidateItems = candidateItems.concat(descMatches);
    }
    if (candidateItems.length === 0 && ctx.itemsByCircle.has(ucNorm)) {
      candidateItems = ctx.itemsByCircle.get(ucNorm) || [];
    }

    let circleCandidates = candidateItems;
    if (ucNorm) {
      circleCandidates = candidateItems.filter(i => {
        const itemCircle = normalize(i.dynamicData?.circle || i.circle || '');
        return itemCircle === ucNorm || itemCircle.includes(ucNorm) || ucNorm.includes(itemCircle);
      });
      if (circleCandidates.length === 0 && ctx.circleItemsMap.has(ucNorm)) {
        circleCandidates = ctx.circleItemsMap.get(ucNorm) || [];
      }
    }

    let matchedItemObj: any = null;

    // 4a. Strict TempCode AND LOA
    if (!matchedItemObj && srTemp && srLoa) {
      matchedItemObj = circleCandidates.find(i => {
        const iTemp = String(i.dynamicData?.tempCode || i.tempCode || '').trim().toLowerCase();
        const iLoa = String(i.dynamicData?.sku || i.dynamicData?.loaSrNo || i.loaSrNo || '').trim().toLowerCase();
        return iTemp === srTemp && iLoa === srLoa;
      });
    }

    // 4b. TempCode AND Fuzzy Description
    if (!matchedItemObj && srTemp && srDescFuzzy) {
      matchedItemObj = circleCandidates.find(i => {
        const iTemp = String(i.dynamicData?.tempCode || i.tempCode || '').trim().toLowerCase();
        const iDescFuzzy = fuzzy(i.dynamicData?.description || i.dynamicData?.name || i.name);
        return iTemp === srTemp && iDescFuzzy === srDescFuzzy;
      });
    }

    // 4c. Domain / RDSS Tender Synonyms & Keywords
    if (!matchedItemObj && srDescFuzzy) {
      let tenderTempCode: string | null = null;
      if (srDescFuzzy.includes('steeltubularpole') || (srDescFuzzy.includes('tubular') && srDescFuzzy.includes('pole'))) {
        if (srDescFuzzy.includes('9m') || srDescFuzzy.includes('9meter') || srDescFuzzy.includes('200kgf')) tenderTempCode = '1';
        else if (srDescFuzzy.includes('11m') || srDescFuzzy.includes('11meter') || srDescFuzzy.includes('365kgf')) tenderTempCode = '2';
        else if (srDescFuzzy.includes('10m') || srDescFuzzy.includes('10meter')) tenderTempCode = '3';
      } else if (srDescFuzzy.includes('muff') && (srDescFuzzy.includes('concrete') || srDescFuzzy.includes('comcrete') || srDescFuzzy.includes('filling'))) {
        tenderTempCode = '4';
      } else if (srDescFuzzy.includes('stayset') || (srDescFuzzy.includes('stay') && srDescFuzzy.includes('set'))) {
        if (srDescFuzzy.includes('20mm') || srDescFuzzy.includes('20x')) tenderTempCode = '70';
        else tenderTempCode = '69';
      } else if (srDescFuzzy.includes('staywire') || (srDescFuzzy.includes('stay') && srDescFuzzy.includes('wire'))) {
        if (srDescFuzzy.includes('7400') || srDescFuzzy.includes('74mm') || srDescFuzzy.includes('740mm')) tenderTempCode = '95';
        else tenderTempCode = '94';
      } else if (srDescFuzzy.includes('pgclamp') || srDescFuzzy.includes('pgc')) {
        if (srDescFuzzy.includes('80120') || srDescFuzzy.includes('80to120')) tenderTempCode = '120';
        else tenderTempCode = '119';
      } else if (srDescFuzzy.includes('jointingkit') || srDescFuzzy.includes('terminationkit') || srDescFuzzy.includes('cablejointingkit')) {
        if (srDescFuzzy.includes('3x300') || srDescFuzzy.includes('300sqmm')) tenderTempCode = '148';
        else if (srDescFuzzy.includes('3x185') || srDescFuzzy.includes('185sqmm')) tenderTempCode = '147';
        else if (srDescFuzzy.includes('3x120') || srDescFuzzy.includes('120sqmm')) tenderTempCode = '142';
        else if (srDescFuzzy.includes('3x70') || srDescFuzzy.includes('70sqmm')) tenderTempCode = '141';
        else tenderTempCode = '149';
      } else if (srDescFuzzy.includes('cable') || srDescFuzzy.includes('conductor')) {
        if (srDescFuzzy.includes('3x240') || srDescFuzzy.includes('3240')) tenderTempCode = '35';
        else if (srDescFuzzy.includes('3x120') || srDescFuzzy.includes('3120')) tenderTempCode = '38';
        else if (srDescFuzzy.includes('3x95') || srDescFuzzy.includes('395')) tenderTempCode = '34';
        else if (srDescFuzzy.includes('3x70') || srDescFuzzy.includes('370')) tenderTempCode = '47';
        else if (srDescFuzzy.includes('3x50') || srDescFuzzy.includes('350')) tenderTempCode = '49';
        else if (srDescFuzzy.includes('3x35') || srDescFuzzy.includes('335')) tenderTempCode = '50';
        else if (srDescFuzzy.includes('1x25') || srDescFuzzy.includes('125')) tenderTempCode = '54';
        else if (srDescFuzzy.includes('1x16') || srDescFuzzy.includes('116')) tenderTempCode = '55';
        else if (srDescFuzzy.includes('1x10') || srDescFuzzy.includes('110')) tenderTempCode = '56';
      }

      if (tenderTempCode) {
        matchedItemObj = circleCandidates.find(i => {
          const iTemp = String(i.dynamicData?.tempCode || i.tempCode || '').trim();
          return iTemp === tenderTempCode;
        });
        if (!matchedItemObj && ctx.allItemsByTempCode.has(tenderTempCode)) {
          const cross = ctx.allItemsByTempCode.get(tenderTempCode)!;
          matchedItemObj = cross[0];
        }
      }
    }

    // 4d. Just TempCode within Circle
    if (!matchedItemObj && srTemp) {
      matchedItemObj = circleCandidates.find(i => {
        const iTemp = String(i.dynamicData?.tempCode || i.tempCode || '').trim().toLowerCase();
        return iTemp === srTemp;
      });
    }

    // 4e. Just LOA within Circle
    if (!matchedItemObj && srLoa) {
      matchedItemObj = circleCandidates.find(i => {
        const iLoa = String(i.dynamicData?.sku || i.dynamicData?.loaSrNo || i.loaSrNo || '').trim().toLowerCase();
        return iLoa === srLoa;
      });
    }

    // 5. Cross-Circle Fallback: TempCode
    if (!matchedItemObj && srTemp && ctx.allItemsByTempCode.has(srTemp)) {
      matchedItemObj = ctx.allItemsByTempCode.get(srTemp)![0];
    }

    // 6. Cross-Circle Fallback: LOA
    if (!matchedItemObj && srLoa && ctx.itemsByLoa.has(srLoa)) {
      matchedItemObj = ctx.itemsByLoa.get(srLoa)![0];
    }

    // 7. Full Description match
    if (!matchedItemObj && srDesc) {
      const exactDesc = srDesc.toLowerCase();
      matchedItemObj = ctx.allItems.find(i => {
        const d = String(i.dynamicData?.description || i.dynamicData?.name || i.name || '').trim().toLowerCase();
        return d === exactDesc;
      });
    }

    // 8. Fuzzy Description Match
    if (!matchedItemObj && srDescFuzzy) {
      matchedItemObj = circleCandidates.find(i => {
        const iDescFuzzy = fuzzy(i.dynamicData?.description || i.dynamicData?.name || i.name);
        return iDescFuzzy && (iDescFuzzy.includes(srDescFuzzy) || srDescFuzzy.includes(iDescFuzzy));
      });
      if (!matchedItemObj) {
        matchedItemObj = ctx.allItems.find(i => {
          const iDescFuzzy = fuzzy(i.dynamicData?.description || i.dynamicData?.name || i.name);
          return iDescFuzzy && (iDescFuzzy.includes(srDescFuzzy) || srDescFuzzy.includes(iDescFuzzy));
        });
      }
    }

    if (!matchedItemObj) return null;

    return {
      itemId: matchedItemObj._id,
      activity: srAct || matchedItemObj.dynamicData?.activity || '',
      loaSerialNo: srLoa || matchedItemObj.dynamicData?.sku || '',
      loaSrNo: srLoa || matchedItemObj.dynamicData?.loaSrNo || matchedItemObj.dynamicData?.sku || '',
      tempCode: matchedItemObj.dynamicData?.tempCode || srTemp || '',
      totalLoaQty: matchedItemObj.dynamicData?.totalLoaQty || matchedItemObj.quantity || 0,
      unit: sr.unit || matchedItemObj.dynamicData?.uom || matchedItemObj.unit || ''
    };
  }

  /**
   * Parses Excel file into site metadata and records per site
   */
  static parseWorkbook(file: Express.Multer.File) {
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
          const val = row[c];
          if (!val) continue;
          const norm = normLabel(val);
          let field = "";
          if (norm.includes("circle")) field = "Circle";
          else if (norm.includes("division") && !norm.includes("sub")) field = "Division";
          else if (norm.includes("sub division") || norm.includes("sub/division") || norm.includes("subdivision")) field = "SubDivision";
          else if (norm.includes("station") || norm.includes("sub station") || norm.includes("sub/station")) field = "SubStation";
          else if (norm.includes("feeder")) field = "Feeder";
          else if (norm.includes("location") || norm.includes("site")) field = "Location";
          else if (norm.includes("drawing") || norm.includes("drg")) field = "DrawingNo";
          else if (norm.includes("contractor") || norm.includes("agency")) field = "Contractor";
          else if (norm.includes("wip number") || norm.includes("wip no") || norm.includes("jmc number") || norm.includes("jmc no")) field = "WipNumber";

          if (field) {
            metaRows[r] = field;
            labelFound = true;
            break;
          }
        }
        if (labelFound) continue;

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
    const lastWip = await WipRegister.findOne({ wipNumber: new RegExp(`^WIP/${currentYearStr}/`) }).sort({ wipNumber: -1 }).select('wipNumber').lean();
    let initialCount = 0;
    if (lastWip && lastWip.wipNumber) {
      const parts = lastWip.wipNumber.split('/');
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
        const wipItems: any[] = [];
        const itemIndexMap = new Map<string, number>();

        let count = 0;
        for (const sr of siteRecords) {
          count++;
          if (count % 50 === 0) await yieldLoop();

          const resolved = this.resolveItem(sr, uploadedCircle, ctx)!;
          const key = `${resolved.itemId.toString()}_${(resolved.activity || '').trim().toLowerCase()}`;

          if (itemIndexMap.has(key)) {
            const idx = itemIndexMap.get(key)!;
            wipItems[idx].claimedQty += sr.quantity;
          } else {
            itemIndexMap.set(key, wipItems.length);
            wipItems.push({
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

        // Compute prevQty from past approved WIPs
        const pastApprovedWips = await WipRegister.find({
          contractorId: contractorId || null, package: pkg, location: loc, circle: circ, division: div, subDivision: subDiv, subStation: subStn, feeder, status: 'Approved'
        }).lean();

        const prevQtyMap: Record<string, number> = {};
        for (const pastWip of pastApprovedWips) {
          for (const item of (pastWip as any).items) {
            if (item.itemId) {
              const idStr = item.itemId.toString();
              prevQtyMap[idStr] = (prevQtyMap[idStr] || 0) + (item.approvedQty || 0);
            }
          }
        }
        for (const item of wipItems) {
          if (item.itemId) item.prevQty = prevQtyMap[item.itemId.toString()] || 0;
        }

        // Match existing WIP by Number or Contractor + Circle + (DrawingNo OR Location)
        let existingWip: any = null;
        if (meta.WipNumber && String(meta.WipNumber).trim() !== '') {
          existingWip = await WipRegister.findOne({ wipNumber: String(meta.WipNumber).trim() });
        }

        if (!existingWip) {
          const isPlaceholderDrawing = (drg: any) => {
            const d = String(drg || '').trim().toLowerCase();
            return !d || d === 'n/a' || d === 'na' || d === '-' || d === 'none' || d === 'null' || d === 'nil';
          };
          const validDrawingNo = !isPlaceholderDrawing(meta.DrawingNo) ? String(meta.DrawingNo).trim() : null;
          const cleanLoc = loc && String(loc).trim() !== '' ? loc.trim() : null;

          const matchCriteria: any = {
            contractorId: contractorId || null,
            circle: new RegExp(`^${circ}$`, 'i'),
          };

          if (cleanLoc && validDrawingNo) {
            const escapedLoc = cleanLoc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            existingWip = await WipRegister.findOne({
              ...matchCriteria,
              location: new RegExp(`^${escapedLoc}$`, 'i'),
              drawingNo: validDrawingNo
            });
          } else if (cleanLoc) {
            const escapedLoc = cleanLoc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            existingWip = await WipRegister.findOne({
              ...matchCriteria,
              location: new RegExp(`^${escapedLoc}$`, 'i')
            });
          } else if (validDrawingNo) {
            existingWip = await WipRegister.findOne({
              ...matchCriteria,
              drawingNo: validDrawingNo
            });
          }
        }

        if (existingWip) {
          if (conflictStrategy === 'skip') {
            flagged.push({ sourceFile, issue: `Skipped duplicate WIP for ${circ} - ${subDiv} - ${loc}` });
            colIdx++;
            continue;
          } else if (conflictStrategy === 'replace') {
            if (existingWip.status !== 'Approved') {
              await WipRegister.deleteOne({ _id: existingWip._id });
            } else {
              flagged.push({ sourceFile, issue: `Cannot replace Approved WIP for ${circ} - ${subDiv} - ${loc}` });
              colIdx++;
              continue;
            }
          } else if (conflictStrategy === 'update') {
            if (existingWip.status !== 'Approved') {
              if (meta.DrawingNo && !existingWip.drawingNo) existingWip.drawingNo = String(meta.DrawingNo).trim();
              if (subStn && !existingWip.subStation) existingWip.subStation = subStn;
              if (feeder && !existingWip.feeder) existingWip.feeder = feeder;
              for (const newItem of wipItems) {
                const existingItem = existingWip.items.find((i: any) => 
                  (i.itemId && newItem.itemId && i.itemId.toString() === newItem.itemId.toString()) ||
                  (!i.itemId && !newItem.itemId && i.description === newItem.description && i.activity === newItem.activity)
                );
                if (existingItem) {
                  // Replace claimed quantity instead of adding to avoid doubling
                  existingItem.claimedQty = newItem.claimedQty || 0;
                } else {
                  existingWip.items.push(newItem);
                }
              }
              await existingWip.save();
              totalSaved++;
              colIdx++;
              continue;
            } else {
              flagged.push({ sourceFile, issue: `Cannot update Approved WIP for ${circ} - ${subDiv} - ${loc}` });
              colIdx++;
              continue;
            }
          }
        }

        const existingWipNo = meta.WipNumber || null;

        if (existingWipNo) {
          await WipRegister.findOneAndUpdate({ wipNumber: existingWipNo }, {
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
              items: wipItems,
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
              const wipNumber = `WIP/${currentYearStr}/${initialCount.toString().padStart(4, '0')}`;

              await WipRegister.create({
                wipNumber,
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
                items: wipItems,
                claimedAmount: 0,
                approvedAmount: 0,
                status: 'Submitted',
                remarks: `Uploaded from ${sourceFile} (${sheetName}). ${!meta.Contractor ? 'Warning: No contractor name found in sheet.' : ''}`.trim(),
                createdBy: user._id
              });
              saved = true;
            } catch (err: any) {
              if (err.code === 11000 && err.keyPattern && err.keyPattern.wipNumber) {
                attempts++;
                const latest = await WipRegister.findOne({ wipNumber: new RegExp(`^WIP/${currentYearStr}/`) }).sort({ wipNumber: -1 }).select('wipNumber').lean();
                if (latest && latest.wipNumber) {
                  const parts = latest.wipNumber.split('/');
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
        message: `Successfully imported ${totalSaved} WIP records.`,
        data: { totalSaved, flagged }
      });
    }

    return {
      success: true,
      totalSaved,
      flagged
    };
  }
}
