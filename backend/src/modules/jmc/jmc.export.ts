import { Request, Response } from 'express';
import { JmcRegister } from './jmc.schema';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { ApiResponse } from '../../core/utils/ApiResponse';
import mongoose from 'mongoose';
import * as xlsx from 'xlsx';

export const exportJmcExcel = asyncHandler(async (req: Request, res: Response) => {
  const { contractorId, startDate, endDate, search, location, feeder, division, subDivision, subStation, circle } = req.query;
  const user = (req as any).user;

  const filter: any = {};
  
  const isAdmin = user?.role?.name === 'Admin' || user?.role?.name === 'Super Admin' || user?.role?.permissions?.includes('*');

  // Role-based filtering (mirrored from getJmcs)
  if (user && user.role?.name === 'Contractor' && user.contractorId) {
    filter.contractorId = new mongoose.Types.ObjectId(user.contractorId);
  } else if (contractorId && contractorId !== 'All') {
    filter.contractorId = new mongoose.Types.ObjectId(contractorId as string);
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
  } else if (circle) {
    filter.circle = { $regex: new RegExp(circle as string, 'i') };
  }

  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate as string);
    if (endDate) {
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      filter.date.$lte = end;
    }
  }

  if (location) filter.location = { $regex: new RegExp(location as string, 'i') };
  if (feeder) filter.feeder = { $regex: new RegExp(feeder as string, 'i') };
  if (division) filter.division = { $regex: new RegExp(division as string, 'i') };
  if (subDivision) filter.subDivision = { $regex: new RegExp(subDivision as string, 'i') };
  if (subStation) filter.subStation = { $regex: new RegExp(subStation as string, 'i') };

  if (search && (search as string).trim() !== '') {
    const searchRegex = new RegExp(search as string, 'i');
    filter.$or = [
      { jmcNumber: searchRegex },
      { package: searchRegex },
      { location: searchRegex },
      { feeder: searchRegex },
      { circle: searchRegex },
      { division: searchRegex },
      { subDivision: searchRegex }
    ];
  }

  // Fetch JMCs
  const jmcs = await JmcRegister.find(filter).populate('contractorId items.itemId').lean();

  if (!jmcs || jmcs.length === 0) {
    return res.status(404).json(new ApiResponse(404, null, 'No JMCs found for export'));
  }

  // Collect all unique items that have claimedQty > 0 across these JMCs
  const itemMap = new Map<string, any>();
  jmcs.forEach((jmc: any) => {
    jmc.items.forEach((item: any) => {
      if (item.claimedQty > 0 && item.itemId) {
        const idStr = item.itemId._id.toString();
        if (!itemMap.has(idStr)) {
          itemMap.set(idStr, item.itemId);
        }
      }
    });
  });

  const uniqueItems = Array.from(itemMap.values());

  // Generate Excel Data
  const wsData: any[][] = [];
  
  // Create padded metadata rows mapping strictly to the JMC Portal layout
  // Column 0 is empty, Column 1 is Label, Column 2 is empty, Columns 3+ are Values
  const circleRow = ["", "Name Of Circle :", ""];
  const divRow = ["", "Name Of Division :", ""];
  const subDivRow = ["", "Name Of Sub/Division :", ""];
  const subStnRow = ["", "Name Of Sub/Station :", ""];
  const feederRow = ["", "Name Of Feeder :", ""];
  const locRow = ["", "Location :", ""];
  const drawRow = ["", "Drawing No :", ""];
  const contractorRow = ["", "Name of Contractor", ""];
  const jmcNoRow = ["", "JMC Number :", ""];
  const statusRow = ["", "Status :", ""];

  jmcs.forEach((jmc: any) => {
    circleRow.push(jmc.circle || '');
    divRow.push(jmc.division || '');
    subDivRow.push(jmc.subDivision || '');
    subStnRow.push(jmc.subStation || '');
    feederRow.push(jmc.feeder || '');
    locRow.push(jmc.location || '');
    drawRow.push(jmc.package || ''); // Package is mapped to drawing no in import
    
    const contractorName = jmc.contractorId?.name || jmc.contractorId?.vendorName || jmc.contractorId?.dynamicData?.companyName || jmc.contractorId?.dynamicData?.name || '';
    contractorRow.push(contractorName);
    
    jmcNoRow.push(jmc.jmcNumber || '');
    statusRow.push(jmc.status || '');
  });

  // Push metadata rows in order matching JMC PORTAL.xlsx
  wsData.push(
    circleRow, 
    divRow, 
    subDivRow, 
    subStnRow, 
    feederRow, 
    locRow, 
    drawRow, 
    contractorRow, 
    jmcNoRow, 
    statusRow
  );

  // Item Headers
  const headerRow = ["LOA SR.NO.", "Description", "Unit"];
  jmcs.forEach((jmc: any) => {
    headerRow.push("JMC"); // column for JMC qty
  });
  wsData.push(headerRow);

  // Item rows
  uniqueItems.forEach((item: any) => {
    const d = item.dynamicData || {};
    const row = [
      d.loaSrNo || d.sku || '',
      d.description || d.name || '',
      d.unit || d.uom || ''
    ];

    jmcs.forEach((jmc: any) => {
      const jmcItem = jmc.items.find((i: any) => i.itemId && i.itemId._id.toString() === item._id.toString());
      if (jmcItem && jmcItem.claimedQty > 0) {
        row.push(jmcItem.claimedQty);
      } else {
        row.push(''); // Empty string instead of 0 to keep it clean, matching template
      }
    });

    wsData.push(row);
  });

  const ws = xlsx.utils.aoa_to_sheet(wsData);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'JMC Export');

  const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Disposition', 'attachment; filename="Jmc_Export.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  return res.send(buf);
});
