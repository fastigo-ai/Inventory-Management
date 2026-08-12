const fs = require('fs');

const filePath = 'backend/src/modules/contractors/contractor.controller.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Inside importContractorReturns:
content = content.replace(
  `  // Group returns by challan No\n  const returnsByChallan: Record<string, any> = {};\n\n  for await (const row of parser) {`,
  `  // Group returns by challan No\n  const returnsByChallan: Record<string, any> = {};\n  const itemCache = new Map();\n\n  for await (const row of parser) {`
);

content = content.replace(
  `      let item = null;\n      if (tempCode) item = await Item.findOne({ itemCode: tempCode });\n      if (!item && itemName) {\n        const escapedItemName = itemName.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&');\n        item = await Item.findOne({ description: { $regex: new RegExp(\`^\\\\s*\${escapedItemName}\\\\s*$\`, 'i') } });\n      }`,
  `      let item = null;\n      const cacheKey = \`\${tempCode}_\${itemName}\`;\n      if (itemCache.has(cacheKey)) {\n        item = itemCache.get(cacheKey);\n      } else {\n        if (tempCode) item = await Item.findOne({ itemCode: tempCode });\n        if (!item && itemName) {\n          const escapedItemName = itemName.replace(/[.*+?^\\$\\{\\}()|[\\]\\\\]/g, '\\\\$&');\n          item = await Item.findOne({ description: { $regex: new RegExp(\`^\\\\s*\${escapedItemName}\\\\s*$\`, 'i') } });\n        }\n        if (item) itemCache.set(cacheKey, item);\n      }`
);

// Inside importContractorAssignments:
content = content.replace(
  `  // Group assignments by MIN No.\n  const assignmentsByMin: Record<string, any> = {};\n\n  for await (const row of parser) {`,
  `  // Group assignments by MIN No.\n  const assignmentsByMin: Record<string, any> = {};\n  const itemCache = new Map();\n\n  for await (const row of parser) {`
);

content = content.replace(
  `      // Find Item\n      let item = null;\n      if (tempCode) {\n        item = await Item.findOne({ itemCode: tempCode });\n      }\n      if (!item && itemName) {\n        const escapedItemName = itemName.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&');\n        item = await Item.findOne({ description: { $regex: new RegExp(\`^\\\\s*\${escapedItemName}\\\\s*$\`, 'i') } });\n      }`,
  `      // Find Item\n      let item = null;\n      const cacheKey = \`\${tempCode}_\${itemName}\`;\n      if (itemCache.has(cacheKey)) {\n        item = itemCache.get(cacheKey);\n      } else {\n        if (tempCode) {\n          item = await Item.findOne({ itemCode: tempCode });\n        }\n        if (!item && itemName) {\n          const escapedItemName = itemName.replace(/[.*+?^\\$\\{\\}()|[\\]\\\\]/g, '\\\\$&');\n          item = await Item.findOne({ description: { $regex: new RegExp(\`^\\\\s*\${escapedItemName}\\\\s*$\`, 'i') } });\n        }\n        if (item) itemCache.set(cacheKey, item);\n      }`
);

fs.writeFileSync(filePath, content);
console.log("Patched API caching for contractors");
