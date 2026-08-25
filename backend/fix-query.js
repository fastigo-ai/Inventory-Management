const fs = require('fs');
const file = '/Users/Apple/Desktop/Inventory-Management/backend/src/modules/store/store.controller.ts';
let content = fs.readFileSync(file, 'utf8');

const oldApi = content.match(/export const queryDILineItemsForMhrov = asyncHandler\(async \(req: Request, res: Response\) => \{[\s\S]*?\}\);/m)[0];

const newApi = `export const queryDILineItemsForMhrov = asyncHandler(async (req: Request, res: Response) => {
  const { diId, diNo, vendor, itemName, page = 1, limit = 50, excludeMhrovId, circle } = req.query;
  const filter: any = {};
  
  if (diId) filter._id = diId;
  if (diNo && diNo !== 'all') filter.diNumber = diNo;
  if (vendor && vendor !== 'all') filter.vendorName = vendor;
  if (circle) filter.$or = [{ circle: circle }, { 'lineItems.circle': circle }];
  
  // Find matching DIs
  const dis = await mongoose.model('DI').find(filter).lean();
  
  // Find MHROVs to subtract already done quantities
  const mhrovFilter: any = {};
  if (excludeMhrovId) {
    mhrovFilter._id = { $ne: excludeMhrovId };
  }
  const existingMhrovs = await Mhrov.find(mhrovFilter).lean();
  
  const doneQtyMap = new Map<string, number>();
  existingMhrovs.forEach(mhrov => {
    (mhrov.items || []).forEach(item => {
      if (item.diId && item.itemId) {
        const key = \`\${item.diId}_\${item.itemId}\`;
        doneQtyMap.set(key, (doneQtyMap.get(key) || 0) + Number(item.mhrovDoneQty || 0));
      }
    });
  });

  // Extract all relevant line items
  let lineItemsWithStock: any[] = [];
  const uniqueItemIds = new Set<string>();
  
  for (const di of dis) {
    const activeCircle = (circle as string) || (di as any).circle;
    
    for (const li of (di as any).lineItems || []) {
      // Filter by item name if provided
      if (itemName && !li.itemName.toLowerCase().includes((itemName as string).toLowerCase())) {
        continue;
      }
      // Filter by circle if provided (either DI level or Line Item level)
      if (circle) {
        const liCircle = li.circle || (di as any).circle;
        if (liCircle && liCircle.toLowerCase() !== (circle as string).toLowerCase()) {
          continue;
        }
      }
      
      const itemIdStr = li.itemId?.toString();
      const diIdStr = (di as any)._id.toString();
      const key = \`\${diIdStr}_\${itemIdStr}\`;
      const doneQty = doneQtyMap.get(key) || 0;
      const totalQty = Number(li.quantity || 0);
      const remainingQty = Math.max(0, totalQty - doneQty);
      
      if (remainingQty <= 0) continue; // Skip exhausted items
      
      if (li.itemId) {
        uniqueItemIds.add(li.itemId.toString());
      }
      
      lineItemsWithStock.push({
        _id: key, // Use composite key for frontend selection
        diId: {
          _id: diIdStr,
          diNumber: (di as any).diNumber
        },
        diRefNo: (di as any).diNumber,
        vendorName: (di as any).vendorName || "N/A",
        invoiceNumber: "N/A", // DIs don't have this
        invoiceDate: (di as any).date,
        itemName: li.itemName,
        itemIdStr,
        loaSrNo: li.loaSerialNo || '',
        tempCode: li.tempCode || '',
        totalQty,
        remainingQty,
        doneQty,
        activeCircle,
        package: li.package || (di as any).package,
        diLineItem: li // Keep raw line item for reference
      });
    }
  }

  // Bulk fetch items
  const items = await mongoose.model('Item').find({ _id: { $in: Array.from(uniqueItemIds) } }).lean();
  const itemsMap = new Map();
  items.forEach((i: any) => itemsMap.set(i._id.toString(), i));

  // Populate item details
  lineItemsWithStock = lineItemsWithStock.map(li => {
    let loaSrNo = li.loaSrNo;
    let tempCode = li.tempCode;
    let totalLoaQty = 0;
    let circleLoaQty = 0;
    let balanceInStock = 0;
    
    if (li.itemIdStr) {
      const itemMaster = itemsMap.get(li.itemIdStr);
      if (itemMaster && itemMaster.dynamicData) {
        const dd = itemMaster.dynamicData;
        loaSrNo = loaSrNo || dd.loaSrNo || dd.loaSerialNo || dd.sku || '';
        tempCode = tempCode || dd.tempCode || '';
        totalLoaQty = Number(dd.loaQty || dd.loaQuantity || dd.totalLoaQuantity || dd.qty || dd.quantity || 0);
        
        if (li.activeCircle) {
          const circleKey = li.activeCircle.toLowerCase() + 'LoaQuantity';
          if (dd[circleKey]) {
            circleLoaQty = Number(dd[circleKey]);
          }
          
          if (dd.stockLocations && Array.isArray(dd.stockLocations)) {
            const matchingLoc = dd.stockLocations.find((l: any) => 
              l.circle?.toLowerCase() === li.activeCircle.toLowerCase() &&
              (!li.package || l.package?.toLowerCase() === li.package?.toLowerCase())
            );
            if (matchingLoc) {
               balanceInStock = Number(matchingLoc.quantity || 0);
            } else {
               const matchingCircles = dd.stockLocations.filter((l: any) => l.circle?.toLowerCase() === li.activeCircle.toLowerCase());
               balanceInStock = matchingCircles.reduce((sum: number, l: any) => sum + Number(l.quantity || 0), 0);
            }
          }
        }
      }
    }
    
    return {
      ...li,
      loaSrNo,
      tempCode,
      circleLoaQty,
      totalLoaQty,
      balanceInStock,
      itemId: {
        _id: li.itemIdStr,
        itemName: li.itemName,
        dynamicData: {
           loaSrNo,
           tempCode,
           nahanLoaQuantity: circleLoaQty,
           totalLoaQuantity: totalLoaQty,
        }
      },
    };
  });

  // Pagination
  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;
  
  const total = lineItemsWithStock.length;
  const paginatedItems = lineItemsWithStock.slice(skip, skip + limitNum);

  res.status(200).json(
    new ApiResponse(200, {
      entries: paginatedItems,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    }, 'DI Line items fetched successfully')
  );
});`;

content = content.replace(oldApi, newApi);
fs.writeFileSync(file, content);
console.log("Fixed queryDILineItemsForMhrov performance");
