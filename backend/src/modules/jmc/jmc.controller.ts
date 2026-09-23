import { Request, Response } from 'express';
import { JmcRegister } from './jmc.schema';
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


export const createJmc = asyncHandler(async (req: Request, res: Response) => {
  const data = req.body;
  const user = (req as any).user;

  const currentYearStr = new Date().getFullYear().toString().slice(-2);
  const lastJmc = await JmcRegister.findOne({ jmcNumber: new RegExp(`^JMC/${currentYearStr}/`) }).sort({ jmcNumber: -1 }).select('jmcNumber').lean();
  let count = 0;
  if (lastJmc && lastJmc.jmcNumber) {
    const parts = lastJmc.jmcNumber.split('/');
    if (parts.length === 3) {
      count = parseInt(parts[2], 10) || 0;
    }
  }
  data.jmcNumber = `JMC/${currentYearStr}/${(count + 1).toString().padStart(4, '0')}`;
  data.createdBy = user._id;

  let drawingSheetUrl = '';
  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer, 'jmc_drawings');
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

  // VALIDATION FIX: Ensure claimedQty does not exceed cumulative MIN issuedQty
  if (data.contractorId && items && items.length > 0) {
    const itemIds = items.map((i: any) => i.itemId).filter(Boolean).map((id: string) => new mongoose.Types.ObjectId(id));
    if (itemIds.length > 0) {
      // 1. Get total MIN issued qty for this contractor and these items
      const minRecords = await mongoose.model('ContractorAssignment').find({
        contractorId: new mongoose.Types.ObjectId(data.contractorId),
        status: { $ne: 'Cancelled' },
        'lineItems.itemId': { $in: itemIds }
      }).lean();

      const issuedMap = new Map<string, number>();
      minRecords.forEach((record: any) => {
        record.lineItems.forEach((li: any) => {
          if (li.itemId) {
             const idStr = li.itemId.toString();
             issuedMap.set(idStr, (issuedMap.get(idStr) || 0) + (li.quantity || 0));
          }
        });
      });

      // 2. Get total JMC claimed qty for this contractor and these items
      const pastJmcs = await JmcRegister.find({
        contractorId: new mongoose.Types.ObjectId(data.contractorId),
        status: { $ne: 'Rejected' },
        'items.itemId': { $in: itemIds }
      }).lean();

      const claimedMap = new Map<string, number>();
      pastJmcs.forEach((jmc: any) => {
        jmc.items.forEach((i: any) => {
          if (i.itemId) {
            const idStr = i.itemId.toString();
            const qty = jmc.status === 'Approved' ? Number(i.approvedQty || 0) : Number(i.claimedQty || 0);
            claimedMap.set(idStr, (claimedMap.get(idStr) || 0) + qty);
          }
        });
      });

      // 3. Validate
      for (const item of items) {
        if (!item.itemId) continue;
        const idStr = item.itemId.toString();
        const issued = issuedMap.get(idStr) || 0;
        const claimed = claimedMap.get(idStr) || 0;
        const newClaim = Number(item.claimedQty || 0);

        if (claimed + newClaim > issued) {
           throw new ApiError(400, `Validation Error for Activity "${item.activity || 'Unknown'}": Cannot claim ${newClaim} units. Contractor has only been issued ${issued} units total, and ${claimed} units were already claimed. Max allowed claim is ${Math.max(0, issued - claimed)}.`);
        }
      }
    }
  }

  const payload = {
    ...data,
    items,
    ...(drawingSheetUrl && { drawingSheetUrl })
  };

  const newJmc = await JmcRegister.create(payload);

  res.status(201).json(
    new ApiResponse(201, newJmc, 'JMC Register entry created successfully')
  );
});

export const getJmcs = asyncHandler(async (req: Request, res: Response) => {
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
    if (req.query.startDate) {
      filter.date.$gte = new Date(req.query.startDate as string);
    }
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
  if (req.query.drawingNo) filter.drawingNo = { $regex: new RegExp(req.query.drawingNo as string, 'i') };

  if (search && search.trim() !== '') {
    filter.jmcNumber = { $regex: search, $options: 'i' };
  }

  const skip = (page - 1) * limit;

  const [total, jmcs, aggregateResult] = await Promise.all([
    JmcRegister.countDocuments(filter),
    limit > 0 
      ? JmcRegister.find(filter)
          .populate('contractorId', 'name vendorName dynamicData')
          .populate('workOrderId', 'workOrderNumber')
          .populate('items.itemId')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
      : JmcRegister.find(filter)
          .populate('contractorId', 'name vendorName dynamicData')
          .populate('workOrderId', 'workOrderNumber')
          .populate('items.itemId')
          .sort({ createdAt: -1 })
          .lean(),
    JmcRegister.aggregate([
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
      data: jmcs,
      total,
      page,
      limit,
      totalPages,
      aggregates
    }, 'JMC Register entries fetched successfully')
  );
});

export const getJmcById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const jmc = await JmcRegister.findById(id)
    .populate('contractorId', 'name vendorName dynamicData')
    .populate('workOrderId', 'workOrderNumber');

  if (!jmc) {
    throw new ApiError(404, 'JMC Register entry not found');
  }

  res.status(200).json(
    new ApiResponse(200, jmc, 'JMC Register entry fetched successfully')
  );
});

