const fs = require('fs');

let content = fs.readFileSync('backend/src/modules/store/store.controller.ts', 'utf8');

const targetStr = `      try {
        await StoreTransfer.create([payload], { session });
        successCount++;
      } catch (err: any) {
        errors.push(\`Error saving Transfer \${docKey}: \${err.message}\`);
      }`;

const replacementStr = `      try {
        await StoreTransfer.create([payload], { session });
        
        // Stock management based on Transfer Qty (receivedQty)
        const fromStoreStr = payload.fromStore && payload.fromStore !== '-' ? payload.fromStore : '';
        const toStoreStr = payload.toStore && payload.toStore !== '-' ? payload.toStore : '';
        
        const fromCircleKey = fromStoreStr ? \`\${fromStoreStr.toLowerCase().replace(/\\s+/g, '')}LoaQuantity\` : null;
        const toCircleKey = toStoreStr ? \`\${toStoreStr.toLowerCase().replace(/\\s+/g, '')}LoaQuantity\` : null;

        for (const lineItem of payload.items) {
          if (lineItem.receivedQty > 0) {
            const item = await Item.findById(lineItem.itemId).session(session);
            if (item) {
              const currentFromQty = fromCircleKey ? Number(item.dynamicData?.[fromCircleKey] || 0) : 0;
              const currentToQty = toCircleKey ? Number(item.dynamicData?.[toCircleKey] || 0) : 0;
              
              const updateData: any = {};
              if (fromCircleKey) updateData[fromCircleKey] = Math.max(0, currentFromQty - lineItem.receivedQty);
              if (toCircleKey) updateData[toCircleKey] = currentToQty + lineItem.receivedQty;

              if (Object.keys(updateData).length > 0) {
                item.dynamicData = {
                  ...item.dynamicData,
                  ...updateData
                };
                item.markModified('dynamicData');
                await item.save({ session });
                
                // Rebuild ItemSummary as item quantity was updated
                SummaryService.rebuildForItem(item._id.toString()).catch(console.error);
              }
            }
          }
        }
        
        successCount++;
      } catch (err: any) {
        errors.push(\`Error saving Transfer \${docKey}: \${err.message}\`);
      }`;

// We only want to replace the SECOND occurrence of this string, which belongs to importStoreOutwardTransfers.
const firstIndex = content.indexOf(targetStr);
const secondIndex = content.indexOf(targetStr, firstIndex + 1);

if (secondIndex !== -1) {
  content = content.slice(0, secondIndex) + replacementStr + content.slice(secondIndex + targetStr.length);
  fs.writeFileSync('backend/src/modules/store/store.controller.ts', content);
  console.log("Successfully updated importStoreOutwardTransfers.");
} else {
  console.log("Could not find the target string.");
}
