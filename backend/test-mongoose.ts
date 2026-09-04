import mongoose from 'mongoose';
import { ContractorInvoice } from './src/modules/contractor-billing/contractorInvoice.schema';
import './src/modules/contractors/contractor.schema'; // To register Contractor model
import './src/modules/contractors/contractorWorkOrder.schema'; // To register ContractorWorkOrder model

mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0').then(async () => {
  const invoices = await ContractorInvoice.find({})
    .populate('contractorId', 'name vendorName dynamicData')
    .populate('workOrderId', 'workOrderNumber')
    .sort({ createdAt: -1 });
  console.log('Populated Invoices:', invoices.length);
  process.exit();
});
