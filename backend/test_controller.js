require('dotenv').config();
const mongoose = require('mongoose');
const { PurchaseOrder } = require('./dist/modules/purchases/purchaseOrder.schema') || require('./src/modules/purchases/purchaseOrder.schema');

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const data = {
    vendorName: 'Vendor API',
    purchaseOrderNumber: 'PO-TEST-MANUAL-' + Date.now(),
    date: new Date(),
    subTotal: 1000,
    cgstPercentage: 9,
    sgstPercentage: 9,
    igstPercentage: 0,
    status: 'Sent'
  };

  const calculatedSubTotal = 1000;
  const discountAmount = 0;
  const freightAmount = 0;

  const taxableAmountForGst = calculatedSubTotal - discountAmount + freightAmount;
  const cgstPercentageVal = Number(data.cgstPercentage) || 0;
  const sgstPercentageVal = Number(data.sgstPercentage) || 0;
  const igstPercentageVal = Number(data.igstPercentage) || 0;
  
  const cgstAmountVal = (taxableAmountForGst * cgstPercentageVal) / 100;
  const sgstAmountVal = (taxableAmountForGst * sgstPercentageVal) / 100;
  const igstAmountVal = (taxableAmountForGst * igstPercentageVal) / 100;

  const taxAmount = 0;
  const adjustment = 0;
  
  const calculatedTotal = calculatedSubTotal - discountAmount + freightAmount + cgstAmountVal + sgstAmountVal + igstAmountVal - taxAmount + adjustment;

  const newPurchaseOrder = new PurchaseOrder({
    ...data,
    cgstPercentage: cgstPercentageVal,
    sgstPercentage: sgstPercentageVal,
    igstPercentage: igstPercentageVal,
    lineItems: [],
    subTotal: calculatedSubTotal,
    discountAmount,
    taxAmount,
    total: calculatedTotal,
    status: data.status || 'Draft',
    attachments: []
  });

  await newPurchaseOrder.save();
  console.log("Mongoose doc:", JSON.stringify(newPurchaseOrder.toObject(), null, 2));

  const nativeDoc = await mongoose.connection.collection('purchaseorders').findOne({ _id: newPurchaseOrder._id });
  console.log("Native doc:", JSON.stringify(nativeDoc, null, 2));

  await mongoose.disconnect();
}
test().catch(console.error);
