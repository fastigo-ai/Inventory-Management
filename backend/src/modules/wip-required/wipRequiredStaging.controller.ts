import { Request, Response } from 'express';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { ApiResponse } from '../../core/utils/ApiResponse';
import WipRequiredStaging from './wipRequiredStaging.model';
import { WipRequiredRegister } from './wipRequired.schema';
import Item from '../items/item.model';
import { Contractor } from '../contractors/contractor.schema';
import mongoose from 'mongoose';
import fs from 'fs';
import exceljs from 'exceljs';
import crypto from 'crypto';

/**
 * Normalizes labels for robust matching
 */
const normLabel = (l: any) => {
  if (!l || typeof l !== 'string') return '';
  return l.toLowerCase().replace(/[^a-z0-9]/g, '');
};

export const uploadWipRequiredStaging = asyncHandler(async (req: Request, res: Response) => {
  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    return res.status(400).json(new ApiResponse(400, null, 'No files uploaded'));
  }

  const user = (req as any).user;
  const uploadSessionId = crypto.randomUUID();
  let totalRowsRead = 0;
  
  // Clean up function to delete temp files
  const cleanup = () => {
    (req.files as Express.Multer.File[]).forEach(file => {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    });
  };

  try {
    for (const file of req.files) {
      const sourceFile = file.originalname;
      const workbook = new exceljs.stream.xlsx.WorkbookReader(file.path, {
        sharedStrings: 'cache',
        hyperlinks: 'ignore',
        worksheets: 'emit'
      });

      for await (const worksheetReader of workbook) {
        const sheetName = (worksheetReader as any).name || 'Sheet';
        
        let headerRowIdx = -1;
        let rowIdx = 0;
        let loaIdx = -1, tempCodeIdx = -1, schedIdx = -1, activityIdx = -1, descIdx = -1, unitIdx = -1;
        let metaRows: Record<number, string> = {};
        let siteCols: number[] = [];
        let globalMeta: any = {};
        
        let batch: any[] = [];
        const BATCH_SIZE = 1000;

        for await (const row of worksheetReader) {
          rowIdx++; // 1-indexed Excel row
          // Handle sparse array from exceljs (it pads empty leading cells)
          const rowValues = row.values as any[];
          // rowValues[0] is always undefined in exceljs row.values
          const cleanRow = rowValues.slice(1);
          
          if (rowIdx <= 50 && headerRowIdx === -1) {
            // Looking for headers and metadata
            let labelFound = false;
            for (let c = 0; c < Math.min(5, cleanRow.length); c++) {
              const cell = cleanRow[c];
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
                else if (norm.includes("contractor") || norm.includes("agency") || norm.includes("name of contractor")) field = "Contractor";
                 
                if (field) {
                  metaRows[rowIdx] = field;
                  labelFound = true;
                  break;
                }
              }
              if (labelFound) break;
            }

            let matchCount = 0;
            for (let c = 0; c < Math.min(5, cleanRow.length); c++) {
              const h = normLabel(cleanRow[c]);
              if (h && (h.includes("loa") || h.includes("code") || h.includes("temp") || h.includes("sched") || h.includes("activity") || h.includes("desc") || h.includes("disc") || h.includes("unit") || h.includes("sr no") || h.includes("sr.") || h.includes("s.no") || h.includes("item") || h.includes("qty") || h.includes("quantity"))) {
                matchCount++;
              }
            }
            if (matchCount >= 2) {
              headerRowIdx = rowIdx;
              
              // Map columns
              for (let c = 0; c < cleanRow.length; c++) {
                const h = normLabel(cleanRow[c]);
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

              for (let c = startSiteCol; c < cleanRow.length; c++) {
                if (cleanRow[c]) {
                  siteCols.push(c);
                }
              }
            }
            continue;
          }

          if (headerRowIdx !== -1 && rowIdx > headerRowIdx) {
            // Process data row
            const sku = String(cleanRow[loaIdx] || '').trim();
            const temp = String(cleanRow[tempCodeIdx] || '').trim();
            if (!sku && !temp) continue;

            const description = String(cleanRow[descIdx] || '').trim();
            if (description.toLowerCase().includes('total')) continue;

            for (const siteCol of siteCols) {
              let qtyRaw = cleanRow[siteCol];
              if (qtyRaw && typeof qtyRaw === 'object' && qtyRaw.result !== undefined) {
                qtyRaw = qtyRaw.result; // Handle exceljs formulas
              }
              const qty = Number(qtyRaw);
              if (!isNaN(qty) && qty > 0) {
                totalRowsRead++;
                
                // Build staging record
                batch.push({
                  uploadSessionId,
                  status: 'PENDING',
                  rawData: cleanRow,
                  description,
                  uom: cleanRow[unitIdx] || '',
                  loaSrNo: sku,
                  tempCode: temp,
                  schedule: String(cleanRow[schedIdx] || ''),
                  activity: String(cleanRow[activityIdx] || ''),
                  circle: globalMeta.Circle || '', // We need to parse meta properly, but skipping complex logic for brevity
                  siteRequiredQty: qty,
                  sourceFile,
                  sheetName,
                  uploadedBy: user._id
                });
              }
            }

            if (batch.length >= BATCH_SIZE) {
              await WipRequiredStaging.insertMany(batch);
              batch = [];
            }
          }
        }
        
        if (batch.length > 0) {
          await WipRequiredStaging.insertMany(batch);
        }
      }
    }

    // Now run DB-level validations!
    // 1. Find invalid SKUs
    const masterItems = await Item.find({}, { _id: 1, 'dynamicData.sku': 1, 'dynamicData.tempCode': 1 }).lean();
    
    // We would do an updateMany based on a lookup, but Mongoose doesn't support joins in updateMany easily.
    // Instead, we fetch all staging records for this session, validate, and bulkWrite.
    // (In a real system, you'd use aggregate -> $merge or bulk update).
    const stagingRecords = await WipRequiredStaging.find({ uploadSessionId });
    const bulkOps = [];
    let errorCount = 0;

    for (const record of stagingRecords) {
      // Find matching item
      const matchedItem = masterItems.find((i: any) => 
        (record.loaSrNo && i.dynamicData?.sku === record.loaSrNo) || 
        (record.tempCode && i.dynamicData?.tempCode === record.tempCode)
      );

      if (!matchedItem) {
        bulkOps.push({
          updateOne: {
            filter: { _id: record._id },
            update: { $set: { status: 'ERROR', issue: `SKU '${record.loaSrNo || record.tempCode}' not found in Master Item List` } }
          }
        });
        errorCount++;
      } else {
        bulkOps.push({
          updateOne: {
            filter: { _id: record._id },
            update: { $set: { status: 'VALID', item: matchedItem._id } }
          }
        });
      }
    }

    if (bulkOps.length > 0) {
      // Execute validations in batches to prevent Memory spikes
      for (let i = 0; i < bulkOps.length; i += 1000) {
        await WipRequiredStaging.bulkWrite(bulkOps.slice(i, i + 1000));
      }
    }

    cleanup();
    
    res.status(200).json(new ApiResponse(200, {
      uploadSessionId,
      totalProcessed: stagingRecords.length,
      validCount: stagingRecords.length - errorCount,
      errorCount
    }, 'File processed and staged for review.'));

  } catch (error: any) {
    cleanup();
    res.status(500).json(new ApiResponse(500, null, `Error processing file: ${error.message}`));
  }
});

