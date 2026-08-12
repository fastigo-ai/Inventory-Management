const fs = require('fs');
const filePath = 'backend/src/modules/contractors/contractor.controller.ts';
let content = fs.readFileSync(filePath, 'utf8');

const oldFunc = `export const getContractors = asyncHandler(async (req: Request, res: Response) => {
  const { location } = req.query;
  const filter: any = { isActive: true };
  
  if (location) {
    filter.$or = [
      { location: location },
      { assignedLocations: location },
      { 'dynamicData.circle': location },
      { 'dynamicData.assignedCircle': location },
      { 'dynamicData.assignedCircles': location },
      // Substring match in case it's a comma separated string
      { 'dynamicData.assignedCircle': { $regex: location, $options: 'i' } }
    ];
  }

  const contractors = await Contractor.find(filter).sort({ 'dynamicData.displayName': 1 });`;

const newFunc = `export const getContractors = asyncHandler(async (req: Request, res: Response) => {
  const { location, search } = req.query;
  const filter: any = { isActive: true };
  
  const conditions = [];

  if (location) {
    conditions.push({
      $or: [
        { location: location },
        { assignedLocations: location },
        { 'dynamicData.circle': location },
        { 'dynamicData.assignedCircle': location },
        { 'dynamicData.assignedCircles': location },
        // Substring match in case it's a comma separated string
        { 'dynamicData.assignedCircle': { $regex: location, $options: 'i' } }
      ]
    });
  }

  if (search) {
    const searchRegex = new RegExp(String(search), 'i');
    conditions.push({
      $or: [
        { 'dynamicData.displayName': searchRegex },
        { 'dynamicData.name': searchRegex },
        { 'dynamicData.companyName': searchRegex },
        { 'dynamicData.vendorName': searchRegex }
      ]
    });
  }

  if (conditions.length > 0) {
    filter.$and = conditions;
  }

  const contractors = await Contractor.find(filter).sort({ 'dynamicData.displayName': 1 });`;

content = content.replace(oldFunc, newFunc);
fs.writeFileSync(filePath, content);
