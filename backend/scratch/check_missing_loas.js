const mongoose = require('mongoose');
const { Item } = require('./src/modules/store/item.schema');

async function check() {
  await mongoose.connect('mongodb+srv://developer:6hOq88rS99N7z0Q9@erp-db.lgbl4nv.mongodb.net/fastigo-erp?retryWrites=true&w=majority');
  
  const items = await Item.find({ isDeleted: false, circle: 'Rohru', package: 'Package 2(R/R)' }).lean();
  
  console.log("Missing items:");
  items.forEach(i => {
    const d = i.dynamicData || {};
    const loa = d.loaSrNo || d.loaSerialNo || d.sku || '';
    if (['1304', '1305', '1306', '1307'].includes(loa)) {
      console.log(`LOA: ${loa}, TempCode: ${d.tempCode}, Activity: ${d.activity}`);
    }
  });
  
  process.exit(0);
}
check();
