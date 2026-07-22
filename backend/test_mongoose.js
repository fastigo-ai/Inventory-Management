const mongoose = require('mongoose');

const poSchema = new mongoose.Schema({
  paymentTerms: [{
    stage: String,
    type: String,
    value: String,
    unit: String,
    remark: String
  }]
});

const PO = mongoose.model('PO', poSchema);

async function test() {
  await mongoose.connect('mongodb://localhost:27017/test_erp_3');
  
  const rawBody = '[{"stage":"1st stage","type":"Advance","value":"50","unit":"%","remark":"","_id":"6a610ab1240a9aeca9ae6866"}]';
  
  let parsedPaymentTerms = rawBody;
  if (typeof parsedPaymentTerms === 'string') {
    parsedPaymentTerms = JSON.parse(parsedPaymentTerms);
  }
  
  const po = new PO({ paymentTerms: [] });
  await po.save();
  
  const updatedData = {
    paymentTerms: parsedPaymentTerms !== undefined ? parsedPaymentTerms : rawBody
  };
  
  try {
    await PO.findByIdAndUpdate(po._id, updatedData, { new: true });
    console.log('SUCCESS');
  } catch(e) {
    console.error('ERROR:', e.message);
  }
  
  process.exit(0);
}
test();
