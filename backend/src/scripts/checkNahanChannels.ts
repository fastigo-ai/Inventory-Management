import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Item from '../modules/items/item.model';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const checkNahanChannels = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL;
    await mongoose.connect(MONGO_URI as string);

    const items = await Item.find({
      'dynamicData.circle': /nahan/i,
      'dynamicData.description': { $regex: 'Channel Iron', $options: 'i' }
    }).lean();

    console.log(`Nahan Channel Iron count: ${items.length}`);
    items.forEach((it: any) => {
      console.log({
        sku: it.dynamicData?.sku,
        tempCode: it.dynamicData?.tempCode,
        desc: it.dynamicData?.description
      });
    });

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

checkNahanChannels();
