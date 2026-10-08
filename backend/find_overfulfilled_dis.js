const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  
  const dis = await mongoose.connection.db.collection('dis').find({}).toArray();
  const pis = await mongoose.connection.db.collection('purchaseinvoices').find({}).toArray();
  
  const diStats = {};
  dis.forEach(d => {
      let ordered = 0;
      d.lineItems?.forEach(i => {
          ordered += Number(i.quantity) || 0;
      });
      diStats[d._id.toString()] = { diNumber: d.diNumber, ordered, consumed: 0 };
  });
  
  pis.forEach(pi => {
      pi.lineItems?.forEach(line => {
          if (line.diId && diStats[line.diId.toString()]) {
              diStats[line.diId.toString()].consumed += Number(line.quantity) || Number(line.invoiceQuantity) || 0;
          }
      });
  });
  
  const overfulfilled = [];
  for (const id in diStats) {
      const stats = diStats[id];
      if (stats.ordered > 0 && stats.consumed > stats.ordered) {
          overfulfilled.push({ ...stats, pct: Math.round((stats.consumed / stats.ordered) * 100) });
      }
  }
  
  overfulfilled.sort((a, b) => b.pct - a.pct);
  console.log(`Found ${overfulfilled.length} overfulfilled DIs. Top 10:`);
  console.log(overfulfilled.slice(0, 10));
  
  process.exit(0);
}
run();
