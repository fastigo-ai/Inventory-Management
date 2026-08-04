const fs = require('fs');
const path = './backend/src/modules/items/item.controller.ts';

let content = fs.readFileSync(path, 'utf8');

// Replace the single batch processing with a chunked one
const oldLogic = `
  if (validItems.length > 0) {
    const orConditions = validItems.map(item => ({
      'dynamicData.sku': item.dynamicData.sku,
      'dynamicData.package': item.dynamicData.package,
      'dynamicData.circle': item.dynamicData.circle
    })).filter(c => c['dynamicData.sku']);
    
    const existingItemsMap = new Map();
    if (orConditions.length > 0) {
      const existingItems = await Item.find({ $or: orConditions }).lean();
      for (const existing of existingItems) {
        const ext = existing as any;
        const key = \`\${ext.dynamicData?.package || ''}|\${ext.dynamicData?.circle || ''}|\${ext.dynamicData?.sku || ''}\`;
        existingItemsMap.set(key, existing);
      }
    }

    for (const item of validItems) {
      const key = \`\${item.dynamicData.package || ''}|\${item.dynamicData.circle || ''}|\${item.dynamicData.sku || ''}\`;
      const matchedExisting = existingItemsMap.get(key);

      if (matchedExisting) {
         bulkOps.push({
            updateOne: {
               filter: { _id: matchedExisting._id },
               update: {
                  $set: {
                     dynamicData: { ...matchedExisting.dynamicData, ...item.dynamicData }
                  },
                  $push: {
                     history: { action: 'Updated via Import', performedBy: (req as any).user?._id || 'system', date: new Date() }
                  }
               }
            }
         });
      } else {
         bulkOps.push({
            insertOne: {
               document: item
            }
         });
      }
    }
  }

  if (bulkOps.length > 0) {
    await Item.bulkWrite(bulkOps);
`;

const newLogic = `
  // Chunk helper
  const chunkArray = (arr, size) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  };

  if (validItems.length > 0) {
    const itemChunks = chunkArray(validItems, 1000);
    
    for (const chunk of itemChunks) {
      const orConditions = chunk.map(item => ({
        'dynamicData.sku': item.dynamicData.sku,
        'dynamicData.package': item.dynamicData.package,
        'dynamicData.circle': item.dynamicData.circle
      })).filter(c => c['dynamicData.sku']);
      
      const existingItemsMap = new Map();
      if (orConditions.length > 0) {
        const existingItems = await Item.find({ $or: orConditions }).lean();
        for (const existing of existingItems) {
          const ext = existing;
          const key = \`\${ext.dynamicData?.package || ''}|\${ext.dynamicData?.circle || ''}|\${ext.dynamicData?.sku || ''}\`;
          existingItemsMap.set(key, existing);
        }
      }

      const chunkOps = [];
      for (const item of chunk) {
        const key = \`\${item.dynamicData.package || ''}|\${item.dynamicData.circle || ''}|\${item.dynamicData.sku || ''}\`;
        const matchedExisting = existingItemsMap.get(key);

        if (matchedExisting) {
           chunkOps.push({
              updateOne: {
                 filter: { _id: matchedExisting._id },
                 update: {
                    $set: {
                       dynamicData: { ...matchedExisting.dynamicData, ...item.dynamicData }
                    },
                    $push: {
                       history: { action: 'Updated via Import', performedBy: req.user?._id || 'system', date: new Date() }
                    }
                 }
              }
           });
        } else {
           chunkOps.push({
              insertOne: {
                 document: item
              }
           });
        }
      }
      
      if (chunkOps.length > 0) {
        await Item.bulkWrite(chunkOps);
      }
    }
  }

  if (validItems.length > 0) { // To keep block structure for following code
`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync(path, content);
