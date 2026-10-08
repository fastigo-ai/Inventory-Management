require('ts-node').register(); 
const mongoose = require('mongoose'); 

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  
  try {
    const ClientBill = require('../src/modules/client-billing/clientBill.schema.ts').ClientBill; 
    const res = await ClientBill.aggregate([
      { $unwind: '$items' },
      { $group: { _id: { status: '$status', type: '$billType' }, totalValue: { $sum: '$items.totalAmount' }, count: { $sum: 1 } } }
    ]);
    console.log("ClientBill fixed:", JSON.stringify(res, null, 2));
  } catch (e) {
    console.log("Error checking ClientBill:", e.message);
  }

  process.exit(0);
}

run().catch(console.error);
