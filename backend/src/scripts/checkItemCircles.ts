import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Item from '../modules/items/item.model';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const checkItemCircles = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL;
    if (!MONGO_URI) throw new Error('No MongoDB URI found in environment variables.');

    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB');

    const circles = await Item.distinct('dynamicData.circle');
    console.log('Distinct Item circles in DB:', circles);

    // Let's check some items that user reported:
    // "Distribution Transformer (Ordinary), 11/0.4 kV, 63 KVA"
    const sampleDesc = "Distribution Transformer (Ordinary), 11/0.4 kV, 63 KVA";
    const items = await Item.find({
      'dynamicData.description': { $regex: 'Distribution Transformer', $options: 'i' }
    }).lean();

    console.log(`Found ${items.length} transformer items:`);
    items.forEach((it: any) => {
      console.log({
        id: it._id,
        sku: it.dynamicData?.sku,
        loaSrNo: it.dynamicData?.loaSrNo,
        tempCode: it.dynamicData?.tempCode,
        circle: it.dynamicData?.circle,
        description: it.dynamicData?.description?.substring(0, 50)
      });
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkItemCircles();
