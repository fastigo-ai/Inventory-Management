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

  const count = await JmcRegister.countDocuments();
  data.jmcNumber = `JMC/${new Date().getFullYear().toString().slice(-2)}/${(count + 1).toString().padStart(4, '0')}`;
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
  const filter: any = {};

  if (user && user.role?.name === 'Contractor' && user.contractorId) {
    filter.contractorId = user.contractorId;
  } else if (req.query.contractorId && req.query.contractorId !== 'All') {
    filter.contractorId = req.query.contractorId;
  }

  if (req.query.startDate || req.query.endDate) {
    filter.date = {};
    if (req.query.startDate) {
      filter.date.$gte = new Date(req.query.startDate as string);
    }
    if (req.query.endDate) {
      filter.date.$lte = new Date(req.query.endDate as string);
    }
  }

  const jmcs = await JmcRegister.find(filter)
    .populate('contractorId', 'name vendorName dynamicData')
    .populate('workOrderId', 'workOrderNumber')
    .populate('items.itemId')
    .sort({ createdAt: 1 });

  res.status(200).json(
    new ApiResponse(200, jmcs, 'JMC Register entries fetched successfully')
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

  // Pre-fetch all contractors and items for matching
  const allContractors = await Contractor.find({}).lean();
  const contractorNames = allContractors.map((c: any) => c.name || c.dynamicData?.companyName || c.dynamicData?.displayName || c.dynamicData?.name).filter(Boolean);
  
  const allItems = await Item.find({}).lean();

  // â”€â”€â”€ HELPER: parse one file into structured site-records â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
            if (norm.includes("circle")) field = "Circle";
            else if (norm.includes("division") && !norm.includes("sub")) field = "Division";
            else if (norm.includes("sub") && (norm.includes("div") || norm.includes("division"))) field = "SubDivision";
            else if (norm.includes("sub") && (norm.includes("station") || norm.includes("stn"))) field = "SubStation";
            else if (norm.includes("feeder")) field = "Feeder";
            else if (norm.includes("location") || norm.includes("site")) field = "Location";
            else if (norm.includes("drawing")) field = "DrawingNo";
            else if (norm.includes("contractor") || norm.includes("agency")) field = "Contractor";

            if (field) {
              metaRows[r] = field;
              labelFound = true;
              break;
            }
          }
          if (labelFound) break;
        }

        let isHeader = false;
        for (let c = 0; c < row.length; c++) {
          const h = normLabel(row[c]);
          if (h && (h.includes("loa") || h.includes("sched") || h.includes("activity") || h.includes("desc") || h.includes("unit") || h.includes("sr no") || h.includes("sr.") || h.includes("s.no") || h.includes("item") || h.includes("qty") || h.includes("quantity"))) {
            isHeader = true;
            break;
          }
        }
        if (isHeader) {
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
      let loaIdx = -1, schedIdx = -1, activityIdx = -1, descIdx = -1, unitIdx = -1;

      for (let c = 0; c < headerRow.length; c++) {
        const h = normLabel(headerRow[c]);
        if (!h) continue;
        if (h.includes("loa") && loaIdx === -1) loaIdx = c;
        else if (h.includes("sched") && schedIdx === -1) schedIdx = c;
        else if (h.includes("activity") && activityIdx === -1) activityIdx = c;
        else if (h.includes("desc") && descIdx === -1) descIdx = c;
        else if (h.includes("unit") && unitIdx === -1) unitIdx = c;
      }

      let startSiteCol = Math.max(loaIdx, schedIdx, activityIdx, descIdx, unitIdx) + 1;
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

      const siteMeta: Record<number, any> = {};
      for (const c of siteCols) {
        const d: any = {};
        for (const [rIdx, field] of Object.entries(metaRows)) {
          d[field] = rows[Number(rIdx)][c];
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
        const sched = schedIdx !== -1 ? row[schedIdx] : null;
        const activity = activityIdx !== -1 ? row[activityIdx] : null;
        const desc = descIdx !== -1 ? row[descIdx] : null;
        const unit = unitIdx !== -1 ? row[unitIdx] : null;

        if (!loa && !sched && !activity && !desc) continue;

        if (!unit || String(unit).trim() === '') {
          if (desc) currentActivityGroup = String(desc).trim();
        }

        for (const c of siteCols) {
          const qty = row[c];
          if (qty === null || qty === undefined || qty === "") continue;
          const numQty = parseFloat(qty);
          if (!isNaN(numQty)) {
            recordsBySite[c].push({
              loa, sched, activity: activity || currentActivityGroup, description: desc || activity, unit, quantity: numQty
            });
          }
        }
      }

      sheets.push({ sourceFile, sheetName, siteCols, siteMeta, recordsBySite });
    }

    return sheets;
  };

  // â”€â”€â”€ HELPER: resolve an item â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const resolveItem = (sr: any, uploadedCircle: string): { itemId: any; activity: string; loaSerialNo: string } | null => {
    let itemId = null;
    let finalActivity = sr.activity || '';
    let finalLoaSerialNo = sr.loa || '';

    // 1. Strict LOA/SKU match (circle-agnostic)
    if (sr.loa && allItems.length > 0) {
      const matchedItem = allItems.find((i: any) => String(i.dynamicData?.sku) === String(sr.loa));
      if (matchedItem) {
        itemId = matchedItem._id;
        if (!finalActivity && matchedItem.dynamicData?.activity) finalActivity = matchedItem.dynamicData.activity;
      }
    }

    // 2. Description match within circle
    if (!itemId && sr.description && allItems.length > 0) {
      let candidateItems = allItems;
      if (uploadedCircle) {
        candidateItems = candidateItems.filter((i: any) => {
          const c = i.dynamicData?.circle || '';
          return c.toLowerCase() === uploadedCircle.toLowerCase() ||
                 c.toLowerCase().includes(uploadedCircle.toLowerCase()) ||
                 uploadedCircle.toLowerCase().includes(c.toLowerCase());
        });
      }

      if (candidateItems.length === 0) return null; // No items in this circle at all

      const descriptions = candidateItems.map((i: any) => String(i.dynamicData?.description || i.dynamicData?.name || '')).filter(Boolean);
      if (descriptions.length > 0) {
        const bestMatch = stringSimilarity.findBestMatch(String(sr.description), descriptions);
        if (bestMatch.bestMatch.rating > 0.4) {
          const matchedItem = candidateItems.find((i: any) => {
            const desc = String(i.dynamicData?.description || i.dynamicData?.name || '');
            return desc === bestMatch.bestMatch.target;
          });
          if (matchedItem) {
            itemId = matchedItem._id;
            if (!finalActivity && matchedItem.dynamicData?.activity) finalActivity = matchedItem.dynamicData.activity;
            if (!finalLoaSerialNo && matchedItem.dynamicData?.sku) finalLoaSerialNo = matchedItem.dynamicData.sku;
          }
        }
      }
    }

    if (!itemId) return null;
    return { itemId, activity: finalActivity, loaSerialNo: finalLoaSerialNo };
  };

  // â”€â”€â”€ PASS 1: Parse + Validate â€” collect ALL errors, save NOTHING â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const validationErrors: { sourceFile: string; sheetName: string; description: string; circle: string }[] = [];
  const parsedSheets: any[] = [];

  for (const file of (req.files as any[])) {
    try {
      const sheets = parseFile(file);
      for (const sheet of sheets) {
        if (sheet.skipped) continue;
        const { sourceFile, sheetName, siteCols, siteMeta, recordsBySite } = sheet;
        for (const c of siteCols) {
          const meta = siteMeta[c];
          const uploadedCircle = (user as any).assignedCircle || meta.Circle || '';
          for (const sr of recordsBySite[c]) {
            const resolved = resolveItem(sr, uploadedCircle);
            if (!resolved) {
              validationErrors.push({
                sourceFile,
                sheetName,
                description: sr.description || sr.activity || 'Unknown item',
                circle: uploadedCircle
              });
            }
          }
        }
        parsedSheets.push(sheet);
      }
    } catch (e: any) {
      validationErrors.push({ sourceFile: file.originalname, sheetName: '', description: `Parse error: ${e.message}`, circle: '' });
    }
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
          circle: e.circle
        }))
      }
    });
  }

  // â”€â”€â”€ PASS 2: All validated â€” now save â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const flagged: any[] = [];
  let totalSaved = 0;
  let initialCount = await JmcRegister.countDocuments();

  for (const sheet of parsedSheets) {
    const { sourceFile, sheetName, siteCols, siteMeta, recordsBySite } = sheet;

    for (const c of siteCols) {
      const siteRecords = recordsBySite[c];
      if (siteRecords.length === 0) continue;

      const meta = siteMeta[c];
      const pkg = (user as any).assignedPackage || meta.Location || meta.DrawingNo || '';
      const circ = (user as any).assignedCircle || meta.Circle || '';
      const div = meta.Division || '';
      const subDiv = meta.SubDivision || '';
      const loc = meta.Location || '';
      const uploadedCircle = circ;

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
        const fallbackName = contractorNameStr || 'Unknown Contractor (Auto-created)';
        let newContractor = allContractors.find((c: any) => {
          const name = c.name || c.dynamicData?.companyName || c.dynamicData?.displayName || c.dynamicData?.name;
          return name === fallbackName;
        });
        if (!newContractor) {
          const payload = {
            dynamicData: { companyName: fallbackName, name: fallbackName, vendorName: fallbackName },
            isActive: true
          };
          newContractor = await Contractor.create(payload);
          allContractors.push(newContractor as any);
          contractorNames.push(fallbackName);
        }
        contractorId = (newContractor as any)._id;
      }

      // Build items (all will resolve since pass 1 validated them)
      const jmcItems: any[] = [];
      for (const sr of siteRecords) {
        const resolved = resolveItem(sr, uploadedCircle)!;
        jmcItems.push({
          itemId: resolved.itemId,
          loaSerialNo: resolved.loaSerialNo,
          activity: resolved.activity,
          description: sr.description || '',
          unit: sr.unit || '',
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
        contractorId: contractorId || null, package: pkg, location: loc, circle: circ, division: div, subDivision: subDiv, status: 'Approved'
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

      const existingJmc = await JmcRegister.findOne({ contractorId: contractorId || null, package: pkg, location: loc, circle: circ, division: div, subDivision: subDiv });

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
            existingJmc.items.push(...jmcItems);
            await existingJmc.save();
            totalSaved++;
            continue;
          } else {
            flagged.push({ sourceFile, issue: `Cannot update Approved JMC for ${circ} - ${subDiv} - ${loc}` });
            continue;
          }
        }
      }

      initialCount++;
      const jmcNumber = `JMC/${new Date().getFullYear().toString().slice(-2)}/${initialCount.toString().padStart(4, '0')}`;

      await JmcRegister.create({
        jmcNumber,
        date: new Date(),
        contractorId: contractorId || null,
        package: pkg,
        location: loc,
        circle: circ,
        division: div,
        subDivision: subDiv,
        items: jmcItems,
        claimedAmount: 0,
        approvedAmount: 0,
        status: 'Submitted',
        remarks: `Uploaded from ${sourceFile} (${sheetName}). ${!meta.Contractor ? 'Warning: No contractor name found in sheet.' : ''}`.trim(),
        createdBy: user._id
      });

      totalSaved++;
    }
  }

  res.status(200).json(
    new ApiResponse(200, { totalSaved, flagged }, `Successfully imported ${totalSaved} JMC records.`)
  );
});
