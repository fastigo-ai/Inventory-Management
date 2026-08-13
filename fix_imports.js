const fs = require('fs');
let content = fs.readFileSync('backend/src/modules/jmc/jmc.controller.ts', 'utf8');

// The file has imports at the top, then controller methods, then the appended text which starts with "import { Request, Response } from 'express';"

const appendedStartIndex = content.indexOf("import { Request, Response } from 'express';", 50);

if (appendedStartIndex > -1) {
  const originalTop = content.substring(0, appendedStartIndex);
  const appendedBottom = content.substring(appendedStartIndex);
  
  // Extract all the imports from the appended portion
  const bottomImports = appendedBottom.match(/^import .*$/gm);
  
  // Create a new top imports list by adding the missing ones
  const newImports = `
import { Contractor } from '../contractors/contractor.schema';
import { Item } from '../store/item.schema';
import * as xlsx from 'xlsx';
import stringSimilarity from 'string-similarity';
import mongoose from 'mongoose';
`.trim();

  let finalContent = originalTop.replace("import { asyncHandler } from '../../core/utils/asyncHandler';", "import { asyncHandler } from '../../core/utils/asyncHandler';\n" + newImports);
  
  // Remove the imports from the bottom portion
  let cleanedBottom = appendedBottom.replace(/^import .*$/gm, '').trim();
  
  fs.writeFileSync('backend/src/modules/jmc/jmc.controller.ts', finalContent + "\n\n" + cleanedBottom);
  console.log("Fixed imports");
}
