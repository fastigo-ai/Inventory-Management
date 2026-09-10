const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0');
  
  const db = mongoose.connection.db;
  
  const jmcCounts = await db.collection('jmcregisters').aggregate([
    { $group: { _id: "$contractorId", count: { $sum: 1 } } }
  ]).toArray();
  
  const contractorIds = jmcCounts.map(j => j._id).filter(id => id);
  
  const contractors = await db.collection('contractors').find({ _id: { $in: contractorIds } }).toArray();
  
  const results = jmcCounts.map(j => {
    if (!j._id) return { name: "Unknown/Unassigned", count: j.count };
    const c = contractors.find(c => c._id.toString() === j._id.toString());
    if (c) {
      return { name: c.name || c.dynamicData?.companyName || c.dynamicData?.name || c.dynamicData?.vendorName || "Unnamed Contractor", count: j.count };
    }
    return { name: `Deleted Contractor (${j._id})`, count: j.count };
  });
  
  results.sort((a, b) => b.count - a.count);
  
  console.log("Contractors with JMC data:");
  console.table(results);
  
  mongoose.disconnect();
}

run().catch(console.error);
