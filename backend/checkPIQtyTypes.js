const mongoose = require('mongoose');
const uri = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';

async function run() {
  await mongoose.connect(uri);
  const PurchaseInvoice = mongoose.model('PurchaseInvoice', new mongoose.Schema({ status: String, invoiceNo: String, lineItems: Array }));
  
  const pis = await PurchaseInvoice.find({ status: { $ne: 'Cancelled' } }).lean();
  
  let stringQtyCount = 0;
  let numericQtyCount = 0;
  let missingQtyCount = 0;
  
  let stringQtySum = 0;
  let numericQtySum = 0;

  pis.forEach(pi => {
    (pi.lineItems || []).forEach(li => {
      if (String(li.tempCode).trim() === '4') {
        if (typeof li.quantity === 'string') {
          stringQtyCount++;
          stringQtySum += Number(li.quantity);
        } else if (typeof li.quantity === 'number') {
          numericQtyCount++;
          numericQtySum += li.quantity;
        } else {
          missingQtyCount++;
        }
      }
    });
  });

  console.log(`String Quantities: ${stringQtyCount} (Total: ${stringQtySum})`);
  console.log(`Numeric Quantities: ${numericQtyCount} (Total: ${numericQtySum})`);
  console.log(`Missing Quantities: ${missingQtyCount}`);
  console.log(`GRAND TOTAL: ${stringQtySum + numericQtySum}`);

  mongoose.disconnect();
}
run().catch(console.error);
