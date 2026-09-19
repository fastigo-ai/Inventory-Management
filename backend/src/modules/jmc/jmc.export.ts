import { Request, Response } from 'express';
import { JmcRegister } from './jmc.schema';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { ApiResponse } from '../../core/utils/ApiResponse';
import mongoose from 'mongoose';
import * as xlsx from 'xlsx';
import Item from '../items/item.model';

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

  // Gather all unique activities from the JMCs
  const uniqueActivities = new Set<string>();
  jmcs.forEach((jmc: any) => {
    (jmc.items || []).forEach((item: any) => {
      if (item.activity && String(item.activity).trim() !== '') {
        uniqueActivities.add(String(item.activity).trim());
      }
    });
  });

  // Collect JMC Circles to fetch relevant master items
  const jmcCircles = new Set<string>();
  jmcs.forEach((jmc: any) => {
    if (jmc.circle) jmcCircles.add(jmc.circle);
  });

  // Fetch all master items for these activities and circles
  const itemFilter: any = {};
  if (jmcCircles.size > 0) {
    itemFilter['dynamicData.circle'] = { $in: Array.from(jmcCircles).map(c => new RegExp(`^${c}$`, 'i')) };
  }
  const items = await Item.find(itemFilter).lean();

  // Group master items by activity
  const itemsByActivity: Record<string, any[]> = {};
  Array.from(uniqueActivities).forEach(act => {
    itemsByActivity[act] = [];
  });

  items.forEach((item: any) => {
    const act = item.dynamicData?.activity ? String(item.dynamicData.activity).trim() : '';
    if (act && uniqueActivities.has(act)) {
      itemsByActivity[act].push(item);
    } else if (act) {
       // Optional: we can include case-insensitive matches
       const lowerAct = act.toLowerCase();
       for (const uAct of uniqueActivities) {
         if (uAct.toLowerCase() === lowerAct) {
           itemsByActivity[uAct].push(item);
           break;
         }
       }
    }
  });

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
  const headerRow = ["SR.NO.", "LOA SR.NO.", "Material Code", "Description", "Unit"];
  jmcs.forEach((jmc: any) => {
    headerRow.push("JMC Qty"); // column for JMC qty
  });
  wsData.push(headerRow);

  let srNo = 1;
  // Iterate through each unique activity present in the JMCs
  Array.from(uniqueActivities).forEach(activity => {
    // Push Activity Header Row (e.g. ["AUGMENTATION DTRS...", "", ""])
    wsData.push([activity, "", "", "", ""]);
    
    const activityItems = itemsByActivity[activity] || [];
    
    activityItems.forEach((masterItem: any) => {
      const d = masterItem.dynamicData || {};
      const tempCode = d.tempCode || masterItem.tempCode || '';
      const loaSrNo = d.loaSrNo || d.loaSerialNo || d.sku || masterItem.sku || '';

      const row = [
        srNo++,
        loaSrNo,
        tempCode,
        d.description || d.itemDescription || d.name || '',
        d.unit || d.uom || ''
      ];

      // For each JMC column, find if this masterItem was claimed
      jmcs.forEach((jmc: any) => {
        const jmcItem = jmc.items.find((i: any) => {
          if (i.itemId && i.itemId._id && masterItem._id) {
            return i.itemId._id.toString() === masterItem._id.toString();
          }
          const actMatch = (i.activity || '').trim().toLowerCase() === (activity || '').trim().toLowerCase();
          if (!actMatch) return false;
          
          const iTemp = String(i.tempCode || '').trim();
          const mTemp = String(tempCode || '').trim();
          const iLoa = String(i.loaSrNo || i.loaSerialNo || '').trim();
          const mLoa = String(loaSrNo || '').trim();
          
          if (iTemp && iLoa && mTemp && mLoa) {
             return iTemp === mTemp && iLoa === mLoa;
          }
          
          const iDesc = String(i.description || i.itemDescription || '').trim().toLowerCase();
          const mDesc = String(d.description || d.itemDescription || d.name || '').trim().toLowerCase();
          
          if (iTemp && mTemp) {
             return iTemp === mTemp && iDesc === mDesc;
          }
          if (iLoa && mLoa) {
             return iLoa === mLoa && iDesc === mDesc;
          }
          return iDesc === mDesc;
        });

        if (jmcItem && (jmcItem.claimedQty > 0 || jmcItem.approvedQty > 0 || jmcItem.quantity > 0)) {
          row.push(jmcItem.approvedQty || jmcItem.claimedQty || jmcItem.quantity);
        } else {
          row.push(0); // output 0 matching UI
        }
      });

      wsData.push(row);
    });
  });

  const ws = xlsx.utils.aoa_to_sheet(wsData);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'JMC Export');

  const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Disposition', 'attachment; filename="Jmc_Export.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  return res.send(buf);
});
