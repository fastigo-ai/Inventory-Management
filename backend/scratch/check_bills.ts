import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/inventory-management';

async function check() {
  await mongoose.connect(uri);
  
  const ClientBill = mongoose.connection.collection('clientbills');
  const bills = await ClientBill.find({ circle: { $in: ['Solan', 'Kumarhatti', 'Nalagarh', 'solan', 'kumarhatti', 'nalagarh'] } }).toArray();
  
  const statusCounts: any = {};
  bills.forEach(b => {
    statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
  });
  
  console.log('Total Solan Client Bills:', bills.length);
  console.log('Statuses:', statusCounts);
  
  process.exit(0);
}

check().catch(console.error);
