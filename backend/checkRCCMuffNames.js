const mongoose = require('mongoose');
const uri = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';

async function run() {
  await mongoose.connect(uri);
  const Item = mongoose.model('Item', new mongoose.Schema({ dynamicData: Object, name: String }));
  const PurchaseInvoice = mongoose.model('PurchaseInvoice', new mongoose.Schema({ status: String, lineItems: Array }));
  
  const items = await Item.find({ 'dynamicData.name': /RCC MUFF/i }).lean();
  console.log('--- Master Items containing RCC MUFF ---');
  items.forEach(it => console.log(`TempCode: ${it.dynamicData.tempCode}, Name: ${it.dynamicData.name}`));

  const pis = await PurchaseInvoice.find({ status: { $ne: 'Cancelled' } }).lean();
  let piTotals = {};
  pis.forEach(pi => {
    (pi.lineItems || []).forEach(li => {
      const name = String(li.itemName || li.name || '').trim().toLowerCase();
      if (name.includes('rcc muff')) {
        piTotals[li.tempCode] = (piTotals[li.tempCode] || 0) + Number(li.quantity || 0);
      }
    });
  });

  console.log('\n--- PI Totals for items with RCC MUFF in name ---');
  console.log(piTotals);

  mongoose.disconnect();
}
run().catch(console.error);
