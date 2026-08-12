const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/const escapedItemName = itemName\.replace\(\/\[\.\*\+\?\^\$\{\}\(\)\|\[\\\]\\\\\]\/g, '\\\\\$&'\);/g, 
    "const escapedItemName = itemName.replace(/[-\\\\/\\\\\\\\^$*+?.()|[\\\\]{}]/g, '\\\\\\\\$&');");
  fs.writeFileSync(filePath, content);
}

fixFile('backend/src/modules/store/store.controller.ts');
fixFile('backend/src/modules/contractors/contractor.controller.ts');
console.log('Fixed');
