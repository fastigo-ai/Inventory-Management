import mongoose from 'mongoose';
import { ContractorInvoice } from './src/modules/contractor-billing/contractorInvoice.schema';

mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?retryWrites=true&w=majority').then(async () => {
  const invoices = await ContractorInvoice.find();
  console.log('Found:', invoices.length);
  process.exit();
});
