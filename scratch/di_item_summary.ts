
/**
 * GET /api/v1/di/item-summary
 * Get aggregated matrix of DI line items per circle
 */
export const getDIItemSummary = asyncHandler(async (req: Request, res: Response) => {
  const { package: pkg, circle, search } = req.query;

  const matchStage: any = { status: { $ne: 'Cancelled' } };
  
  if (pkg) {
    matchStage.package = { $regex: new RegExp(pkg as string, 'i') };
  }
  
  if (circle) {
    matchStage.circle = { $regex: new RegExp(circle as string, 'i') };
  }

  // Pipeline for aggregating DI line items
  const pipeline: any[] = [
    { $match: matchStage },
    { $unwind: "$lineItems" },
  ];

  if (search) {
    const s = search.toString();
    pipeline.push({
      $match: {
        $or: [
          { 'lineItems.itemName': { $regex: new RegExp(s, 'i') } },
          { 'lineItems.loaSerialNo': { $regex: new RegExp(s, 'i') } },
          { 'lineItems.tempCode': { $regex: new RegExp(s, 'i') } },
          { 'diNumber': { $regex: new RegExp(s, 'i') } }
        ]
      }
    });
  }

  pipeline.push(
    {
      $project: {
        diNumber: 1,
        package: 1,
        docCircle: "$circle", // fallback circle
        lineItems: 1,
        resolvedCircle: {
          $toLower: { $cond: [{ $ifNull: ["$lineItems.circle", false] }, "$lineItems.circle", "$circle"] }
        },
        resolvedLoa: { $cond: [{ $ifNull: ["$lineItems.loaSerialNo", false] }, "$lineItems.loaSerialNo", "$lineItems.loaSrNo"] }
      }
    },
    {
      $group: {
        _id: {
          loaSerialNo: "$resolvedLoa",
          tempCode: "$lineItems.tempCode",
          itemName: "$lineItems.itemName"
        },
        description: { $first: "$lineItems.description" },
        solanQty: {
          $sum: {
            $cond: [{ $regexMatch: { input: "$resolvedCircle", regex: /solan/i } }, "$lineItems.quantity", 0]
          }
        },
        nahanQty: {
          $sum: {
            $cond: [{ $regexMatch: { input: "$resolvedCircle", regex: /nahan/i } }, "$lineItems.quantity", 0]
          }
        },
        rampurQty: {
          $sum: {
            $cond: [{ $regexMatch: { input: "$resolvedCircle", regex: /rampur/i } }, "$lineItems.quantity", 0]
          }
        },
        rohruQty: {
          $sum: {
            $cond: [{ $regexMatch: { input: "$resolvedCircle", regex: /rohru/i } }, "$lineItems.quantity", 0]
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        loaSerialNo: "$_id.loaSerialNo",
        tempCode: "$_id.tempCode",
        itemName: "$_id.itemName",
        description: 1,
        solanQty: 1,
        nahanQty: 1,
        rampurQty: 1,
        rohruQty: 1,
        totalQty: { $add: ["$solanQty", "$nahanQty", "$rampurQty", "$rohruQty"] }
      }
    },
    {
      $sort: { totalQty: -1 } // Sort by total quantity descending
    }
  );

  const results = await DI.aggregate(pipeline);

  res.status(200).json(new ApiResponse(200, results, 'DI Item Summary fetched successfully'));
});
