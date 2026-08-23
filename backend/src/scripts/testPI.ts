import mongoose from 'mongoose';
import { PurchaseInvoice } from '../modules/purchases/purchaseInvoice.schema';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGO_URI || "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";

async function test() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.');
  
  const rawCount = await mongoose.connection.db!.collection('purchaseinvoices').countDocuments();
  console.log(`Raw count: ${rawCount}`);
  
  const modelCount = await PurchaseInvoice.countDocuments({});
  console.log(`Model count: ${modelCount}`);
  
  await mongoose.disconnect();
}

test();
