import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import Item from '../modules/items/item.model';

async function checkDuplicates() {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log('Connected to DB...');

    const allItems = await Item.find({ isDeleted: false }).lean();
    console.log(`Total items found: ${allItems.length}`);

    // Group by SKU
    const skuGroups: Record<string, any[]> = {};
    for (const item of allItems) {
      const sku = (item as any).dynamicData?.sku;
      if (sku) {
        if (!skuGroups[sku]) skuGroups[sku] = [];
        skuGroups[sku].push(item);
      }
    }

    let printed = false;
    for (const [sku, items] of Object.entries(skuGroups)) {
      if (items.length > 1 && !printed) {
        console.log(`\nDuplicate Group for SKU: ${sku}`);
        items.forEach((i, idx) => {
           console.log(`\nItem ${idx + 1}:`);
           console.log(`_id: ${i._id}`);
           console.log(`Package: '${(i as any).dynamicData?.package}'`);
           console.log(`Circle: '${(i as any).dynamicData?.circle}'`);
           console.log(`Package (capital P): '${(i as any).dynamicData?.Package}'`);
           console.log(`Circle (capital C): '${(i as any).dynamicData?.Circle}'`);
           console.log(`Name: '${(i as any).dynamicData?.name}'`);
           console.log(`CreatedAt: ${(i as any).createdAt}`);
        });
        printed = true;
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDuplicates();
