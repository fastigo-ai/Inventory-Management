const fs = require('fs');
const filePath = 'backend/src/modules/contractors/contractor.controller.ts';
let content = fs.readFileSync(filePath, 'utf8');

const oldCode = `  if (conditions.length > 0) {
    filter.$and = conditions;
  }

  const contractors = await Contractor.find(filter).sort({ 'dynamicData.displayName': 1 });
  res.status(200).json(new ApiResponse(200, contractors, 'Contractors fetched successfully'));`;

const newCode = `  if (conditions.length > 0) {
    filter.$and = conditions;
  }

  const { page, limit } = req.query;
  
  if (page && limit) {
    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * limitNumber;

    const total = await Contractor.countDocuments(filter);
    const contractors = await Contractor.find(filter)
      .sort({ 'dynamicData.displayName': 1 })
      .skip(skip)
      .limit(limitNumber);

    return res.status(200).json(new ApiResponse(200, {
      contractors,
      total,
      page: pageNumber,
      totalPages: Math.ceil(total / limitNumber)
    }, 'Contractors fetched successfully'));
  }

  const contractors = await Contractor.find(filter).sort({ 'dynamicData.displayName': 1 });
  res.status(200).json(new ApiResponse(200, contractors, 'Contractors fetched successfully'));`;

content = content.replace(oldCode, newCode);
fs.writeFileSync(filePath, content);
