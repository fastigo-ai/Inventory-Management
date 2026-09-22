const fs = require('fs');
const path = 'backend/src/modules/contractors/contractor.controller.ts';
let content = fs.readFileSync(path, 'utf-8');

if (!content.includes('const normalizeUnit')) {
  content = content.replace(
    /export const bulkImportContractorReturns = asyncHandler\(async \(req: Request, res: Response\) => \{/,
    `const normalizeUnit = (u: string) => String(u).trim().toLowerCase().replace(/\\.$/, '').replace(/s$/, '');\n\nexport const bulkImportContractorReturns = asyncHandler(async (req: Request, res: Response) => {`
  );
  
  // Fix in bulkImportContractorReturns
  content = content.replace(
    /String\(csvUnit\)\.trim\(\)\.replace\(\/\\.\$\/, ''\)\.toLowerCase\(\) !== String\(masterUnit\)\.trim\(\)\.replace\(\/\\.\$\/, ''\)\.toLowerCase\(\)/g,
    `normalizeUnit(csvUnit) !== normalizeUnit(masterUnit)`
  );

  // Fix in importContractorAssignments
  content = content.replace(
    /const expectedUnit = String\(item\.dynamicData\?\.unit \|\| ''\)\.trim\(\)\.toLowerCase\(\)\.replace\(\/\\.\$\/, ''\);\n\s*const providedUnit = String\(unit\)\.trim\(\)\.toLowerCase\(\)\.replace\(\/\\.\$\/, ''\);/g,
    `const expectedUnit = normalizeUnit(item.dynamicData?.unit || '');\n      const providedUnit = normalizeUnit(unit || '');`
  );

  fs.writeFileSync(path, content, 'utf-8');
  console.log("Patched unit mismatch validations");
} else {
  console.log("Already patched");
}
