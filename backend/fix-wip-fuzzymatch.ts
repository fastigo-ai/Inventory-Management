import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import stringSimilarity from 'string-similarity';

dotenv.config({ path: path.resolve(__dirname, '.env') });

import { WipRequiredRegister } from './src/modules/wip-required/wipRequired.schema';
import { WipRegister } from './src/modules/wip/wip.schema';
import Item from './src/modules/items/item.model';

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
  console.log('Connected to DB');

  const allItems = await Item.find({}).lean() as any[];
  const itemNames = allItems.map(i => i.name || '').filter(Boolean);

  console.log(`Loaded ${allItems.length} items from master list. Proceeding to fix unmatched items.`);

  const fixDocuments = async (Model: any, modelName: string) => {
    const docs = await Model.find({});
    let docsUpdated = 0;
    let itemsFixed = 0;

    for (const doc of docs) {
      let changed = false;
      if (doc.items && Array.isArray(doc.items)) {
        for (const it of doc.items as any) {
          // If itemId is missing, try fuzzy match
          if (!it.itemId && it.description && itemNames.length > 0) {
            const bestMatch = stringSimilarity.findBestMatch(String(it.description), itemNames);
            if (bestMatch.bestMatch.rating > 0.6) {
              const matchedItem = allItems.find(i => {
                const desc = String(i.dynamicData?.description || i.dynamicData?.name || i.name || '');
                return desc === bestMatch.bestMatch.target || i.name === bestMatch.bestMatch.target;
              });
              
              if (matchedItem) {
                it.itemId = matchedItem._id;
                it.tempCode = matchedItem.dynamicData?.tempCode || '';
                it.loaSerialNo = matchedItem.dynamicData?.sku || matchedItem.dynamicData?.loaSerialNo || '';
                changed = true;
                itemsFixed++;
              }
            }
          }
        }
      }
      if (changed) {
        doc.markModified('items');
        await doc.save();
        docsUpdated++;
      }
    }
    console.log(`${modelName}: Updated ${docsUpdated} documents, fixed ${itemsFixed} items.`);
  };

  await fixDocuments(WipRequiredRegister, 'WipRequiredRegister');
  await fixDocuments(WipRegister, 'WipRegister');

  await mongoose.disconnect();
  console.log('Done');
}

run().catch(console.error);
