const fs = require('fs');

const filePath = 'backend/src/modules/store/store.controller.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Inside importStoreTransfers:
content = content.replace(
  `  // Group rows by ChallanNo or MinNo to bundle them into single StoreTransfer docs\n  const transfersByDoc: Record<string, any> = {};\n  const user = (req as any).user;\n\n  for await (const row of parser) {`,
  `  // Group rows by ChallanNo or MinNo to bundle them into single StoreTransfer docs\n  const transfersByDoc: Record<string, any> = {};\n  const user = (req as any).user;\n  const itemCache = new Map();\n\n  for await (const row of parser) {`
);

content = content.replace(
  `      // Find Item\n      let item = null;\n      if (tempCode) {\n        item = await Item.findOne({ itemCode: tempCode });\n      }\n      if (!item && itemName) {\n        const escapedItemName = itemName.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&');\n        item = await Item.findOne({ description: { $regex: new RegExp(\`^\\\\s*\${escapedItemName}\\\\s*$\`, 'i') } });\n      }`,
  `      // Find Item\n      let item = null;\n      const cacheKey = \`\${tempCode}_\${itemName}\`;\n      if (itemCache.has(cacheKey)) {\n        item = itemCache.get(cacheKey);\n      } else {\n        if (tempCode) {\n          item = await Item.findOne({ itemCode: tempCode });\n        }\n        if (!item && itemName) {\n          const escapedItemName = itemName.replace(/[.*+?^\\$\\{\\}()|[\\]\\\\]/g, '\\\\$&');\n          item = await Item.findOne({ description: { $regex: new RegExp(\`^\\\\s*\${escapedItemName}\\\\s*$\`, 'i') } });\n        }\n        if (item) itemCache.set(cacheKey, item);\n      }`
);

// Inside importStoreInwards:
content = content.replace(
  `  const inwardsByDoc: Record<string, any> = {};\n  const user = (req as any).user;\n\n  for await (const row of parser) {`,
  `  const inwardsByDoc: Record<string, any> = {};\n  const user = (req as any).user;\n  const itemCache = new Map();\n\n  for await (const row of parser) {`
);

content = content.replace(
  `      let item = null;\n      if (tempCode) {\n        item = await Item.findOne({ itemCode: tempCode });\n      }\n      if (!item && itemName) {\n        const escapedItemName = itemName.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&');\n        item = await Item.findOne({ description: { $regex: new RegExp(\`^\\\\s*\${escapedItemName}\\\\s*$\`, 'i') } });\n      }`,
  `      let item = null;\n      const cacheKey = \`\${tempCode}_\${itemName}\`;\n      if (itemCache.has(cacheKey)) {\n        item = itemCache.get(cacheKey);\n      } else {\n        if (tempCode) {\n          item = await Item.findOne({ itemCode: tempCode });\n        }\n        if (!item && itemName) {\n          const escapedItemName = itemName.replace(/[.*+?^\\$\\{\\}()|[\\]\\\\]/g, '\\\\$&');\n          item = await Item.findOne({ description: { $regex: new RegExp(\`^\\\\s*\${escapedItemName}\\\\s*$\`, 'i') } });\n        }\n        if (item) itemCache.set(cacheKey, item);\n      }`
);


fs.writeFileSync(filePath, content);
console.log("Patched API caching");
