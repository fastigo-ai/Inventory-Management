import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/test';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;

    const items = await db.collection('items').find({ 
      'dynamicData.tempCode': '1', 
      'dynamicData.circle': { $regex: /^rampur$/i } 
    }).toArray();
    
    const pkgs: any = {};
    for (const item of items) {
      const p = item.dynamicData.package || '';
      pkgs[p] = (pkgs[p] || 0) + 1;
    }
    console.log(pkgs);

    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
