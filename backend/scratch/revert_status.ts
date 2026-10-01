import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { ClientBill } from '../src/modules/client-billing/clientBill.schema';

dotenv.config();
const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/inventory-management';

async function check() {
  await mongoose.connect(uri);
  const bills = await ClientBill.find({ circle: { $in: ['Solan', 'Kumarhatti', 'Nalagarh', 'solan', 'kumarhatti', 'nalagarh'] } }).limit(5);
  for (const b of bills) {
    b.status = 'Pending PM Approval';
    await b.save();
  }
  console.log('Reverted ' + bills.length + ' bills back to Pending PM Approval');
  process.exit(0);
}
check();
