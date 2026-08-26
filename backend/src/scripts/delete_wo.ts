import mongoose from 'mongoose';
import { ContractorWorkOrder } from '../modules/contractors/contractorWorkOrder.schema';
import * as dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/erp-system')
  .then(async () => {
    const res = await ContractorWorkOrder.deleteMany({});
    console.log(`Deleted ${res.deletedCount} Work Orders`);
    mongoose.connection.close();
  });
