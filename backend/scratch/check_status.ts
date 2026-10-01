import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { ClientBill } from '../src/modules/client-billing/clientBill.schema';

dotenv.config();
const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/inventory-management';

async function check() {
  await mongoose.connect(uri);
  const bills = await ClientBill.find({ circle: { $in: ['Solan', 'Kumarhatti', 'Nalagarh', 'solan', 'kumarhatti', 'nalagarh'] } });
  const counts = {};
  bills.forEach(b => { counts[b.status] = (counts[b.status] || 0) + 1; });
  console.log(counts);
  process.exit(0);
}
check();
