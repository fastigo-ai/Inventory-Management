require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const StoreTransfer = mongoose.model('StoreTransfer', new mongoose.Schema({}, { strict: false }));
  
  const all = await StoreTransfer.find();
  console.log('Total StoreTransfers:', all.length);
  
  const toNahan = all.filter(t => (t.toStore || '').toLowerCase().includes('nahan'));
  console.log('To Nahan:', toNahan.length);
  
  const withInward = toNahan.filter(t => t.registerType === 'INWARD');
  console.log('To Nahan + INWARD:', withInward.length);
  
  const withReceived = withInward.filter(t => {
    return (t.items || []).some(i => i.receivedQty > 0 || i.quantity > 0 || i.requestedQty > 0);
  });
  console.log('To Nahan + INWARD + has qty:', withReceived.length);
  
  if (withReceived.length > 0) {
    console.log('Sample toStore:', withReceived[0].toStore);
    console.log('Sample registerType:', withReceived[0].registerType);
    console.log('Sample items[0]:', withReceived[0].items[0]);
  }
  
  const fromNahan = all.filter(t => (t.fromStore || '').toLowerCase().includes('nahan'));
  console.log('From Nahan:', fromNahan.length);
  const withOutward = fromNahan.filter(t => t.registerType === 'OUTWARD');
  console.log('From Nahan + OUTWARD:', withOutward.length);

  process.exit(0);
}
check();
