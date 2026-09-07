import mongoose from 'mongoose';
import { ClientBill } from './src/modules/client-billing/clientBill.schema';

mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0').then(async () => {
  const bills = await ClientBill.find({}, 'raBillNo billType stage status autoCreated linkedSupplyBillId createdAt').sort({ createdAt: -1 });
  console.log("Client Bills in DB:");
  console.table(bills.map(b => ({
    raBillNo: b.raBillNo,
    billType: b.billType,
    stage: b.stage,
    status: b.status,
    autoCreated: b.autoCreated
  })));
  process.exit();
});
