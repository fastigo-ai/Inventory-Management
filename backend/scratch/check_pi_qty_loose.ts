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
      if (!di) continue;
      
      const diItem = di.lineItems.find((dLi: any) => {
        const sameId = dLi.itemId?.toString() === li.itemId?.toString();
        const sameName = dLi.itemName?.toLowerCase().trim() === li.itemName?.toLowerCase().trim();
        const sameLoa = dLi.loaSerialNo === li.loaSerialNo;
        const sameCircle = dLi.circle === li.circle;
        
        return (sameId || (sameName && sameCircle)) && (dLi.loaSerialNo === li.loaSerialNo || (!dLi.loaSerialNo && !li.loaSerialNo));
      });

      if (diItem) {
        if (Number(li.quantity || 0) > Number(diItem.quantity || 0)) {
          errors.push('PI ' + pi.invoiceNumber + ' has ' + li.quantity + ' of ' + li.itemName + ', but DI ' + di.diNumber + ' only has ' + diItem.quantity);
        }
      }
    }
  }

  if (errors.length === 0) {
    console.log('STRICT CHECK: 0 items in PI have greater quantity than DI.');
  } else {
    console.log('Found ' + errors.length + ' discrepancies where PI qty > DI qty:');
    errors.forEach(e => console.log(e));
  }
  process.exit();
}
checkQty();
