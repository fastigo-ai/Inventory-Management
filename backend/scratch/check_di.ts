import mongoose from 'mongoose';
import { DI } from '../src/modules/di/di.schema';
async function test() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?retryWrites=true&w=majority');
  
  const di1 = await DI.findOne({ diNumber: '11284-319' }).lean();
  console.log('RCC MUFF:', JSON.stringify(di1.lineItems.find((i: any) => i.itemName.includes('RCC MUFF')), null, 2));

  const di2 = await DI.findOne({ diNumber: '1917-46' }).lean();
  console.log('11 KV DTR 63 KVA:', JSON.stringify(di2.lineItems.find((i: any) => i.itemName.includes('11 KV DTR 63 KVA')), null, 2));
  
  process.exit();
}
test();
