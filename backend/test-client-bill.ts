import mongoose from 'mongoose';
import { ClientBill } from './src/modules/client-billing/clientBill.schema';

mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0').then(async () => {
  const bills = await ClientBill.find({}).sort({ createdAt: -1 }).limit(3).lean();
  
  if (bills.length > 0) {
    bills.forEach(b => {
      console.log(`Bill: ${b.raBillNo}, CreatedAt: ${b.createdAt}`);
      if (b.items && b.items.length > 0) {
        console.log(`  First item refNumber: ${b.items[0].refNumber}`);
        console.log(`  First item diQty: ${b.items[0].diQty}`);
      }
    });
  } else {
    console.log("No bills found");
  }
  process.exit();
});
