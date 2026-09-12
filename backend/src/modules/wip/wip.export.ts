import { Request, Response } from 'express';
import { WipRegister } from './wip.schema';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { ApiResponse } from '../../core/utils/ApiResponse';
import * as xlsx from 'xlsx';

export const exportWipExcel = asyncHandler(async (req: Request, res: Response) => {
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
  const wips = await WipRegister.find(filter).populate('contractorId items.itemId').lean();

  if (!wips || wips.length === 0) {
    return res.status(404).json(new ApiResponse(404, null, 'No WIPs found for export'));
  }

  // Collect all unique items that have claimedQty > 0 across these WIPs
  const itemMap = new Map<string, any>();
  wips.forEach((wip: any) => {
    wip.items.forEach((item: any) => {
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
  const headerRow = ["LOA SR NO", "Sched", "Activity", "Description", "Unit"];
  wips.forEach((wip: any) => {
    headerRow.push("Claimed Qty"); // column for WIP qty
  });
  wsData.push(headerRow);

  // Item rows
  uniqueItems.forEach((item: any) => {
    const d = item.dynamicData || {};
    const row = [
      d.loaSrNo || d.sku || '',
      d.schedule || '',
      d.activity || '',
      d.description || d.name || '',
      d.unit || ''
    ];

    wips.forEach((wip: any) => {
      const wipItem = wip.items.find((i: any) => i.itemId && i.itemId._id.toString() === item._id.toString());
      if (wipItem && wipItem.claimedQty > 0) {
        row.push(wipItem.claimedQty);
      } else {
        row.push(0); // If item not in this WIP or qty 0, put 0
      }
    });

    wsData.push(row);
  });

  const ws = xlsx.utils.aoa_to_sheet(wsData);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'WIP Export');

  const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Disposition', 'attachment; filename="Wip_Export.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  return res.send(buf);
});
