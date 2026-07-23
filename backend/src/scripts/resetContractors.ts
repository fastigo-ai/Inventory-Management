import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Contractor } from '../modules/contractors/contractor.schema';

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || '');
    await Contractor.deleteMany({});
    console.log('Contractors cleared.');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};
run();
