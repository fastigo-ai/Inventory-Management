import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Item from '../modules/items/item.model';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const investigateRows = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL;
    if (!MONGO_URI) throw new Error('No MongoDB URI found in environment variables.');
    await mongoose.connect(MONGO_URI);

    // Let's check SKU 1460, 1461, etc. in Solan vs Nahan
    const skus = ['1460', '1461', '1462', '1463', '1464', '1465', '1466'];
    const items = await Item.find({ 'dynamicData.sku': { $in: skus } }).lean();

    console.log(`Found ${items.length} items for SKUs ${skus.join(', ')}:`);
    items.forEach((it: any) => {
      console.log({
        sku: it.dynamicData?.sku,
        tempCode: it.dynamicData?.tempCode,
        circle: it.dynamicData?.circle,
        desc: it.dynamicData?.description
      });
    });

    // Let's also check if there are Nahan items with similar descriptions
    const descPoles = await Item.find({
      'dynamicData.circle': /nahan/i,
      'dynamicData.description': { $regex: 'Steel Tubular Poles', $options: 'i' }
    }).lean();

    console.log(`Nahan Steel Tubular Poles count: ${descPoles.length}`);
    descPoles.forEach((it: any) => {
      console.log({
        sku: it.dynamicData?.sku,
        tempCode: it.dynamicData?.tempCode,
        circle: it.dynamicData?.circle,
        desc: it.dynamicData?.description
      });
    });

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

investigateRows();
