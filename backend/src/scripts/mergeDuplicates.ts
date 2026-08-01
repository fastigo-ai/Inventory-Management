import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import Item from '../modules/items/item.model';

async function mergeDuplicates() {
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

    let deletedCount = 0;
    
    for (const [sku, items] of Object.entries(skuGroups)) {
      if (items.length > 1) {
        // We have duplicates for this SKU
        const withPackageAndCircle = items.filter(i => (i as any).dynamicData?.package && (i as any).dynamicData?.circle);
        const withoutPackageAndCircle = items.filter(i => !(i as any).dynamicData?.package || !(i as any).dynamicData?.circle);

        if (withPackageAndCircle.length > 0 && withoutPackageAndCircle.length > 0) {
           // Delete the ones without package/circle
           for (const oldItem of withoutPackageAndCircle) {
             await Item.deleteOne({ _id: oldItem._id });
             deletedCount++;
           }
        }
      }
    }

    console.log(`Successfully deleted ${deletedCount} old duplicate items that were missing Package/Circle.`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

mergeDuplicates();
