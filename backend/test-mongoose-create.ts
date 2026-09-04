import mongoose from 'mongoose';
import { ContractorInvoice } from './src/modules/contractor-billing/contractorInvoice.schema';

mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0').then(async () => {
  try {
    const invoice = await ContractorInvoice.create({
      invoiceNumber: "TEST-002",
      contractorId: new mongoose.Types.ObjectId(),
      workOrderId: new mongoose.Types.ObjectId(),
      stage: '60%', // testing 60%
      totalBaseAmount: 100,
      totalGstAmount: 18,
      grandTotal: 118,
      createdBy: new mongoose.Types.ObjectId(),
      lineItems: []
    });
    console.log('Created!', invoice._id);
  } catch (err) {
    console.error('Validation Error:', err.message);
  }
  process.exit();
});
