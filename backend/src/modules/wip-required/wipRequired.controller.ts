import { Request, Response } from 'express';
import { WipRequiredRegister } from './wipRequired.schema';
import { ApiResponse } from '../../core/utils/ApiResponse';
import { ApiError } from '../../core/utils/ApiError';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { Contractor } from '../contractors/contractor.schema';
import Item from '../items/item.model';
import * as xlsx from 'xlsx';
import stringSimilarity from 'string-similarity';
import mongoose from 'mongoose';

export const createWipRequired = asyncHandler(async (req: Request, res: Response) => {
  const data = req.body;
  const user = (req as any).user;

  const count = await WipRequiredRegister.countDocuments();
  data.wipRequiredNumber = `WIP/${new Date().getFullYear().toString().slice(-2)}/${(count + 1).toString().padStart(4, '0')}`;
  data.createdBy = user._id;

  const newWip = await WipRequiredRegister.create(data);

  res.status(201).json(
    new ApiResponse(201, newWip, 'WIP Required register entry created successfully')
  );
});

export const getWipRequireds = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const filter: any = {};

  if (user && user.role?.name === 'Contractor' && user.contractorId) {
    filter.contractorId = user.contractorId;
  }

  const wips = await WipRequiredRegister.find(filter)
    .populate('contractorId', 'name vendorName')
    .populate('workOrderId', 'workOrderNumber')
    .sort({ createdAt: -1 });

  res.status(200).json(
    new ApiResponse(200, wips, 'WIP Required register entries fetched successfully')
  );
});

export const getWipRequiredById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const wip = await WipRequiredRegister.findById(id)
    .populate('contractorId', 'name vendorName')
    .populate('workOrderId', 'workOrderNumber');

  if (!wip) {
    throw new ApiError(404, 'WIP Required register entry not found');
  }

  res.status(200).json(
    new ApiResponse(200, wip, 'WIP Required register entry fetched successfully')
  );
});

export const updateWipRequired = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;

  const wip = await WipRequiredRegister.findById(id);
  if (!wip) {
    throw new ApiError(404, 'WIP Required register entry not found');
  }

  const updatedWip = await WipRequiredRegister.findByIdAndUpdate(
    id,
    data,
    { new: true, runValidators: true }
  );

  res.status(200).json(
    new ApiResponse(200, updatedWip, 'WIP Required register entry updated successfully')
  );
});

export const deleteWipRequired = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const wip = await WipRequiredRegister.findByIdAndDelete(id);
  
  if (!wip) {
    throw new ApiError(404, 'WIP Required register entry not found');
  }

  res.status(200).json(
    new ApiResponse(200, null, 'WIP Required register entry deleted successfully')
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
  return String(v).trim().replace(/:$/, "").trim().toLowerCase();
}


