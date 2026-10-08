require('ts-node').register(); 
const mongoose = require('mongoose'); 

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  const StoreTransfer = require('../src/modules/store/storeTransfer.schema.ts').StoreTransfer; 
  
  const inTransitAgg = await StoreTransfer.aggregate([
    { $match: { status: 'IN_TRANSIT' } },
    { $unwind: '$items' },
    { $group: { _id: { from: '$fromStore', to: '$toStore' }, qty: { $sum: '$items.dispatchedQty' } } }
  ]);
  
  console.log('--- IN TRANSIT STOCK ---');
  let totalTransit = 0;
  inTransitAgg.forEach(t => {
     console.log(`Dispatched from ${t._id.from || 'Unknown'} --> Heading to ${t._id.to || 'Unknown'} : ${t.qty} units`);
     totalTransit += t.qty;
  });
  console.log(`Total In-Transit: ${totalTransit}\n`);

  const partialAgg = await StoreTransfer.aggregate([
    { $match: { status: 'RECEIVED' } },
    { $unwind: '$items' },
    { $project: { from: '$fromStore', to: '$toStore', diff: { $subtract: [{ $ifNull: ['$items.dispatchedQty', 0] }, { $ifNull: ['$items.receivedQty', 0] }] } } },
    { $match: { diff: { $gt: 0 } } },
    { $group: { _id: { from: '$from', to: '$to' }, qty: { $sum: '$diff' } } }
  ]);
  
  if(partialAgg.length > 0) {
    console.log('--- RECEIVED BUT SHORT (Gap between Dispatched and Received) ---');
    let totalShort = 0;
    partialAgg.forEach(t => {
       console.log(`From ${t._id.from || 'Unknown'} -> To ${t._id.to || 'Unknown'} : ${t.qty} units short`);
       totalShort += t.qty;
    });
    console.log(`Total Shortages: ${totalShort}\n`);
  }

  process.exit(0);
}

run().catch(console.error);
