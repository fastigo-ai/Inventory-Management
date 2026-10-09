import mongoose from 'mongoose';
import Item from '../src/modules/items/item.model';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkItem() {
  const uri = process.env.MONGO_URI || '';
  console.log('Connecting to:', uri);
  await mongoose.connect(uri);
  
  const db = mongoose.connection.db;
  console.log('DB name:', db.databaseName);
  
  const collections = await db.listCollections().toArray();
  console.log('Collections:', collections.map(c => c.name));
  
  // check items count
  const count = await db.collection('items').countDocuments();
  console.log('Items count:', count);
  
  // Get a sample item
  const sample = await db.collection('items').findOne({});
  console.log('Sample item dynamicData keys:', Object.keys(sample?.dynamicData || {}));
  console.log('Sample item dynamicData unit-related fields:',
    JSON.stringify({
      unit: sample?.dynamicData?.unit,
      uom: sample?.dynamicData?.uom,
      unitOfMeasurement: sample?.dynamicData?.unitOfMeasurement,
      Unit: sample?.dynamicData?.Unit,
    })
  );
  
  process.exit(0);
}
checkItem();