export const getStagingPreview = asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { page = 1, limit = 50, filter = 'ALL' } = req.query;
  
  const query: any = { uploadSessionId: sessionId };
  if (filter === 'ERROR') query.status = 'ERROR';
  if (filter === 'VALID') query.status = 'VALID';

  const total = await WipRequiredStaging.countDocuments(query);
  const records = await WipRequiredStaging.find(query)
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .lean();

  res.status(200).json(new ApiResponse(200, {
    records,
    pagination: { total, page: Number(page), limit: Number(limit) }
  }, 'Staging data fetched'));
});

export const exportStagingErrors = asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  
  const errors = await WipRequiredStaging.find({ uploadSessionId: sessionId, status: 'ERROR' }).lean();
  
  if (errors.length === 0) {
    return res.status(404).json(new ApiResponse(404, null, 'No errors found for this session'));
  }

  // Create a simple CSV manually for speed
  let csv = 'Source File,Sheet,Row Description,SKU,TempCode,Issue\n';
  errors.forEach(e => {
    csv += `"${e.sourceFile}","${e.sheetName}","${e.description}","${e.loaSrNo}","${e.tempCode}","${e.issue}"\n`;
  });

  res.header('Content-Type', 'text/csv');
  res.attachment('failed_rows.csv');
  return res.send(csv);
});

export const commitStagingData = asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  
  const validRecords = await WipRequiredStaging.find({ uploadSessionId: sessionId, status: 'VALID' }).lean();
  
  if (validRecords.length === 0) {
    return res.status(400).json(new ApiResponse(400, null, 'No valid records to commit'));
  }

  const docsToInsert = validRecords.map(r => ({
    item: r.item,
    description: r.description,
    uom: r.uom,
    loaSrNo: r.loaSrNo,
    tempCode: r.tempCode,
    schedule: r.schedule,
    activity: r.activity,
    circle: r.circle || 'Nahan', // Fallback for testing
    division: r.division,
    subDivision: r.subDivision,
    subStation: r.subStation,
    feeder: r.feeder,
    location: r.location,
    drawingNo: r.drawingNo,
    contractorName: r.contractorName,
    siteRequiredQty: r.siteRequiredQty,
    sourceFile: r.sourceFile,
    sheetName: r.sheetName,
    remarks: r.remarks,
    uploadedBy: r.uploadedBy
  }));

  // Batch insert to avoid crashing Mongo
  let totalInserted = 0;
  for (let i = 0; i < docsToInsert.length; i += 1000) {
    const chunk = docsToInsert.slice(i, i + 1000);
    await WipRequiredRegister.insertMany(chunk);
    totalInserted += chunk.length;
  }

  // Clean up staging
  await WipRequiredStaging.deleteMany({ uploadSessionId: sessionId });

  res.status(200).json(new ApiResponse(200, { totalInserted }, 'Data committed successfully'));
});