export const updateJmc = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;

  const jmc = await JmcRegister.findById(id);
  if (!jmc) {
    throw new ApiError(404, 'JMC Register entry not found');
  }

  let drawingSheetUrl = '';
  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer, 'jmc_drawings');
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

  // VALIDATION FIX: Ensure claimedQty does not exceed cumulative MIN issuedQty
  const targetContractorId = data.contractorId || jmc.contractorId;
  if (targetContractorId && items && items.length > 0) {
    const itemIds = items.map((i: any) => i.itemId).filter(Boolean).map((itemId: string) => new mongoose.Types.ObjectId(itemId));
    if (itemIds.length > 0) {
      // 1. Get total MIN issued qty for this contractor and these items
      const minRecords = await mongoose.model('ContractorAssignment').find({
        contractorId: new mongoose.Types.ObjectId(targetContractorId),
        status: { $ne: 'Cancelled' },
        'lineItems.itemId': { $in: itemIds }
      }).lean();

      const issuedMap = new Map<string, number>();
      minRecords.forEach((record: any) => {
        record.lineItems.forEach((li: any) => {
          if (li.itemId) {
             const idStr = li.itemId.toString();
             issuedMap.set(idStr, (issuedMap.get(idStr) || 0) + (li.quantity || 0));
          }
        });
      });

      // 2. Get total JMC claimed qty for this contractor and these items (excluding current JMC)
      const pastJmcs = await JmcRegister.find({
        _id: { $ne: new mongoose.Types.ObjectId(id as string) },
        contractorId: new mongoose.Types.ObjectId(targetContractorId as string),
        status: { $ne: 'Rejected' },
        'items.itemId': { $in: itemIds }
      }).lean();

      const claimedMap = new Map<string, number>();
      pastJmcs.forEach((pastJmc: any) => {
        pastJmc.items.forEach((i: any) => {
          if (i.itemId) {
            const idStr = i.itemId.toString();
            const qty = pastJmc.status === 'Approved' ? Number(i.approvedQty || 0) : Number(i.claimedQty || 0);
            claimedMap.set(idStr, (claimedMap.get(idStr) || 0) + qty);
          }
        });
      });

      // 3. Validate
      for (const item of items) {
        if (!item.itemId) continue;
        const idStr = item.itemId.toString();
        const issued = issuedMap.get(idStr) || 0;
        const claimed = claimedMap.get(idStr) || 0;
        const newClaim = Number(item.claimedQty || 0);

        if (claimed + newClaim > issued) {
           throw new ApiError(400, `Validation Error for Activity "${item.activity || 'Unknown'}": Cannot claim ${newClaim} units. Contractor has only been issued ${issued} units total, and ${claimed} units were already claimed. Max allowed claim is ${Math.max(0, issued - claimed)}.`);
        }
      }
    }
  }

  const payload = {
    ...data,
    ...(items && { items }),
    ...(drawingSheetUrl && { drawingSheetUrl })
  };

  const updatedJmc = await JmcRegister.findByIdAndUpdate(
    id,
    payload,
    { new: true, runValidators: true }
  );

  res.status(200).json(
    new ApiResponse(200, updatedJmc, 'JMC Register entry updated successfully')
  );
});

export const deleteJmc = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const jmc = await JmcRegister.findByIdAndDelete(id);
  
  if (!jmc) {
    throw new ApiError(404, 'JMC Register entry not found');
  }

  res.status(200).json(
    new ApiResponse(200, null, 'JMC Register entry deleted successfully')
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
  "JMC Number :": "JmcNumber",
};

function normLabel(v: any): string {
  if (!v) return "";
  return String(v).replace(/\s+/g, ' ').trim().replace(/:$/, "").trim().toLowerCase();
}

