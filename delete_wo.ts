import mongoose from 'mongoose';
import { ContractorWorkOrder } from './backend/src/modules/contractors/contractorWorkOrder.schema';

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/erp-system')
  .then(async () => {
    const res = await ContractorWorkOrder.deleteMany({});
    console.log(`Deleted ${res.deletedCount} Work Orders`);
    mongoose.connection.close();
  });
