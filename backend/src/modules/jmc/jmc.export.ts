import { Request, Response } from 'express';
import { JmcRegister } from './jmc.schema';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { ApiResponse } from '../../core/utils/ApiResponse';
import * as xlsx from 'xlsx';

export const exportJmcExcel = asyncHandler(async (req: Request, res: Response) => {
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
  // Row 9: JMC Number
  const jmcNoRow = ["JMC Number :", "", "", "", ""];
  
  // Row 10: Status
  const statusRow = ["", "", "", "", ""];

  jmcs.forEach((jmc: any) => {
    const contractorName = jmc.contractorId?.name || jmc.contractorId?.vendorName || jmc.contractorId?.dynamicData?.companyName || jmc.contractorId?.dynamicData?.name || '';
    contractorRow.push(contractorName);
    circleRow.push(jmc.circle || '');
    subCircleRow.push(jmc.subCircle || '');
    divRow.push(jmc.division || '');
    subDivRow.push(jmc.subDivision || '');
    subStnRow.push(jmc.subStation || '');
    feederRow.push(jmc.feeder || '');
    locRow.push(jmc.location || '');
    drawRow.push(jmc.package || ''); // Package is mapped to drawing no in import
    jmcNoRow.push(jmc.jmcNumber || '');
    statusRow.push(jmc.status || '');
  });

  wsData.push(contractorRow, circleRow, subCircleRow, divRow, subDivRow, subStnRow, feederRow, locRow, drawRow, jmcNoRow, statusRow);

  // Header row
  const headerRow = ["LOA SR NO", "Sched", "Activity", "Description", "Unit"];
  jmcs.forEach((jmc: any) => {
    headerRow.push("Claimed Qty"); // column for JMC qty
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

    jmcs.forEach((jmc: any) => {
      const jmcItem = jmc.items.find((i: any) => i.itemId && i.itemId._id.toString() === item._id.toString());
      if (jmcItem && jmcItem.claimedQty > 0) {
        row.push(jmcItem.claimedQty);
      } else {
        row.push(0); // If item not in this JMC or qty 0, put 0
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
