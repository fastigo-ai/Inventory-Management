require('ts-node').register(); 
const mongoose = require('mongoose'); 

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  
  const JmcRegister = require('../src/modules/jmc/jmc.schema.ts').JmcRegister; 
  
  const jmcs = await JmcRegister.find({ status: { $ne: 'Approved' } });
  
  let count = 0;
  for (const jmc of jmcs) {
    jmc.status = 'Approved';
    jmc.approvedAmount = jmc.claimedAmount || 0;
    
    if (jmc.items && jmc.items.length > 0) {
      for (const item of jmc.items) {
        item.approvedQty = item.claimedQty || 0;
      }
    }
    
    await jmc.save();
    count++;
  }
  
  console.log(`Successfully approved ${count} JMC records!`);
  
  process.exit(0);
}

run().catch(console.error);
