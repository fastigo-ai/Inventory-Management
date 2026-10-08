require('ts-node').register(); 
const mongoose = require('mongoose'); 

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  
  const JmcRegister = require('../src/modules/jmc/jmc.schema.ts').JmcRegister; 
  const ClientBill = require('../src/modules/client-billing/clientBill.schema.ts').ClientBill; 
  
  const jmcAgg = await JmcRegister.aggregate([
    { $match: { status: 'Approved' } },
    { $group: { _id: null, totalApproved: { $sum: "$approvedAmount" } } }
  ]);
  
  const billAgg = await ClientBill.aggregate([
    { $match: { billType: 'Erection', status: { $in: ['Approved', 'Submitted'] } } },
    { $unwind: "$items" },
    { $group: { _id: null, totalBilled: { $sum: "$items.totalAmount" } } }
  ]);
  
  console.log("JMC Approved Erection Value:", jmcAgg[0]?.totalApproved || 0);
  console.log("Erection Billed Value:", billAgg[0]?.totalBilled || 0);
  
  process.exit(0);
}

run().catch(console.error);
