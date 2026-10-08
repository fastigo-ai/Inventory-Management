require('ts-node').register(); 
const { buildCeoDashboardSummary } = require('../src/modules/dashboard/ceoDashboard.service.ts'); 
const mongoose = require('mongoose'); 

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  
  const StoreInwardEntry = require('../src/modules/store/storeInwardEntry.schema.ts').StoreInwardEntry; 
  const StoreTransfer = require('../src/modules/store/storeTransfer.schema.ts').StoreTransfer; 
  const ContractorAssignment = require('../src/modules/contractors/contractorAssignment.schema.ts').ContractorAssignment; 
  
  const inward = await StoreInwardEntry.aggregate([{ $group: { _id: null, totalInwardQty: { $sum: '$totalQty' } } }]); 
  const totalInwardQty = inward[0]?.totalInwardQty || 0; 
  
  const tiAgg = await StoreTransfer.aggregate([{ $match: { status: 'RECEIVED' } }, { $unwind: '$items' }, { $group: { _id: null, qty: { $sum: '$items.receivedQty' } } }]); 
  const totalTransferInQty = tiAgg[0]?.qty || 0; 
  
  const toAgg = await StoreTransfer.aggregate([{ $match: { status: { $in: ['IN_TRANSIT', 'RECEIVED'] } } }, { $unwind: '$items' }, { $group: { _id: null, qty: { $sum: '$items.dispatchedQty' } } }]); 
  const totalTransferOutQty = toAgg[0]?.qty || 0; 
  
  const minAgg = await ContractorAssignment.aggregate([{ $unwind: '$lineItems' }, { $group: { _id: null, totalIssuedQty: { $sum: '$lineItems.quantity' } } }]); 
  const totalIssuedQty = minAgg[0]?.totalIssuedQty || 0; 
  
  console.log('Inward:', totalInwardQty); 
  console.log('Transfer IN:', totalTransferInQty); 
  console.log('Transfer OUT:', totalTransferOutQty); 
  console.log('MIN (Issued):', totalIssuedQty); 
  console.log('Final Calculated Physical Stock:', totalInwardQty + totalTransferInQty - totalTransferOutQty - totalIssuedQty); 
  process.exit(0);
}

run().catch(console.error);