export const uploadJmcExcel = asyncHandler(async (req: Request, res: Response) => {
  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    return res.status(400).json(new ApiResponse(400, null, 'No files uploaded'));
  }

  const user = (req as any).user;
  const conflictStrategy = req.body.conflictStrategy || 'skip';
  const clientId = req.body.clientId;

  if (clientId) {
    sseService.sendEvent(clientId, { stage: 'parsing', progress: 5, message: 'Fetching metadata...' });
  }

  // Pre-fetch all contractors and items for matching
  const allContractors = await Contractor.find({}).lean();
  const contractorNames = allContractors.map((c: any) => c.name || c.dynamicData?.companyName || c.dynamicData?.displayName || c.dynamicData?.name).filter(Boolean);
  
  const allItems = await Item.find({}).lean();

  const itemsByTempCode = new Map<string, any[]>();
  const itemsByLoa = new Map<string, any[]>();
  const itemsByCircle = new Map<string, any[]>();
  const itemsByDescription = new Map<string, any[]>();
  
  for (const item of allItems) {
    const tempCode = String(item.dynamicData?.tempCode || '').trim().toLowerCase();
    if (tempCode) {
      if (!itemsByTempCode.has(tempCode)) itemsByTempCode.set(tempCode, []);
      itemsByTempCode.get(tempCode)?.push(item);
    }
    const loa = String(item.dynamicData?.sku || item.dynamicData?.loaSrNo || '').trim().toLowerCase();
    if (loa) {
      if (!itemsByLoa.has(loa)) itemsByLoa.set(loa, []);
      itemsByLoa.get(loa)?.push(item);
    }
    const circle = String(item.dynamicData?.circle || '').trim().toLowerCase();
    if (circle) {
      if (!itemsByCircle.has(circle)) itemsByCircle.set(circle, []);
      itemsByCircle.get(circle)?.push(item);
    }
    const desc = String(item.dynamicData?.description || item.dynamicData?.name || '').trim().toLowerCase();
    if (desc) {
      if (!itemsByDescription.has(desc)) itemsByDescription.set(desc, []);
      itemsByDescription.get(desc)?.push(item);
    }
  }

  // ——— HELPER: parse one file into structured site-records —————————————————â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const parseFile = (file: any) => {
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
          if (!isNaN(numQty)) {
            recordsBySite[c].push({
              rowNum: r + 1, loa, tempCode: tempCodeVal, sched, activity: activity || currentActivityGroup, description: desc || activity, unit, quantity: numQty
            });
          }
        }
      }

      sheets.push({ sourceFile, sheetName, siteCols, siteMeta, recordsBySite });
    }

    return sheets;
  };

  // ——— HELPER: resolve an item ———————————————————————————————————————
  const resolveItem = (sr: any, uploadedCircle: string): { error?: string; itemId?: any; activity?: string; loaSerialNo?: string; loaSrNo?: string; tempCode?: string; totalLoaQty?: number; unit?: string } | null => {
    const uc = uploadedCircle ? uploadedCircle.toLowerCase() : '';
    let matchedItemObj: any = null;

    const formatMatch = (item: any) => ({
      itemId: item._id, 
      activity: item.dynamicData?.activity || sr.activity || '', 
      loaSerialNo: item.dynamicData?.sku || item.dynamicData?.loaSrNo || sr.loaSerialNo || '',
      loaSrNo: item.dynamicData?.sku || item.dynamicData?.loaSrNo || sr.loaSerialNo || '',
      tempCode: item.dynamicData?.tempCode || item.rawItem?.tempCode || sr.tempCode || '',
      totalLoaQty: Number(item.dynamicData?.loaQty || item.dynamicData?.loaQuantity || item.dynamicData?.totalLoaQuantity || item.dynamicData?.qty || item.dynamicData?.quantity || 0),
      unit: item.dynamicData?.uom || item.dynamicData?.unit || item.uom || item.unit || sr.unit || ''
    });
    
    // Fuzzy string helper (removes all non-alphanumeric characters)
    const fuzzy = (str: any) => String(str || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    const srLoa = String(sr.loaSerialNo || sr.loa || '').trim().toLowerCase();
    const srTemp = String(sr.tempCode || '').trim().toLowerCase();
    const srDescFuzzy = fuzzy(sr.description || sr.itemDescription || '');

    let candidateItems: any[] = [];
    
    // First gather all potential candidates from the circle (or all if circle is empty)
    if (srLoa && itemsByLoa.has(srLoa)) {
      candidateItems = candidateItems.concat(itemsByLoa.get(srLoa) || []);
    }
    if (srTemp && itemsByTempCode.has(srTemp)) {
      candidateItems = candidateItems.concat(itemsByTempCode.get(srTemp) || []);
    }
    if (sr.description) {
      const descMatches = itemsByDescription.get(String(sr.description).trim().toLowerCase()) || [];
      candidateItems = candidateItems.concat(descMatches);
    }
    
    // If we couldn't find candidates by exact lookup maps, we need to search the circle manually
    if (candidateItems.length === 0 && itemsByCircle.has(uc)) {
       candidateItems = itemsByCircle.get(uc) || [];
    }

    // Filter to just the relevant circle
    if (uc) {
       candidateItems = candidateItems.filter(i => {
         const itemCircle = String(i.dynamicData?.circle || '').toLowerCase();
         return itemCircle === uc || itemCircle.includes(uc) || uc.includes(itemCircle);
       });
    }

    // 1. Strict Match: TempCode AND LOA
    if (!matchedItemObj && srTemp && srLoa) {
       matchedItemObj = candidateItems.find(i => {
           const iTemp = String(i.dynamicData?.tempCode || i.rawItem?.tempCode || '').trim().toLowerCase();
           const iLoa = String(i.dynamicData?.sku || i.dynamicData?.loaSrNo || '').trim().toLowerCase();
           return iTemp === srTemp && iLoa === srLoa;
       });
    }

    // 2. TempCode AND Fuzzy Description
    if (!matchedItemObj && srTemp && srDescFuzzy) {
       matchedItemObj = candidateItems.find(i => {
           const iTemp = String(i.dynamicData?.tempCode || i.rawItem?.tempCode || '').trim().toLowerCase();
           const iDescFuzzy = fuzzy(i.dynamicData?.description || i.dynamicData?.name);
           return iTemp === srTemp && iDescFuzzy === srDescFuzzy;
       });
    }

    // 3. LOA AND Fuzzy Description
    if (!matchedItemObj && srLoa && srDescFuzzy) {
       matchedItemObj = candidateItems.find(i => {
           const iLoa = String(i.dynamicData?.sku || i.dynamicData?.loaSrNo || '').trim().toLowerCase();
           const iDescFuzzy = fuzzy(i.dynamicData?.description || i.dynamicData?.name);
           return iLoa === srLoa && iDescFuzzy === srDescFuzzy;
       });
    }

    // 4. LOA ONLY (prioritized over pure description)
    if (!matchedItemObj && srLoa) {
       matchedItemObj = candidateItems.find(i => {
           const iLoa = String(i.dynamicData?.sku || i.dynamicData?.loaSrNo || '').trim().toLowerCase();
           return iLoa === srLoa;
       });
    }

    // 5. Fuzzy Description ONLY
    // Only fallback to description if the sheet row didn't provide an LOA, or as an absolute last resort if we still want to guess (but guessing causes duplicate errors if LOAs differ).
    // To prevent duplicate errors when LOAs differ, we will ONLY match by description if the row doesn't have an LOA.
    if (!matchedItemObj && srDescFuzzy && !srLoa) {
       matchedItemObj = candidateItems.find(i => {
           const iDescFuzzy = fuzzy(i.dynamicData?.description || i.dynamicData?.name);
           return iDescFuzzy === srDescFuzzy;
       });
    }

    if (matchedItemObj) {
      // We no longer throw an error on Activity mismatch.
      // formatMatch will automatically auto-populate the correct activity from the Master item.
      return formatMatch(matchedItemObj);
    }

    return null;
  };

  // Helper to yield event loop
  const yieldLoop = () => new Promise(resolve => setImmediate(resolve));

  const validationErrors: { sourceFile: string; sheetName: string; description: string; circle: string; row?: number }[] = [];
  const parsedSheets: any[] = [];
  const totalFiles = req.files ? (req.files as any[]).length : 0;
  let fileIdx = 0;

  for (const file of (req.files as any[])) {
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
          
          if (!meta.DrawingNo || String(meta.DrawingNo).trim() === '') {
            const siteHeader = meta.Location || meta.SubStation || meta.Division || meta.Circle || `Column ${c}`;
            return res.status(400).json(new ApiResponse(400, null, `Validation Error in sheet '${sheetName}' (Site: ${siteHeader}): 'Drawing No' is mandatory but was not found in the header metadata.`));
          }
          
          if ((user as any).assignedCircle && meta.Circle) {
            const assigned = String((user as any).assignedCircle).trim().toLowerCase();
            const sheetCirc = String(meta.Circle).trim().toLowerCase();
            
            const SUB_STORE_MAP: Record<string, string[]> = {
              'solan': ['solan', 'kumarhatti', 'nalagarh'],
              'nahan': ['nahan'],
              'rohru': ['rohru'],
              'rampur': ['rampur'],
            };
            
            const allowedCircles = SUB_STORE_MAP[assigned] || [assigned];
            if (!allowedCircles.includes(sheetCirc)) {
              return res.status(403).json(new ApiResponse(403, null, `Permission Denied: You are assigned to circle '${(user as any).assignedCircle}', but the sheet '${sheetName}' contains data for circle '${meta.Circle}'. Please upload sheets only for your assigned circle (Allowed: ${allowedCircles.join(', ')}).`));
            }
          }
          
          const uploadedCircle = (user as any).assignedCircle || meta.Circle || '';
          
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
            } else if (resolved.error) {
              validationErrors.push({
                sourceFile,
                sheetName,
                description: `Row ${sr.rowNum}: ${sr.description || sr.activity || 'Unknown item'} - ${resolved.error}`,
                circle: uploadedCircle,
                row: sr.rowNum
              });
            } else {
              const idStr = resolved.itemId.toString();
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

  // If ANY item failed validation â€” stop. Return errors, save nothing.
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

  // ——— PASS 2: All validated — now save ————————————————————————————————————
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
      const pkg = (user as any).assignedPackage || meta.Location || meta.DrawingNo || '';
      const circ = (user as any).assignedCircle || meta.Circle || '';
      const subCirc = meta.SubCircle || '';
      const div = meta.Division || '';
      const subDiv = meta.SubDivision || '';
      const loc = meta.Location || '';
      const subStn = meta.SubStation || '';
      const feeder = meta.Feeder || '';
      const uploadedCircle = circ; // Match Pass 1 logic to prevent 'itemId of null' errors

      // Resolve contractor
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

      // Build items (all will resolve since pass 1 validated them)
      const jmcItems: any[] = [];
      let count = 0;
      for (const sr of siteRecords) {
        count++;
        if (count % 50 === 0) await yieldLoop();
        
        const resolved = resolveItem(sr, uploadedCircle)!;
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

      // Compute prevQty
      const pastApprovedJmcs = await JmcRegister.find({
        contractorId: contractorId || null, package: pkg, location: loc, circle: circ, division: div, subDivision: subDiv, subStation: subStn, feeder, status: 'Approved'
      }).lean();

      const prevQtyMap: Record<string, number> = {};
      for (const pastJmc of pastApprovedJmcs) {
        for (const item of pastJmc.items) {
          if (item.itemId) {
            const idStr = item.itemId.toString();
            prevQtyMap[idStr] = (prevQtyMap[idStr] || 0) + (item.approvedQty || 0);
          }
        }
      }
      for (const item of jmcItems) {
        if (item.itemId) item.prevQty = prevQtyMap[item.itemId.toString()] || 0;
      }

      const existingJmc = await JmcRegister.findOne({ 
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

      if (existingJmc) {
        if (conflictStrategy === 'skip') {
          flagged.push({ sourceFile, issue: `Skipped duplicate JMC for ${circ} - ${subDiv} - ${loc}` });
          continue;
        } else if (conflictStrategy === 'replace') {
          if (existingJmc.status !== 'Approved') {
            await JmcRegister.deleteOne({ _id: existingJmc._id });
          } else {
            flagged.push({ sourceFile, issue: `Cannot replace Approved JMC for ${circ} - ${subDiv} - ${loc}` });
            continue;
          }
        } else if (conflictStrategy === 'update') {
          if (existingJmc.status !== 'Approved') {
            for (const newItem of jmcItems) {
              const existingItem = existingJmc.items.find((i: any) => 
                (i.itemId && newItem.itemId && i.itemId.toString() === newItem.itemId.toString()) ||
                (!i.itemId && !newItem.itemId && i.description === newItem.description && i.activity === newItem.activity)
              );
              if (existingItem) {
                existingItem.claimedQty = (existingItem.claimedQty || 0) + (newItem.claimedQty || 0);
              } else {
                existingJmc.items.push(newItem);
              }
            }
            await existingJmc.save();
            totalSaved++;
            continue;
          } else {
            flagged.push({ sourceFile, issue: `Cannot update Approved JMC for ${circ} - ${subDiv} - ${loc}` });
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
          }
        });
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

  res.status(200).json(
    new ApiResponse(200, { totalSaved, flagged }, `Successfully imported ${totalSaved} JMC records.`)
  );
});
