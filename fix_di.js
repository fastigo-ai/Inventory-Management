const fs = require('fs');
let content = fs.readFileSync('backend/src/modules/di/di.controller.ts', 'utf8');

// Replace updateDI
const updateDIRegex = /export const updateDI = asyncHandler\(async \(req: Request, res: Response\) => \{[\s\S]*?  \}\);\n/m;
const updateDIReplacement = `export const updateDI = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;

  const existingDI = await DI.findById(id);
  if (!existingDI) {
    throw new ApiError(404, 'DI not found');
  }

  let parsedLineItems = data.lineItems || [];
  if (typeof parsedLineItems === 'string') {
    try { parsedLineItems = JSON.parse(parsedLineItems); } catch (e) { parsedLineItems = []; }
  }

  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  if (files?.['diLetterCopyUrl']?.[0]) {
    existingDI.diLetterCopyUrl = \`/uploads/dis/\${files['diLetterCopyUrl'][0].filename}\`;
  }
  if (files?.['inspectionReportCopyUrl']?.[0]) {
    existingDI.inspectionReportCopyUrl = \`/uploads/dis/\${files['inspectionReportCopyUrl'][0].filename}\`;
  }

  const hasPr = await Pr.exists({ diNo: existingDI.diNumber });
  const isLocked = existingDI.status === 'Received' || !!hasPr;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let oldLineItems: any[] = [];
    if (isLocked) {
      if (data.notes !== undefined) existingDI.notes = data.notes;
    } else {
      oldLineItems = existingDI.lineItems.map(i => i.toObject());
      if (data.status) existingDI.status = data.status;
      if (data.notes !== undefined) existingDI.notes = data.notes;
      existingDI.lineItems = parsedLineItems;
    }

    const updatedDI = await existingDI.save({ session });

    if (!isLocked) {
      for (const item of oldLineItems) {
        if (!item.itemId) continue;
        await SummaryService.updateSummary({
          itemId: item.itemId.toString(),
          circle: item.circle || existingDI.circle,
          package: item.package || existingDI.package,
          increments: { diQty: -(item.quantity || 0) },
          session
        });
      }
      for (const item of updatedDI.lineItems) {
        if (!item.itemId) continue;
        await SummaryService.updateSummary({
          itemId: item.itemId.toString(),
          circle: item.circle || updatedDI.circle,
          package: item.package || updatedDI.package,
          increments: { diQty: item.quantity || 0 },
          session
        });
      }
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json(new ApiResponse(200, updatedDI, 'DI Updated Successfully'));
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});
`;
content = content.replace(updateDIRegex, updateDIReplacement);

// Replace deleteDI
const deleteDIRegex = /export const deleteDI = asyncHandler\(async \(req: Request, res: Response\) => \{[\s\S]*?  \}\);\n/m;
const deleteDIReplacement = `export const deleteDI = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const di = await DI.findById(id);

  if (!di) {
    throw new ApiError(404, 'DI not found');
  }

  const hasPr = await Pr.exists({ diNo: di.diNumber });
  if (di.status === 'Received' || hasPr) {
    throw new ApiError(400, 'Cannot delete DI as it has been received or linked to PR');
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    for (const item of di.lineItems) {
      if (!item.itemId) continue;
      await SummaryService.updateSummary({
        itemId: item.itemId.toString(),
        circle: item.circle || di.circle,
        package: item.package || di.package,
        increments: { diQty: -(item.quantity || 0) },
        session
      });
    }

    await di.deleteOne({ session });
    
    await session.commitTransaction();
    session.endSession();

    res.status(200).json(new ApiResponse(200, {}, 'DI deleted successfully'));
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});
`;
content = content.replace(deleteDIRegex, deleteDIReplacement);

fs.writeFileSync('backend/src/modules/di/di.controller.ts', content);
console.log('Successfully updated DI controller update/delete with transactions');
