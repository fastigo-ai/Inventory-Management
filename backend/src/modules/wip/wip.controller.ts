import { Request, Response } from 'express';
import { WipRegister } from './wip.schema';
import { ApiResponse } from '../../core/utils/ApiResponse';
import { ApiError } from '../../core/utils/ApiError';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { Contractor } from '../contractors/contractor.schema';
import Item from '../items/item.model';
import * as xlsx from 'xlsx';
import stringSimilarity from 'string-similarity';
import mongoose from 'mongoose';
import cloudinary from '../../core/utils/cloudinary';
import { sseService } from '../../core/utils/sse.service';

const uploadToCloudinary = (buffer: Buffer, folder: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};

const getNextWipSequence = async (): Promise<{ currentCount: number, yearStr: string }> => {
  const yearStr = new Date().getFullYear().toString().slice(-2);
  const lastDoc = await WipRegister.findOne({ wipNumber: new RegExp(`^WIP/${yearStr}/`) }).sort({ createdAt: -1 });
  let count = 0;
  if (lastDoc && lastDoc.wipNumber) {
    const parts = lastDoc.wipNumber.split('/');
    if (parts.length === 3) {
      count = parseInt(parts[2], 10);
    }
  }
  if (isNaN(count) || count === 0) {
    count = await WipRegister.countDocuments({ wipNumber: new RegExp(`^WIP/${yearStr}/`) });
  }
  return { currentCount: count, yearStr };
};

export const createWip = asyncHandler(async (req: Request, res: Response) => {
  const data = req.body;
  const user = (req as any).user;

  const { currentCount, yearStr } = await getNextWipSequence();
  data.wipNumber = `WIP/${yearStr}/${(currentCount + 1).toString().padStart(4, '0')}`;
  data.createdBy = user._id;

  let drawingSheetUrl = '';
  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer, 'wip_drawings');
    drawingSheetUrl = result.secure_url;
  }

  let items = req.body.items;
  if (typeof items === 'string') {
    try {
      items = JSON.parse(items);
    } catch (err) {
      items = [];
    }
  }

  const payload = {
    ...data,
    items,
    ...(drawingSheetUrl && { drawingSheetUrl })
  };

  const newWip = await WipRegister.create(payload);

  res.status(201).json(
    new ApiResponse(201, newWip, 'WIP Register entry created successfully')
  );
});

