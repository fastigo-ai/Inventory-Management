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

  if (user && user.role?.name === 'Contractor' && user.contractorId) {
    filter.contractorId = new mongoose.Types.ObjectId(user.contractorId);
  } else if (req.query.contractorId && req.query.contractorId !== 'All') {
    filter.contractorId = new mongoose.Types.ObjectId(req.query.contractorId as string);
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
  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    return res.status(400).json(new ApiResponse(400, null, 'No files uploaded'));
  }

  const clientId = (req.query.clientId as string) || (req.body.clientId as string);
  
  if (clientId) {
    sseService.sendEvent(clientId, { stage: 'started', progress: 0, message: 'WIP Bulk Import Started' });
    await new Promise(r => setTimeout(r, 50));
  }

  const user = (req as any).user;
  const conflictStrategy = req.body.conflictStrategy || 'skip';
  const flagged: any[] = [];
  let totalSaved = 0;

  if (clientId) {
    sseService.sendEvent(clientId, { stage: 'parsing', progress: 5, message: 'Fetching metadata...' });
    await new Promise(r => setTimeout(r, 50));
  }

  // Pre-fetch all contractors and items for matching
  const allContractors = await Contractor.find({}).lean();
  const contractorNames = allContractors.map((c: any) => c.name || c.dynamicData?.companyName || c.dynamicData?.displayName || c.dynamicData?.name).filter(Boolean);
  
  const allItems = await Item.find({}).lean();
  // We'll map by item name / description
  const itemNames = allItems.map((i: any) => i.name).filter(Boolean);

  let { currentCount: initialCount, yearStr } = await getNextWipSequence();

  const totalFiles = req.files.length;
  for (let fileIdx = 0; fileIdx < totalFiles; fileIdx++) {
    const file = req.files[fileIdx];
    try {
      if (clientId) sseService.sendEvent(clientId, { 
        stage: 'parsing', 
        progress: 10 + (fileIdx / totalFiles) * 20, 
        message: `Reading file ${fileIdx + 1} of ${totalFiles}: ${file.originalname}...` 
      });

      const workbook = xlsx.read(file.buffer, { type: 'buffer' });
      const sourceFile = file.originalname;

      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: null });
        
        const metaRows: Record<number, string> = {};
        let headerRowIdx = -1;

        // Find metadata and header row (rows 0-14)
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
          for (let c = 0; c < row.length; c++) {
            const h = normLabel(row[c]);
            if (h && (h.includes("loa") || h.includes("code") || h.includes("temp") || h.includes("sched") || h.includes("activity") || h.includes("desc") || h.includes("unit") || h.includes("sr no") || h.includes("sr.") || h.includes("s.no") || h.includes("item") || h.includes("qty") || h.includes("quantity"))) {
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
          flagged.push({ sourceFile, sheetName, issue: "Could not find 'LOA SR.NO.' header row - skipped" });
          continue;
        }

        const maxCol = rows.reduce((max, r) => Math.max(max, r.length), 0);

        // Dynamically find columns based on the header row
        const headerRow = rows[headerRowIdx];
        let loaIdx = -1, tempCodeIdx = -1, schedIdx = -1, activityIdx = -1, descIdx = -1, unitIdx = -1;
        
        for (let c = 0; c < headerRow.length; c++) {
          const h = normLabel(headerRow[c]);
          if (!h) continue;
          if (h.includes("loa") && loaIdx === -1) loaIdx = c;
          else if (h.includes("code") && tempCodeIdx === -1) tempCodeIdx = c;
          else if (h.includes("sched") && schedIdx === -1) schedIdx = c;
          else if (h.includes("activity") && activityIdx === -1) activityIdx = c;
          else if (h.includes("desc") && descIdx === -1) descIdx = c;
          else if (h.includes("unit") && unitIdx === -1) unitIdx = c;
        }

        let startSiteCol = Math.max(loaIdx, tempCodeIdx, schedIdx, activityIdx, descIdx, unitIdx) + 1;
        if (startSiteCol <= 0) {
          startSiteCol = 5;
          loaIdx = 0; schedIdx = 1; activityIdx = 2; descIdx = 3; unitIdx = 4;
        }

        // Determine site columns
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

        // Parse records
        const recordsBySite: Record<number, any[]> = {};
        for (const c of siteCols) {
          recordsBySite[c] = [];
        }

        let originalSum = 0;
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
              originalSum += numQty;
              recordsBySite[c].push({
                loa, tempCode: tempCodeVal, sched, activity: activity || currentActivityGroup, description: desc || activity, unit, quantity: numQty
              });
            }
          }
        }

        let sheetHasErrors = false;
        const sheetWipsToCreate: any[] = [];

        // For each site column, create a WipRegister
        for (const c of siteCols) {
          if (sheetHasErrors) break;
          const siteRecords = recordsBySite[c];
          if (siteRecords.length === 0) continue;

          const meta = siteMeta[c];
          
          let tidySum = siteRecords.reduce((sum, r) => sum + r.quantity, 0);
          let isSumMismatch = Math.abs(tidySum - originalSum) > 1e-6; 

          // Find Contractor
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

          // If still no contractorId, we must create one dynamically to prevent validation failure
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
              console.log("CREATING CONTRACTOR WITH PAYLOAD:", JSON.stringify(payload));
              newContractor = await Contractor.create(payload);
              allContractors.push(newContractor as any);
              contractorNames.push(fallbackName);
            }
            contractorId = newContractor._id;
          }
          
          // Map Items
          const wipItems = [];
          let claimedAmount = 0;
          const uploadedCircle = (user as any).assignedCircle || meta.Circle || '';
          
          if (clientId) {
          sseService.sendEvent(clientId, {
            stage: 'validation',
            progress: 40 + (fileIdx / totalFiles) * 40,
            message: `Validating and mapping ${siteRecords.length} items for column ${c}...`
          });
          await new Promise(r => setTimeout(r, 10)); // let node flush
        }

          for (const sr of siteRecords) {
            let itemId = null;
            let finalActivity = sr.activity || '';
            let finalLoaSerialNo = sr.loa || '';
            let finalTempCode = sr.tempCode || '';

            let matchedItemObj: any = null;

            for (const item of allItems) {
              const itemCircle = (item.dynamicData?.circle || '').toLowerCase().trim();
              const sheetCircle = (uploadedCircle || '').toLowerCase().trim();
              const isCircleMatch = itemCircle === sheetCircle || itemCircle.includes(sheetCircle) || sheetCircle.includes(itemCircle);

              const itemSku = String(item.dynamicData?.sku || item.dynamicData?.loaSrNo || '').toLowerCase().trim();
              const sheetSku = String(sr.loa || '').toLowerCase().trim();
              const isSkuMatch = itemSku === sheetSku;

              if (isCircleMatch && isSkuMatch) {
                matchedItemObj = item;
                break;
              }
            }

            let finalTotalLoaQty = 0;
            let finalLoaSrNo = finalLoaSerialNo;

            if (matchedItemObj) {
              itemId = matchedItemObj._id;
              finalActivity = matchedItemObj.dynamicData?.activity || finalActivity;
              finalLoaSerialNo = matchedItemObj.dynamicData?.sku || matchedItemObj.dynamicData?.loaSrNo || finalLoaSerialNo;
              finalLoaSrNo = matchedItemObj.dynamicData?.sku || matchedItemObj.dynamicData?.loaSrNo || finalLoaSrNo;
              finalTempCode = matchedItemObj.dynamicData?.tempCode || matchedItemObj.rawItem?.tempCode || finalTempCode;
              finalTotalLoaQty = Number(matchedItemObj.dynamicData?.loaQty || matchedItemObj.dynamicData?.loaQuantity || matchedItemObj.dynamicData?.totalLoaQuantity || matchedItemObj.dynamicData?.qty || matchedItemObj.dynamicData?.quantity || 0);
            }

            if (!itemId) {
              flagged.push({ sourceFile, sheetName, issue: `Item '${sr.description}' with SKU '${sr.loa}' not found in Master Item List for circle '${uploadedCircle}'. Sheet rejected.` });
              sheetHasErrors = true;
              break;
            }

            wipItems.push({
              itemId: itemId || undefined,
              loaSerialNo: finalLoaSerialNo,
              loaSrNo: finalLoaSrNo,
              tempCode: finalTempCode,
              totalLoaQty: finalTotalLoaQty,
              activity: finalActivity,
              description: sr.description || '',
              unit: sr.unit || '',
              prevQty: 0,
              claimedQty: sr.quantity,
              approvedQty: 0,
              remarks: ''
            });
          }

          if (sheetHasErrors) break;

          if (wipItems.length === 0) {
             flagged.push({ sourceFile, sheetName, issue: `No valid matched items found for ${meta.Location || 'Unknown Location'}. Skipped.` });
             continue;
          }

          const pkg = (user as any).assignedPackage || meta.Location || meta.DrawingNo || '';
          const circ = (user as any).assignedCircle || meta.Circle || '';
          const div = meta.Division || '';
          const subDiv = meta.SubDivision || '';

          const pastApprovedWips = await WipRegister.find({
             contractorId: contractorId || null,
             package: pkg,
             circle: circ,
             division: div,
             subDivision: subDiv,
             status: 'Approved'
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
             if (item.itemId) {
                item.prevQty = prevQtyMap[item.itemId.toString()] || 0;
             }
          }

          const existingWipNo = meta.WipNumber || null;

          if (existingWipNo) {
             sheetWipsToCreate.push({
               isUpdate: true,
               wipNumber: existingWipNo,
               date: new Date(),
               contractorId: contractorId || null,
               package: (user as any).assignedPackage || meta.DrawingNo || '',
               location: meta.Location || '',
               feeder: meta.Feeder || '',
               circle: (user as any).assignedCircle || meta.Circle || '',
               division: meta.Division || '',
               subDivision: meta.SubDivision || '',
               subStation: meta.SubStation || '',
               items: wipItems,
               remarks: `Updated via Bulk Upload from ${sourceFile} (${sheetName}).`,
             });
          } else {
             initialCount++;
             const wipNumber = `WIP/${yearStr}/${initialCount.toString().padStart(4, '0')}`;

             sheetWipsToCreate.push({
               wipNumber,
               date: new Date(),
               contractorId: contractorId || null,
               package: (user as any).assignedPackage || meta.DrawingNo || '',
               location: meta.Location || '',
               feeder: meta.Feeder || '',
               circle: (user as any).assignedCircle || meta.Circle || '',
               division: meta.Division || '',
               subDivision: meta.SubDivision || '',
               subStation: meta.SubStation || '',
               items: wipItems,
               claimedAmount: 0,
               approvedAmount: 0,
               status: 'Submitted',
               remarks: `Uploaded from ${sourceFile} (${sheetName}). ${!meta.Contractor ? 'Warning: No contractor name found in sheet.' : ''}`.trim(),
               createdBy: user._id
             });
          }
        }

        if (!sheetHasErrors && sheetWipsToCreate.length > 0) {
          if (clientId) {
            sseService.sendEvent(clientId, {
              stage: 'inserting',
              progress: 80,
              message: `Saving/Updating ${sheetWipsToCreate.length} WIP records...`
            });
            await new Promise(r => setTimeout(r, 10)); // flush
          }
          
          for (const doc of sheetWipsToCreate) {
             if (doc.isUpdate) {
                const { isUpdate, wipNumber, ...updateData } = doc;
                await WipRegister.findOneAndUpdate({ wipNumber: doc.wipNumber }, { $set: updateData });
             } else {
                await WipRegister.create(doc);
             }
          }
          totalSaved += sheetWipsToCreate.length;
        }
      }
    } catch (e: any) {
      flagged.push({ sourceFile: file.originalname, issue: e.message });
    }
  }

  if (clientId) {
    sseService.sendEvent(clientId, {
      stage: 'COMPLETED',
      progress: 100,
      message: `Successfully imported ${totalSaved} WIP records.`
    });
  }

  res.status(200).json(
    new ApiResponse(200, { totalSaved, flagged }, `Successfully imported ${totalSaved} WIP records.`)
  );
});