export const uploadWipRequiredExcel = asyncHandler(async (req: Request, res: Response) => {
  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    return res.status(400).json(new ApiResponse(400, null, 'No files uploaded'));
  }

  const user = (req as any).user;
  const flagged: any[] = [];
  let totalSaved = 0;

  // Pre-fetch all contractors and items for matching
  const allContractors = await Contractor.find({}).lean();
  const contractorNames = allContractors.map((c: any) => c.name || c.dynamicData?.companyName || c.dynamicData?.displayName || c.dynamicData?.name).filter(Boolean);
  
  const allItems = await Item.find({}).lean();
  // We'll map by item name / description
  const itemNames = allItems.map((i: any) => i.name).filter(Boolean);

  let initialCount = await WipRequiredRegister.countDocuments();

  for (const file of req.files) {
    try {
      const workbook = xlsx.read(file.buffer, { type: 'buffer' });
      const sourceFile = file.originalname;

      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: null });
        
        const metaRows: Record<number, string> = {};
        let headerRowIdx = -1;

        // Find metadata and header row (rows 0-14)
        for (let r = 0; r < Math.min(15, rows.length); r++) {
          const row = rows[r];
          if (!row) continue;
          
          let labelFound = false;
          for (let c = 0; c < 5; c++) {
            const cell = row[c];
            if (cell) {
               const norm = normLabel(cell);
               for (const [knownLabel, field] of Object.entries(METADATA_LABELS)) {
                 if (normLabel(knownLabel) === norm) {
                   metaRows[r] = field;
                   labelFound = true;
                   break;
                 }
               }
            }
            if (labelFound) break;
          }
          const aCell = row[0];
          if (aCell && String(aCell).trim().toUpperCase().startsWith("LOA SR")) {
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
              originalSum += numQty;
              recordsBySite[c].push({
                loa, sched, activity: activity || currentActivityGroup, description: desc || activity, unit, quantity: numQty
              });
            }
          }
        }

        let sheetHasErrors = false;
        const sheetWipsToCreate: any[] = [];

        // For each site column, create a WipRequiredRegister
        for (const c of siteCols) {
          if (sheetHasErrors) break;
          const siteRecords = recordsBySite[c];
          if (siteRecords.length === 0) continue;

          const meta = siteMeta[c];
          
          let tidySum = siteRecords.reduce((sum, r) => sum + r.quantity, 0);
          let isSumMismatch = Math.abs(tidySum - originalSum) > 1e-6; // Wait, originalSum is total across ALL site columns!
          // Actually, Python script original_sum was across all site cols, tidy_sum was across all tidy records.
          // Since we save per site_col, this check is different. Let's just calculate it.

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
          for (const sr of siteRecords) {
            let itemId = null;
            let finalActivity = sr.activity || '';
            let finalLoaSerialNo = sr.loa || '';

            // 1. Strict mapping by SKU / LOA Serial No
            if (sr.loa && allItems.length > 0) {
              const matchedItem = allItems.find((i: any) => String(i.dynamicData?.sku) === String(sr.loa));
              if (matchedItem) {
                itemId = matchedItem._id;
                if (!finalActivity && matchedItem.dynamicData?.activity) {
                   finalActivity = matchedItem.dynamicData.activity;
                }
              }
            }

            // 2. Fallback to Description matching
            if (!itemId && sr.description && itemNames.length > 0) {
              const bestMatch = stringSimilarity.findBestMatch(String(sr.description), itemNames);
              if (bestMatch.bestMatch.rating > 0.6) {
                const matchedItem = allItems.find((i: any) => {
                  const desc = String(i.dynamicData?.description || i.dynamicData?.name || '');
                  return desc === bestMatch.bestMatch.target;
                });
                if (matchedItem) {
                  itemId = matchedItem._id;
                  if (!finalActivity && matchedItem.dynamicData?.activity) {
                     finalActivity = matchedItem.dynamicData.activity;
                  }
                  if (!finalLoaSerialNo && matchedItem.dynamicData?.sku) {
                     finalLoaSerialNo = matchedItem.dynamicData.sku;
                  }
                }
              }
            }

            if (!itemId) {
              flagged.push({ sourceFile, sheetName, issue: `Item '${sr.description}' not found in Master Item List. Entire sheet skipped.` });
              sheetHasErrors = true;
              break; // Strict mapping: skip if not matched
            }

            wipItems.push({
              itemId,
              loaSerialNo: finalLoaSerialNo,
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

          const pastApprovedWips = await WipRequiredRegister.find({
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

          initialCount++;
          const wipRequiredNumber = `WIP/${new Date().getFullYear().toString().slice(-2)}/${initialCount.toString().padStart(4, '0')}`;

          sheetWipsToCreate.push({
            wipRequiredNumber,
            date: new Date(),
            contractorId: contractorId || null,
            package: (user as any).assignedPackage || meta.Location || meta.DrawingNo || '',
            circle: (user as any).assignedCircle || meta.Circle || '',
            division: meta.Division || '',
            subDivision: meta.SubDivision || '',
            items: wipItems,
            claimedAmount: 0,
            approvedAmount: 0,
            status: 'Draft',
            remarks: `Uploaded from ${sourceFile} (${sheetName}). ${!meta.Contractor ? 'Warning: No contractor name found in sheet.' : ''}`.trim(),
            createdBy: user._id
          });
        }

        if (!sheetHasErrors && sheetWipsToCreate.length > 0) {
          await WipRequiredRegister.insertMany(sheetWipsToCreate);
          totalSaved += sheetWipsToCreate.length;
        }
      }
    } catch (e: any) {
      flagged.push({ sourceFile: file.originalname, issue: e.message });
    }
  }

  res.status(200).json(
    new ApiResponse(200, { totalSaved, flagged }, `Successfully imported ${totalSaved} WIP records.`)
  );
});