export const getWips = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const page = parseInt(req.query.page as string) || 1;
  const limit = req.query.limit === 'all' ? 0 : parseInt(req.query.limit as string) || 30;
  const search = req.query.search as string;
  const filter: any = {};

  const isAdmin = user?.role?.name === 'Admin' || user?.role?.name === 'Super Admin' || user?.role?.permissions?.includes('*');

  if (user && user.role?.name === 'Contractor' && user.contractorId) {
    filter.contractorId = new mongoose.Types.ObjectId(user.contractorId);
  } else if (req.query.contractorId && req.query.contractorId !== 'All') {
    filter.contractorId = new mongoose.Types.ObjectId(req.query.contractorId as string);
  }

  if (!isAdmin && user?.assignedCircle) {
    const SUB_STORE_MAP: Record<string, string[]> = {
      'Solan': ['Solan', 'Kumarhatti', 'Nalagarh'],
      'Nahan': ['Nahan'],
      'Rohru': ['Rohru'],
      'Rampur': ['Rampur'],
    };
    const allowedCircles = SUB_STORE_MAP[user.assignedCircle] || [user.assignedCircle];
    const regexCircles = allowedCircles.map(c => new RegExp(`^${c}$`, 'i'));
    filter.circle = { $in: regexCircles };
  }

  if (req.query.startDate || req.query.endDate) {
    filter.date = {};
    if (req.query.startDate) filter.date.$gte = new Date(req.query.startDate as string);
    if (req.query.endDate) {
      const end = new Date(req.query.endDate as string);
      end.setHours(23, 59, 59, 999);
      filter.date.$lte = end;
    }
  }

  if (req.query.location) filter.location = { $regex: new RegExp(req.query.location as string, 'i') };
  if (req.query.feeder) filter.feeder = { $regex: new RegExp(req.query.feeder as string, 'i') };
  if (req.query.division) filter.division = { $regex: new RegExp(req.query.division as string, 'i') };
  if (req.query.subDivision) filter.subDivision = { $regex: new RegExp(req.query.subDivision as string, 'i') };
  if (req.query.subStation) filter.subStation = { $regex: new RegExp(req.query.subStation as string, 'i') };

  if (search && search.trim() !== '') {
    filter.wipNumber = { $regex: search, $options: 'i' };
  }

  const skip = (page - 1) * limit;

  const [total, wips, aggregateResult] = await Promise.all([
    WipRegister.countDocuments(filter),
    limit > 0 
      ? WipRegister.find(filter)
          .populate('contractorId', 'name vendorName dynamicData')
          .populate('workOrderId', 'workOrderNumber')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
      : WipRegister.find(filter)
          .populate('contractorId', 'name vendorName dynamicData')
          .populate('workOrderId', 'workOrderNumber')
          .sort({ createdAt: -1 })
          .lean(),
    WipRegister.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalClaimed: { $sum: "$claimedAmount" },
          totalApproved: { $sum: "$approvedAmount" },
        }
      }
    ])
  ]);

  const totalPages = limit > 0 ? Math.ceil(total / limit) : 1;
  const aggregates = aggregateResult.length > 0 ? aggregateResult[0] : { totalClaimed: 0, totalApproved: 0 };

  res.status(200).json(
    new ApiResponse(200, {
      data: wips,
      total,
      page,
      limit,
      totalPages,
      aggregates
    }, 'WIP Register entries fetched successfully')
  );
});

export const getWipById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const wip = await WipRegister.findById(id)
    .populate('contractorId', 'name vendorName dynamicData')
    .populate('workOrderId', 'workOrderNumber');

  if (!wip) {
    throw new ApiError(404, 'WIP Register entry not found');
  }

  res.status(200).json(
    new ApiResponse(200, wip, 'WIP Register entry fetched successfully')
  );
});

export const updateWip = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;

  const wip = await WipRegister.findById(id);
  if (!wip) {
    throw new ApiError(404, 'WIP Register entry not found');
  }

  let drawingSheetUrl = '';
  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer, 'wip_drawings');
    drawingSheetUrl = result.secure_url;
  }

  let items = req.body.items;
  if (items && typeof items === 'string') {
    try {
      items = JSON.parse(items);
    } catch (err) {
      items = [];
    }
  }

  const payload = {
    ...data,
    ...(items && { items }),
    ...(drawingSheetUrl && { drawingSheetUrl })
  };

  const updatedWip = await WipRegister.findByIdAndUpdate(
    id,
    payload,
    { new: true, runValidators: true }
  );

  res.status(200).json(
    new ApiResponse(200, updatedWip, 'WIP Register entry updated successfully')
  );
});

export const deleteWip = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const wip = await WipRegister.findByIdAndDelete(id);
  
  if (!wip) {
    throw new ApiError(404, 'WIP Register entry not found');
  }

  res.status(200).json(
    new ApiResponse(200, null, 'WIP Register entry deleted successfully')
  );
});


const METADATA_LABELS: Record<string, string> = {
  "Name Of Circle :": "Circle",
  "Name Of Division :": "Division",
  "Name Of Sub/Division :": "SubDivision",
  "Name Of Sub/Station :": "SubStation",
  "Name Of Feeder :": "Feeder",
  "Location :": "Location",
  "Drawing No :": "DrawingNo",
  "Name of Contractor": "Contractor",
  "WIP Number :": "WipNumber",
};

function normLabel(v: any): string {
  if (!v) return "";
  return String(v).trim().replace(/:$/, "").trim().toLowerCase();
}


