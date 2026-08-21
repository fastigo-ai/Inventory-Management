const fs = require('fs');
const path = './backend/src/modules/contractors/contractor.controller.ts';
let code = fs.readFileSync(path, 'utf8');
code = code.replace(
  `export const bulkImportContractorReturns = asyncHandler(async (req: Request, res: Response) => {\n  if (!req.file) {`,
  `export const bulkImportContractorReturns = asyncHandler(async (req: Request, res: Response) => {\n  console.log("Req headers:", req.headers["content-type"]);\n  console.log("Req file:", req.file);\n  console.log("Req body:", req.body);\n  if (!req.file) {`
);
fs.writeFileSync(path, code);
