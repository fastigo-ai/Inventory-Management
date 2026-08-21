const fs = require('fs');
const file = '/Users/Apple/Desktop/Inventory-Management/backend/src/modules/store/store.controller.ts';
let content = fs.readFileSync(file, 'utf8');

const newApi = `
// ==========================================
// NEW API: Filter Options for MHROV DI Search
// ==========================================
export const getMhrovDIFilterOptions = asyncHandler(async (req: Request, res: Response) => {
  const { circle } = req.query;
  const filter: any = {};
  
  if (circle) {
    filter.$or = [{ circle: circle }, { 'lineItems.circle': circle }];
  }

  const [diNos, vendors] = await Promise.all([
    mongoose.model('DI').distinct('diNumber', filter),
    mongoose.model('DI').distinct('vendorName', filter)
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      diNos: diNos.filter(Boolean),
      vendors: vendors.filter(Boolean),
      invoiceNos: [] // DIs don't have invoices
    }, 'MHROV filter options fetched successfully')
  );
});
`;

// Insert after getInwardFilterOptions
content = content.replace(
  /export const getInwardFilterOptions = asyncHandler\(async \(req: Request, res: Response\) => \{[\s\S]*?\}\);/m,
  `$&` + "\n" + newApi
);

fs.writeFileSync(file, content);
console.log("Added getMhrovDIFilterOptions");
