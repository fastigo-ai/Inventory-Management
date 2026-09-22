const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb+srv://developer:6hOq88rS99N7z0Q9@erp-db.lgbl4nv.mongodb.net/fastigo-erp?retryWrites=true&w=majority');
  const db = mongoose.connection.db;
  
  const items = await db.collection('items').find({ isDeleted: false, circle: 'Rohru', package: 'Package 2(R/R)' }).toArray();
  
  const temp87 = items.filter(i => (i.dynamicData || {}).tempCode == '87' || (i.dynamicData || {}).temp_code == '87');
  
  temp87.forEach(i => {
    console.log(`ID: ${i._id}, Name: ${i.dynamicData.name}, LOA: ${i.dynamicData.sku || i.dynamicData.loaSrNo}`);
  });
  
  process.exit(0);
}
check();
