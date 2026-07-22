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
  await mongoose.connect('mongodb://localhost:27017/test_erp_5');
  
  const po = new PO({ paymentTerms: [] });
  await po.save();
  
  const data = {
    paymentTerms: '[{"stage":"1st stage","type":"Advance","value":"50","unit":"%","remark":"","_id":"6a610ab1240a9aeca9ae6866"}]'
  };
  
  let parsedPaymentTerms = data.paymentTerms;
  // if (typeof parsedPaymentTerms === 'string') {
  //   try {
  //     parsedPaymentTerms = JSON.parse(parsedPaymentTerms);
  //   } catch (e) {
  //     parsedPaymentTerms = undefined;
  //   }
  // }
  
  const existingOrder = await PO.findById(po._id);
  const updatedData = {
    paymentTerms: parsedPaymentTerms !== undefined ? parsedPaymentTerms : (data.paymentTerms || existingOrder.paymentTerms)
  };
  
  try {
    const updatedOrder = await PO.findByIdAndUpdate(po._id, updatedData, { new: true, runValidators: true });
    console.log('SUCCESS', updatedOrder.paymentTerms);
  } catch(e) {
    console.error('ERROR:', e.message);
  }
  process.exit(0);
}
test();