export const uploadWipExcel = asyncHandler(async (req: Request, res: Response) => {
  const clientId = (req.query.clientId as string) || (req.body.clientId as string);
  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    if (clientId) {
      sseService.sendEvent(clientId, { stage: 'started', progress: 0, message: 'WIP Bulk Import Started' });
    }
    return res.status(400).json(new ApiResponse(400, null, 'No files uploaded'));
  }

  const user = (req as any).user;
  const conflictStrategy = req.body.conflictStrategy || 'skip';
  const files = req.files as Express.Multer.File[];

  if (clientId) {
    sseService.sendEvent(clientId, { stage: 'started', progress: 0, message: 'WIP Bulk Import Started' });
    await new Promise(r => setTimeout(r, 50));
    sseService.sendEvent(clientId, { stage: 'parsing', progress: 5, message: 'Fetching metadata...' });
    await new Promise(r => setTimeout(r, 50));
  }

  const flagged: any[] = [];
  let totalSaved = 0;

  // Pre-fetch all contractors and items for matching
  const allContractors = await Contractor.find({}).lean();
  const contractorNames = allContractors.map((c: any) => c.name || c.dynamicData?.companyName || c.dynamicData?.displayName || c.dynamicData?.name).filter(Boolean);
  
  const allItems = await Item.find({}).lean();
  const itemsByLoa = new Map<string, any[]>();
  const itemsByTempCode = new Map<string, any[]>();
  for (const item of allItems) {
    const sku = String(item.dynamicData?.sku || item.dynamicData?.loaSrNo || '').toLowerCase().trim();
    if (sku) {
      if (!itemsByLoa.has(sku)) itemsByLoa.set(sku, []);
      itemsByLoa.get(sku)?.push(item);
    }
    const tempCode = String(item.dynamicData?.tempCode || item.rawItem?.tempCode || '').toLowerCase().trim();
    if (tempCode) {
      if (!itemsByTempCode.has(tempCode)) itemsByTempCode.set(tempCode, []);
      itemsByTempCode.get(tempCode)?.push(item);
    }
  }

  let { currentCount: initialCount, yearStr } = await getNextWipSequence();

  // Helper Functions for Pass 1
  const parseFile = (file: Express.Multer.File) => {
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
             else if (norm.includes("wip number") || norm.includes("wip no")) field = "WipNumber";
             
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
        flagged.push({ sourceFile, sheetName, issue: "Could not find 'LOA SR.NO.' header row - skipped" });
        sheets.push({ skipped: true });
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

      if (!globalMeta['Contractor']) {
        for (let r = 0; r < Math.min(30, rows.length); r++) {
          const row = rows[r];
          if (!row) continue;
          for (let c = 0; c < row.length; c++) {
            if (row[c] && typeof row[c] === 'string') {
              const norm = normLabel(row[c]);
              if (norm.includes('contractor') || norm.includes('agency')) {
                if (row[c].includes(':')) {
                  const parts = row[c].split(':');
                  if (parts.length > 1 && parts[1].trim()) {
                    globalMeta['Contractor'] = parts.slice(1).join(':').trim();
                    break;
                  }
                }
                for (let scanC = c + 1; scanC < row.length; scanC++) {
                  if (row[scanC] && String(row[scanC]).trim()) {
                    globalMeta['Contractor'] = String(row[scanC]).trim();
                    break;
                  }
                }
              }
            }
            if (globalMeta['Contractor']) break;
          }
          if (globalMeta['Contractor']) break;
        }
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
      for (const c of siteCols) {
        recordsBySite[c] = [];
      }

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
          if (!isNaN(numQty)) {
            recordsBySite[c].push({
              rowNum: r + 1, loa, tempCode: tempCodeVal, sched, activity: activity || currentActivityGroup, description: desc || activity, unit, quantity: numQty
            });
          }
        }
      }

      sheets.push({ sourceFile, sheetName, siteCols, siteMeta, recordsBySite, skipped: false });
    }
    return sheets;
  };

  const resolveItem = (sr: any, uploadedCircle: string) => {
    const formatMatch = (itemObj: any) => ({
      itemId: itemObj._id,
      loaSerialNo: itemObj.dynamicData?.sku || itemObj.dynamicData?.loaSrNo || '',
      loaSrNo: itemObj.dynamicData?.sku || itemObj.dynamicData?.loaSrNo || '',
      tempCode: itemObj.dynamicData?.tempCode || itemObj.rawItem?.tempCode || '',
      totalLoaQty: Number(itemObj.dynamicData?.loaQty || itemObj.dynamicData?.loaQuantity || itemObj.dynamicData?.totalLoaQuantity || itemObj.dynamicData?.qty || itemObj.dynamicData?.quantity || 0),
      activity: itemObj.dynamicData?.activity || sr.activity || '',
      unit: itemObj.dynamicData?.uom || itemObj.dynamicData?.unit || itemObj.uom || itemObj.unit || sr.unit || ''
    });

    const sheetSku = String(sr.loa || '').toLowerCase().trim();
    const sheetTempCode = String(sr.tempCode || '').toLowerCase().trim();
    const sheetCircle = (uploadedCircle || '').toLowerCase().trim();
    let candidateItems: any[] = [];
    
    if (sheetSku) {
      const matches = itemsByLoa.get(sheetSku);
      if (matches && matches.length > 0) candidateItems = matches;
    }

    if (candidateItems.length === 0 && sheetTempCode) {
      const matches = itemsByTempCode.get(sheetTempCode);
      if (matches && matches.length > 0) candidateItems = matches;
    }

    if (candidateItems.length === 0) return null;

    let matchedItemObj = candidateItems.find((item: any) => {
      const itemCircle = (item.dynamicData?.circle || '').toLowerCase().trim();
      return itemCircle === sheetCircle || itemCircle.includes(sheetCircle) || sheetCircle.includes(itemCircle);
    });

    if (!matchedItemObj) matchedItemObj = candidateItems[0];

    if (matchedItemObj) {
      // We no longer throw an error on Activity mismatch.
      // formatMatch will automatically auto-populate the correct activity from the Master item.
      return formatMatch(matchedItemObj);
    }
    return null;
  };

  const yieldLoop = () => new Promise(resolve => setImmediate(resolve));

  // --- PASS 1: Validate everything ---
  const validationErrors: { sourceFile: string; sheetName: string; description: string; circle: string; row?: number }[] = [];
  const parsedSheets: any[] = [];
  const totalFiles = files.length;
  let fileIdx = 0;

  for (const file of files) {
    try {
      if (clientId) {
        sseService.sendEvent(clientId, { 
          stage: 'parsing', 
          progress: 10 + (fileIdx / totalFiles) * 20, 
          message: `Reading file ${fileIdx + 1} of ${totalFiles}: ${file.originalname}...` 
        });
      }
      
      const sheets = parseFile(file);
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
          
          if (user.assignedCircle && meta.Circle) {
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
              return res.status(403).json(new ApiResponse(403, null, `Permission Denied: You are assigned to circle '${user.assignedCircle}', but the sheet '${sheetName}' contains data for circle '${meta.Circle}'. Please upload sheets only for your assigned circle (Allowed: ${allowedCircles.join(', ')}).`));
            }
          }
          
          const uploadedCircle = user.assignedCircle || meta.Circle || '';
          const seenItems = new Map<string, number>();

          let count = 0;
          for (const sr of recordsBySite[c]) {
            count++;
            if (count % 50 === 0) await yieldLoop();
            
            const resolved = resolveItem(sr, uploadedCircle);
            if (!resolved) {
              validationErrors.push({
                sourceFile,
                sheetName,
                description: `Row ${sr.rowNum}: ${sr.description || sr.activity || 'Unknown item'} (Not found in Master)`,
                circle: uploadedCircle,
                row: sr.rowNum
              });
            } else if ('error' in resolved) {
              validationErrors.push({
                sourceFile,
                sheetName,
                description: `Row ${sr.rowNum}: ${sr.description || sr.activity || 'Unknown item'} - ${resolved.error}`,
                circle: uploadedCircle,
                row: sr.rowNum
              });
            } else {
              const idStr = (resolved as any).itemId.toString();
              if (seenItems.has(idStr)) {
                validationErrors.push({
                  sourceFile,
                  sheetName,
                  description: `Row ${sr.rowNum}: Duplicate item found. This item was already listed on row ${seenItems.get(idStr)}.`,
                  circle: uploadedCircle,
                  row: sr.rowNum
                });
              } else {
                seenItems.set(idStr, sr.rowNum);
              }
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

  // If ANY item failed validation, stop. Return errors, save nothing.
  if (validationErrors.length > 0) {
    const uniqueErrors = validationErrors.filter((e, idx, arr) =>
      arr.findIndex(x => x.description === e.description && x.circle === e.circle) === idx
    );
    return res.status(400).json({
      success: false,
      message: `Import rejected: ${uniqueErrors.length} item(s) not found in Master Item List. Nothing was saved.`,
      data: {
        totalSaved: 0,
        missingItems: uniqueErrors.map(e => ({
          file: e.sourceFile,
          sheet: e.sheetName,
          description: e.description,
          circle: e.circle,
          row: e.row
        }))
      }
    });
  }

  // --- PASS 2: Save everything ---
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
      const pkg = user.assignedPackage || meta.Location || meta.DrawingNo || '';
      const circ = user.assignedCircle || meta.Circle || '';
      const subCirc = meta.SubCircle || '';
      const div = meta.Division || '';
      const subDiv = meta.SubDivision || '';
      const loc = meta.Location || '';
      const subStn = meta.SubStation || '';
      const feeder = meta.Feeder || '';
      const uploadedCircle = circ; // Match Pass 1 logic to prevent 'itemId of null' errors

      let contractorId = null;
      const contractorNameStr = meta.Contractor ? String(meta.Contractor) : "";
      if (contractorNameStr && contractorNames.length > 0) {
        const bestMatch = stringSimilarity.findBestMatch(contractorNameStr, contractorNames);
        if (bestMatch.bestMatch.rating > 0.4) {
          const matchedContractor = allContractors.find((c: any) => {
            const name = c.name || c.dynamicData?.companyName || c.dynamicData?.displayName || c.dynamicData?.name;
            return name === bestMatch.bestMatch.target;
          });
          if (matchedContractor) contractorId = matchedContractor._id;
        }
      }

      if (!contractorId) {
        const siteHeader = meta.Location || meta.SubStation || meta.Division || meta.Circle || `Column ${c}`;
        return res.status(400).json(new ApiResponse(400, null, `Validation Error in sheet '${sheetName}' (Site: ${siteHeader}): Contractor '${contractorNameStr || 'Unknown'}' not found in the database. Please add this contractor first before importing.`));
      }

      const wipItems: any[] = [];
      let count = 0;
      for (const sr of siteRecords) {
        count++;
        if (count % 50 === 0) await yieldLoop();
        
        const resolved = resolveItem(sr, uploadedCircle)!;
        const resObj: any = resolved;
        wipItems.push({
          itemId: resObj.itemId,
          loaSerialNo: resObj.loaSerialNo,
          loaSrNo: resObj.loaSrNo,
          tempCode: resObj.tempCode,
          totalLoaQty: resObj.totalLoaQty,
          activity: resObj.activity,
          description: sr.description || '',
          unit: resObj.unit || sr.unit || '',
          prevQty: 0,
          claimedQty: sr.quantity,
          approvedQty: 0,
          remarks: ''
        });
      }

      const pastApprovedWips = await WipRegister.find({
        contractorId: contractorId || null, package: pkg, location: loc, circle: circ, division: div, subDivision: subDiv, subStation: subStn, feeder, status: 'Approved'
      }).lean();

      const prevQtyMap: Record<string, number> = {};
      for (const pastWip of pastApprovedWips) {
        for (const item of pastWip.items) {
          if (item.itemId) {
            const idStr = item.itemId.toString();
            prevQtyMap[idStr] = (prevQtyMap[idStr] || 0) + (item.approvedQty || 0);
          }
        }
      }
      for (const item of wipItems) {
        if (item.itemId) item.prevQty = prevQtyMap[item.itemId.toString()] || 0;
      }

      const existingWipNo = meta.WipNumber || null;
      let existingWip = null;
      
      if (existingWipNo) {
         existingWip = await WipRegister.findOne({ wipNumber: existingWipNo });
      } else {
         existingWip = await WipRegister.findOne({ 
            contractorId: contractorId || null, 
            package: pkg, 
            drawingNo: meta.DrawingNo,
            location: loc, 
            circle: circ, 
            division: div, 
            subDivision: subDiv, 
            subStation: subStn, 
            feeder 
         });
      }

      if (existingWip) {
        if (conflictStrategy === 'skip') {
          flagged.push({ sourceFile, issue: `Skipped duplicate WIP for ${circ} - ${subDiv} - ${loc}` });
          continue;
        } else if (conflictStrategy === 'replace') {
          if (existingWip.status !== 'Approved') {
            await WipRegister.deleteOne({ _id: existingWip._id });
            existingWip = null;
          } else {
            flagged.push({ sourceFile, issue: `Cannot replace Approved WIP for ${circ} - ${subDiv} - ${loc}` });
            continue;
          }
        } else if (conflictStrategy === 'update') {
          if (existingWip.status !== 'Approved') {
            for (const newItem of wipItems) {
              const existingItem = existingWip.items.find((i: any) => 
                (i.itemId && newItem.itemId && i.itemId.toString() === newItem.itemId.toString()) ||
                (!i.itemId && !newItem.itemId && i.description === newItem.description && i.activity === newItem.activity)
              );
              if (existingItem) {
                existingItem.claimedQty = (existingItem.claimedQty || 0) + (newItem.claimedQty || 0);
              } else {
                existingWip.items.push(newItem);
              }
            }
            await existingWip.save();
            totalSaved++;
            continue;
          } else {
            flagged.push({ sourceFile, issue: `Cannot update Approved WIP for ${circ} - ${subDiv} - ${loc}` });
            continue;
          }
        }
      }

      if (existingWipNo && !existingWip) {
        await WipRegister.findOneAndUpdate({ wipNumber: existingWipNo }, {
          $set: {
            date: new Date(),
            contractorId: contractorId || null,
            package: pkg, 
            drawingNo: meta.DrawingNo,
            location: loc, 
            circle: circ, 
            division: div, 
            subDivision: subDiv, 
            subStation: subStn, 
            feeder,
            items: wipItems,
            remarks: `Updated via Bulk Upload from ${sourceFile} (${sheetName}).`,
          }
        }, { upsert: true });
      } else {
        let saved = false;
        let attempts = 0;
        while (!saved && attempts < 10) {
          try {
            initialCount++;
            const wipNumber = `WIP/${yearStr}/${initialCount.toString().padStart(4, '0')}`;

            await WipRegister.create({
              wipNumber,
              date: new Date(),
              contractorId: contractorId || null,
              package: pkg,
              drawingNo: meta.DrawingNo,
              location: loc, circle: circ, division: div, subDivision: subDiv, subStation: subStn, feeder,
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
              const latest = await WipRegister.findOne({ wipNumber: new RegExp(`^WIP/${yearStr}/`) }).sort({ wipNumber: -1 }).select('wipNumber').lean();
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

  return res.status(200).json(new ApiResponse(200, { totalSaved, flagged }, `Successfully imported ${totalSaved} WIP records.`));
});
