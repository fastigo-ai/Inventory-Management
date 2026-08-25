const mongoose = require('mongoose');

const uri = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';

async function run() {
  await mongoose.connect(uri);

  const ContractorAssignment = mongoose.model('ContractorAssignment', new mongoose.Schema({
    location: String, division: String, status: String, lineItems: Array
  }));
  const ContractorReturn = mongoose.model('ContractorReturn', new mongoose.Schema({
    store: String, circle: String, division: String, items: Array, lineItems: Array
  }));
  const StoreTransfer = mongoose.model('StoreTransfer', new mongoose.Schema({
    fromStore: String, toStore: String, status: String, items: Array
  }));

  // 1. Issued (ContractorAssignment)
  const assignments = await ContractorAssignment.find({
    status: { $ne: 'Cancelled' },
    $or: [{ location: /nahan/i }, { division: /nahan/i }, { 'lineItems.circle': /nahan/i }]
  }).lean();
  let totalIssued = 0;
  assignments.forEach(a => {
    (a.lineItems || []).forEach(li => {
      totalIssued += Number(li.quantity || li.acceptedQuantity || li.issuedQty || 0);
    });
  });

  // 2. Returned (ContractorReturn)
  const returns = await ContractorReturn.find({
    $or: [{ store: /nahan/i }, { circle: /nahan/i }, { division: /nahan/i }]
  }).lean();
  let totalReturned = 0;
  returns.forEach(r => {
    (r.items || r.lineItems || []).forEach(li => {
      totalReturned += Number(li.returnQuantity || li.quantity || 0);
    });
  });

  // 3. Transfer In (toStore = Nahan)
  const transfersInAll = await StoreTransfer.find({ toStore: /nahan/i }).lean();
  let transferInReceived = 0;
  let transferInPending = 0;
  transfersInAll.forEach(t => {
    (t.items || []).forEach(li => {
      const qty = Number(li.receivedQty || li.dispatchedQty || li.quantity || li.requestedQty || 0);
      if (['RECEIVED'].includes(t.status)) transferInReceived += qty;
      else if (['PENDING', 'APPROVED', 'IN_TRANSIT'].includes(t.status)) transferInPending += qty;
    });
  });

  // 4. Transfer Out (fromStore = Nahan)
  const transfersOutAll = await StoreTransfer.find({ fromStore: /nahan/i }).lean();
  let transferOutDispatched = 0;
  let transferOutPending = 0;
  transfersOutAll.forEach(t => {
    (t.items || []).forEach(li => {
      const qty = Number(li.dispatchedQty || li.receivedQty || li.quantity || li.requestedQty || 0);
      if (['DISPATCHED', 'RECEIVED', 'IN_TRANSIT'].includes(t.status)) transferOutDispatched += qty;
      else if (['PENDING', 'APPROVED'].includes(t.status)) transferOutPending += qty;
    });
  });

  console.log('--- NAHAN CIRCLE TOTALS ---');
  console.log('Total Issued to Contractor:', totalIssued);
  console.log('Total Returned by Contractor:', totalReturned);
  console.log('Total Transfer In (Received):', transferInReceived);
  console.log('Total Transfer In (Pending/Transit):', transferInPending);
  console.log('Total Transfer Out (Dispatched):', transferOutDispatched);
  console.log('Total Transfer Out (Pending/Approved):', transferOutPending);

  mongoose.disconnect();
}

run().catch(console.error);
