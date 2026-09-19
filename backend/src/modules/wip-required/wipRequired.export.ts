import { Request, Response } from 'express';
import { WipRequiredRegister } from './wipRequired.schema';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { ApiResponse } from '../../core/utils/ApiResponse';
import * as xlsx from 'xlsx';
import Item from '../items/item.model';

export const exportWipRequiredExcel = asyncHandler(async (req: Request, res: Response) => {
  const { contractorId, startDate, endDate, search, location, feeder, subDivision, subStation } = req.query;

  const filter: any = {};
  if (contractorId) filter.contractorId = contractorId;
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate as string);
    if (endDate) filter.date.$lte = new Date(endDate as string);
  }

  if (location) filter.location = { $regex: new RegExp(location as string, 'i') };
  if (feeder) filter.feeder = { $regex: new RegExp(feeder as string, 'i') };
  if (subDivision) filter.subDivision = { $regex: new RegExp(subDivision as string, 'i') };
  if (subStation) filter.subStation = { $regex: new RegExp(subStation as string, 'i') };

  if (search) {
    const searchRegex = new RegExp(search as string, 'i');
    filter.$or = [
      { wipNumber: searchRegex },
      { package: searchRegex },
      { location: searchRegex },
      { feeder: searchRegex },
      { circle: searchRegex },
      { division: searchRegex },
      { subDivision: searchRegex }
    ];
  }

  // Fetch WIPs
  const wips = await WipRequiredRegister.find(filter).populate('contractorId items.itemId').lean();

  if (!wips || wips.length === 0) {
    return res.status(404).json(new ApiResponse(404, null, 'No WIP Requireds found for export'));
  }

  // Gather all unique activities from the WIPs
  const uniqueActivities = new Set<string>();
  wips.forEach((wip: any) => {
    (wip.items || []).forEach((item: any) => {
      if (item.activity && String(item.activity).trim() !== '') {
        uniqueActivities.add(String(item.activity).trim());
      }
    });
  });

  // Collect WIP Circles to fetch relevant master items
  const wipCircles = new Set<string>();
  wips.forEach((wip: any) => {
    if (wip.circle) wipCircles.add(wip.circle);
  });

  // Fetch all master items for these activities and circles
  const itemFilter: any = {};
  if (wipCircles.size > 0) {
    itemFilter['dynamicData.circle'] = { $in: Array.from(wipCircles).map(c => new RegExp(`^${c}$`, 'i')) };
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
  // 9 Metadata rows
  const wsData: any[][] = [];
  
  // Row 1: Name of Contractor
  const contractorRow = ["Name of Contractor", "", "", "", ""];
  // Row 2: Name Of Circle
  const circleRow = ["Name Of Circle :", "", "", "", ""];
  const subCircleRow = ["Name Of Sub Circle :", "", "", "", ""];
  // Row 3: Name Of Division
  const divRow = ["Name Of Division :", "", "", "", ""];
  // Row 4: Name Of Sub/Division
  const subDivRow = ["Name Of Sub/Division :", "", "", "", ""];
  // Row 5: Name Of Sub/Station
  const subStnRow = ["Name Of Sub/Station :", "", "", "", ""];
  // Row 6: Name Of Feeder
  const feederRow = ["Name Of Feeder :", "", "", "", ""];
  // Row 7: Location
  const locRow = ["Location :", "", "", "", ""];
  // Row 8: Drawing No
  const drawRow = ["Drawing No :", "", "", "", ""];
  // Row 9: WIP Number
  const wipNoRow = ["WIP Number :", "", "", "", ""];
  
  // Row 10: Status
  const statusRow = ["", "", "", "", ""];

  wips.forEach((wip: any) => {
    const contractorName = wip.contractorId?.name || wip.contractorId?.vendorName || wip.contractorId?.dynamicData?.companyName || wip.contractorId?.dynamicData?.name || '';
    contractorRow.push(contractorName);
    circleRow.push(wip.circle || '');
    subCircleRow.push(wip.subCircle || '');
    divRow.push(wip.division || '');
    subDivRow.push(wip.subDivision || '');
    subStnRow.push(wip.subStation || '');
    feederRow.push(wip.feeder || '');
    locRow.push(wip.location || '');
    drawRow.push(wip.package || ''); // Package is mapped to drawing no in import
    wipNoRow.push(wip.wipNumber || '');
    statusRow.push(wip.status || '');
  });

  wsData.push(contractorRow, circleRow, subCircleRow, divRow, subDivRow, subStnRow, feederRow, locRow, drawRow, wipNoRow, statusRow);

  // Header row
  const headerRow = ["SR.NO.", "LOA SR.NO.", "Material Code", "Description", "Unit"];
  wips.forEach((wip: any) => {
    headerRow.push("Claimed Qty"); // column for WIP qty
  });
  wsData.push(headerRow);

  let srNo = 1;
  // Iterate through each unique activity present in the WIPs
  Array.from(uniqueActivities).forEach(activity => {
    // Push Activity Header Row
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

      // For each WIP column, find if this masterItem was claimed
      wips.forEach((wip: any) => {
        const wipItem = wip.items.find((i: any) => {
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

        if (wipItem && (wipItem.claimedQty > 0 || wipItem.approvedQty > 0 || wipItem.quantity > 0 || wipItem.newWipQty > 0 || wipItem.approvedWipQty > 0)) {
          row.push(wipItem.approvedWipQty || wipItem.approvedQty || wipItem.newWipQty || wipItem.claimedQty || wipItem.quantity);
        } else {
          row.push(0);
        }
      });

      wsData.push(row);
    });
  });

  const ws = xlsx.utils.aoa_to_sheet(wsData);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'WIP Export');

  const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Disposition', 'attachment; filename="WipRequired_Export.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  return res.send(buf);
});
