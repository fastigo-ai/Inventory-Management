import mongoose from 'mongoose';
import { PurchaseInvoice } from '../src/modules/purchases/purchaseInvoice.schema';
import { DI } from '../src/modules/di/di.schema';
async function test() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?retryWrites=true&w=majority');
  const pi = await PurchaseInvoice.findOne({ invoiceNumber: '528' }).lean();
  console.log('PI items:', JSON.stringify(pi.lineItems.filter((i: any) => i.itemName.includes('RCC MUFF')), null, 2));

  const di = await DI.findOne({ diNumber: '11284-319' }).lean();
  console.log('DI items:', JSON.stringify(di.lineItems.filter((i: any) => i.itemName.includes('RCC MUFF')), null, 2));
  process.exit();
}
test();
