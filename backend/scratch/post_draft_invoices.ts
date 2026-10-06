import mongoose from 'mongoose';
import { PurchaseInvoice } from '../src/modules/purchases/purchaseInvoice.schema';

async function postDrafts() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?retryWrites=true&w=majority');
  
  const drafts = await PurchaseInvoice.find({ status: 'Draft' }).lean();
  console.log('Found ' + drafts.length + ' Draft invoices.');
  
  if (drafts.length > 0) {
    const res = await PurchaseInvoice.updateMany({ status: 'Draft' }, { $set: { status: 'Posted' } });
    console.log('Updated ' + res.modifiedCount + ' invoices to Posted.');
  }
  process.exit();
}
postDrafts();
