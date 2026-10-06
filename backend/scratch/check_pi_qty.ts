import mongoose from 'mongoose';
import { PurchaseInvoice } from '../src/modules/purchases/purchaseInvoice.schema';
import { DI } from '../src/modules/di/di.schema';

async function checkQty() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?retryWrites=true&w=majority');
  
  const pis = await PurchaseInvoice.find({ status: { $ne: 'Cancelled' } }).lean();
  const diIds = Array.from(new Set(pis.flatMap((pi: any) => pi.lineItems.map((li: any) => li.diId?.toString())).filter(Boolean)));
  const dis = await DI.find({ _id: { $in: diIds } }).lean();
  const diMap = new Map(dis.map((di: any) => [di._id.toString(), di]));

  const errors = [];

  for (const pi of pis) {
    for (const li of pi.lineItems) {
      if (!li.diId) continue;
      const di = diMap.get(li.diId.toString());
      if (!di) {
        errors.push('PI ' + pi.invoiceNumber + ' references missing DI.');
        continue;
      }
      
      const diItem = di.lineItems.find((dLi: any) => 
        dLi.itemId?.toString() === li.itemId?.toString() && 
        (dLi.loaSerialNo === li.loaSerialNo || (!dLi.loaSerialNo && !li.loaSerialNo))
      );

      if (!diItem) {
        errors.push('PI ' + pi.invoiceNumber + ' has item ' + li.itemName + ' but NOT found in DI ' + di.diNumber);
      } else if (Number(li.quantity || 0) > Number(diItem.quantity || 0)) {
        errors.push('PI ' + pi.invoiceNumber + ' has ' + li.quantity + ' of ' + li.itemName + ', but DI ' + di.diNumber + ' only has ' + diItem.quantity);
      }
    }
  }

  if (errors.length === 0) {
    console.log('All PI item quantities are within their DI item limits!');
  } else {
    console.log('Found ' + errors.length + ' discrepancies:');
    errors.slice(0, 50).forEach(e => console.log(e));
  }
  process.exit();
}
checkQty();
