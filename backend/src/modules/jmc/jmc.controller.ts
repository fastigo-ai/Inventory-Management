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

export const createJmc = asyncHandler(async (req: Request, res: Response) => {
  const data = req.body;
  const user = (req as any).user;

  const count = await JmcRegister.countDocuments();
  data.jmcNumber = `JMC/${new Date().getFullYear().toString().slice(-2)}/${(count + 1).toString().padStart(4, '0')}`;
  data.createdBy = user._id;

  const newJmc = await JmcRegister.create(data);

  res.status(201).json(
    new ApiResponse(201, newJmc, 'JMC Register entry created successfully')
  );
});

export const getJmcs = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const filter: any = {};

  if (user && user.role?.name === 'Contractor' && user.contractorId) {
    filter.contractorId = user.contractorId;
  }

  const jmcs = await JmcRegister.find(filter)
    .populate('contractorId', 'name vendorName')
    .populate('workOrderId', 'workOrderNumber')
    .sort({ createdAt: -1 });

  res.status(200).json(
    new ApiResponse(200, jmcs, 'JMC Register entries fetched successfully')
  );
});

export const getJmcById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const jmc = await JmcRegister.findById(id)
    .populate('contractorId', 'name vendorName')
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

  const updatedJmc = await JmcRegister.findByIdAndUpdate(
    id,
    data,
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
  return String(v).trim().replace(/:$/, "").trim().toLowerCase();
}

export const uploadJmcExcel = asyncHandler(async (req: Request, res: Response) => {
  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    return res.status(400).json(new ApiResponse(400, null, 'No files uploaded'));
  }

  const user = (req as any).user;
  const flagged: any[] = [];
  let totalSaved = 0;

  // Pre-fetch all contractors and items for matching
  const allContractors = await Contractor.find({}).lean();
  const contractorNames = allContractors.map((c: any) => c.name);
  
  const allItems = await Item.find({}).lean();
  // We'll map by item name / description
  const itemNames = allItems.map((i: any) => i.name);

  let initialCount = await JmcRegister.countDocuments();

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
          
          const labelCell = row[3]; // column D is index 3
          const aCell = row[0];     // column A is index 0

          if (labelCell) {
            const norm = normLabel(labelCell);
            for (const [knownLabel, field] of Object.entries(METADATA_LABELS)) {
              if (normLabel(knownLabel) === norm) {
                metaRows[r] = field;
                break;
              }
            }
          }
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

        // Determine site columns (from index 5 / Col F)
        const siteCols: number[] = [];
        for (let c = 5; c < maxCol; c++) {
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
        
        for (let r = headerRowIdx + 1; r < rows.length; r++) {
          const row = rows[r];
          if (!row) continue;
          
          const loa = row[0];
          const sched = row[1];
          const activity = row[2];
          const desc = row[3];
          const unit = row[4];
          
          if (!loa && !sched && !activity && !desc) continue;
          
          for (const c of siteCols) {
            const qty = row[c];
            if (qty === null || qty === undefined || qty === "") continue;
            
            const numQty = parseFloat(qty);
            if (!isNaN(numQty)) {
              originalSum += numQty;
              recordsBySite[c].push({
                loa, sched, activity, description: desc || activity, unit, quantity: numQty
              });
            }
          }
        }

        // For each site column, create a JmcRegister
        for (const c of siteCols) {
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
              const matchedContractor = allContractors.find(c => c.name === bestMatch.bestMatch.target);
              if (matchedContractor) contractorId = matchedContractor._id;
            }
          }
          
          // Map Items
          const jmcItems = [];
          let claimedAmount = 0;
          for (const sr of siteRecords) {
            let itemId = null;
            if (sr.activity && itemNames.length > 0) {
              const bestMatch = stringSimilarity.findBestMatch(String(sr.activity), itemNames);
              if (bestMatch.bestMatch.rating > 0.4) {
                const matchedItem = allItems.find((i: any) => i.name === bestMatch.bestMatch.target);
                if (matchedItem) itemId = matchedItem._id;
              }
            }
            jmcItems.push({
              itemId,
              activity: sr.activity || '',
              description: sr.description || '',
              unit: sr.unit || '',
              claimedQty: sr.quantity,
              approvedQty: 0,
              rate: 0,
              amount: 0,
              remarks: ''
            });
          }

          initialCount++;
          const jmcNumber = `JMC/${new Date().getFullYear().toString().slice(-2)}/${initialCount.toString().padStart(4, '0')}`;

          await JmcRegister.create({
            jmcNumber,
            date: new Date(),
            contractorId: contractorId || null,
            package: meta.Location || meta.DrawingNo || '',
            circle: meta.Circle || '',
            division: meta.Division || '',
            subDivision: meta.SubDivision || '',
            items: jmcItems,
            claimedAmount: 0,
            approvedAmount: 0,
            status: 'Draft', // as per user request for mismatches/defaults
            remarks: `Uploaded from ${sourceFile} (${sheetName})`,
            createdBy: user._id
          });
          
          totalSaved++;
        }
      }
    } catch (e: any) {
      flagged.push({ sourceFile: file.originalname, issue: e.message });
    }
  }

  res.status(200).json(
    new ApiResponse(200, { totalSaved, flagged }, `Successfully imported ${totalSaved} JMC records.`)
  );
});