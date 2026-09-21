import mongoose from 'mongoose';
import Item from '../src/modules/items/item.model';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory');
    
    const item = await Item.findOne({}).lean();
    console.log("Single item structure:", JSON.stringify(item, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
