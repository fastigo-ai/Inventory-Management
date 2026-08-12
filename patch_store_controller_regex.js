const fs = require('fs');
const filePath = 'backend/src/modules/store/store.controller.ts';
let content = fs.readFileSync(filePath, 'utf8');

const regexEscapedSearch = `        const escapedItemName = itemName.replace(/[.*+?^\\$\\{\\}()|[\\]\\\\]/g, '\\\\$&');
        item = await Item.findOne({ description: { $regex: new RegExp(\`^\\\\s*\${escapedItemName}\\\\s*$\`, 'i') } });`;

content = content.replace(
  `        item = await Item.findOne({ description: { $regex: new RegExp(\`^\${itemName}$\`, 'i') } });`,
  regexEscapedSearch
);

content = content.replace(
  `        item = await Item.findOne({ description: { $regex: new RegExp(\`^\${itemName}$\`, 'i') } });`,
  regexEscapedSearch
);

fs.writeFileSync(filePath, content);
