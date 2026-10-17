import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Item from '../modules/items/item.model';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const findTempCodes = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL;
    await mongoose.connect(MONGO_URI as string);

    // Let's check tempCodes in Nahan:
    // Muffs with concerete filling
    const muffs = await Item.find({
      'dynamicData.description': { $regex: 'Muff', $options: 'i' }
    }).lean();
    console.log('Muffs items:', muffs.map((i: any) => ({
      circle: i.dynamicData?.circle,
      sku: i.dynamicData?.sku,
      tempCode: i.dynamicData?.tempCode,
      desc: i.dynamicData?.description
    })));

    // Channel Iron (100x50x6 mm), Length : 2800 mm
    const channel = await Item.find({
      'dynamicData.description': { $regex: 'Channel Iron.*100.*50', $options: 'i' }
    }).lean();
    console.log('Channel Iron items:', channel.map((i: any) => ({
      circle: i.dynamicData?.circle,
      sku: i.dynamicData?.sku,
      tempCode: i.dynamicData?.tempCode,
      desc: i.dynamicData?.description
    })));

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

findTempCodes();
