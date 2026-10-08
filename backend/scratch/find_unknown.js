require('ts-node').register(); 
const mongoose = require('mongoose'); 

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  
  const StoreTransfer = require('../src/modules/store/storeTransfer.schema.ts').StoreTransfer; 
  const User = require('../src/modules/users/user.model.ts').User; 
  
  // Also check if fromStore is literally "Unknown Store" string.
  const docs = await StoreTransfer.find({ 
    status: 'IN_TRANSIT', 
    $or: [{fromStore: null}, {fromStore: ''}, {fromStore: 'Unknown Store'}] 
  }).populate('requestedBy');
  
  const res = docs.map(d => ({
    id: d._id,
    date: d.createdAt,
    requestedBy: d.requestedBy?.email || d.requestedBy?.firstName || d.requestedBy || 'Unknown',
    toStore: d.toStore,
    totalDispatched: d.items.reduce((s, i) => s + (i.dispatchedQty || 0), 0)
  }));
  
  console.log(JSON.stringify(res, null, 2));
  process.exit(0);
}

run().catch(console.error);
