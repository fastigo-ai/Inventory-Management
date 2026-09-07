import mongoose from 'mongoose';
import { ClientBill } from './src/modules/client-billing/clientBill.schema';

mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0').then(async () => {
  const result = await ClientBill.updateMany(
    { billType: 'Erection', stage: '60%' },
    { $set: { stage: '90%' } }
  );
  console.log(`Updated ${result.modifiedCount} bills from 60% to 90% for Erection.`);
  process.exit();
});
