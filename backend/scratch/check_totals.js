const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/erp').then(async () => {
  const inward = mongoose.connection.collection('storeinwardentries');
  const assignment = mongoose.connection.collection('contractorassignments');

  const inwardAgg = await inward.aggregate([{ $group: { _id: null, total: { $sum: '$totalQty' } } }]).toArray();
  const issuedAgg = await assignment.aggregate([{ $unwind: '$lineItems' }, { $group: { _id: null, total: { $sum: '$lineItems.quantity' } } }]).toArray();
  const wo = mongoose.connection.collection('contractorworkorders');
  const woCount = await wo.countDocuments();
  const po = mongoose.connection.collection('purchaseorders');
  const poCount = await po.countDocuments();
  
  console.log('Inward: ', inwardAgg[0]?.total, 'Issued: ', issuedAgg[0]?.total);
  console.log('POs:', poCount, 'WOs:', woCount);
  process.exit(0);
});
