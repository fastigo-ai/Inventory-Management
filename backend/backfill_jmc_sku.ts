import 'dotenv/config';
import connectDB from './src/core/database';
import { JmcRegister } from './src/modules/jmc/jmc.schema';
import Item from './src/modules/items/item.model';
import mongoose from 'mongoose';
import stringSimilarity from 'string-similarity';

async function run() {
  await connectDB();
  
  const allItems = await Item.find({}).lean();
  const jmcs = await JmcRegister.find({});
  let updatedCount = 0;

  for (const jmc of jmcs) {
    let modified = false;
    
    for (const item of jmc.items) {
      if (!item.loaSerialNo && item.description) {
        let candidateItems = allItems;
        const uploadedCircle = jmc.circle || '';
        
        if (uploadedCircle) {
          candidateItems = candidateItems.filter((i: any) => {
             const c = i.dynamicData?.circle || '';
             return c.toLowerCase() === uploadedCircle.toLowerCase() || 
                    c.toLowerCase().includes(uploadedCircle.toLowerCase()) ||
                    uploadedCircle.toLowerCase().includes(c.toLowerCase());
          });
        }
        
        if (candidateItems.length === 0) {
           candidateItems = allItems;
        }
        
        const descriptions = candidateItems.map((i: any) => String(i.dynamicData?.description || i.dynamicData?.name || '')).filter(Boolean);
        
        if (descriptions.length > 0) {
          const bestMatch = stringSimilarity.findBestMatch(String(item.description), descriptions);
          if (bestMatch.bestMatch.rating > 0.4) {
            const matchedItem = candidateItems.find((i: any) => {
              const desc = String(i.dynamicData?.description || i.dynamicData?.name || '');
              return desc === bestMatch.bestMatch.target;
            });
            
            if (matchedItem && matchedItem.dynamicData?.sku) {
              item.loaSerialNo = matchedItem.dynamicData.sku;
              modified = true;
            }
          }
        }
      }
    }
    
    if (modified) {
      await jmc.save();
      updatedCount++;
    }
  }

  console.log(`Backfilled LOA Serial No for ${updatedCount} JMC records.`);
  mongoose.connection.close();
}

run();
