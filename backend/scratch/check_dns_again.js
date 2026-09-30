const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/erp')
  .then(async () => {
    const db = mongoose.connection.db;
    const dns = await db.collection('demandnotes').find({}).sort({ createdAt: -1 }).limit(5).toArray();
    console.log("Recent Demand Notes:");
    dns.forEach(dn => {
      console.log(`- ${dn.demandNoteNumber} | Status: ${dn.status} | Circle: ${dn.circle} | Subcircle: ${dn.subcircle}`);
    });
    process.exit();
  })
  .catch(err => console.error(err));
