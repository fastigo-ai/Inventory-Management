import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Item from '../modules/items/item.model';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const checkSpecificItems = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL;
    await mongoose.connect(MONGO_URI as string);

    // Let's check what SKU exists in the sheet for these rows.
    // In our earlier test, we saw that SKU '1460', '1461', '1462', '1463' ... '1490'
    // are actual LOA Serial Numbers / SKUs in the Solan LOA!
    const testSkus = ['1460', '1461', '1462', '1463', '1464', '1465', '1466', '1474', '1475', '1481', '1484', '1488', '1489', '1490'];
    const items = await Item.find({ 'dynamicData.sku': { $in: testSkus } }).lean();

    console.log(`=== Found ${items.length} items with SKUs matching the sheet rows: ===`);
    items.forEach((it: any) => {
      console.log(`SKU: ${it.dynamicData?.sku} | Circle: ${it.dynamicData?.circle} | TempCode: ${it.dynamicData?.tempCode} | Description: ${it.dynamicData?.description}`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

checkSpecificItems();
