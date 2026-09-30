import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/erp_db';

const itemSchema = new mongoose.Schema({}, { strict: false });
const Item = mongoose.models.Item || mongoose.model('Item', itemSchema);

async function run() {
    await mongoose.connect(MONGO_URI);
    const items = await Item.find().limit(5).lean() as any[];
    console.log(JSON.stringify(items[0], null, 2));
    process.exit(0);
}
run();
