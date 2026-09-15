import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import xlsx from 'xlsx';
import { JmcRegister } from '../modules/jmc/jmc.schema';
import stringSimilarity from 'string-similarity';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const testImport = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL;
    if (!MONGO_URI) throw new Error('No MongoDB URI found in environment variables.');
    await mongoose.connect(MONGO_URI);
    console.log(`Connected to DB`);

    // Just run a simple test with one JMC create to see if it throws!
    console.log('Testing create payload...');
    const currentYearStr = new Date().getFullYear().toString().slice(-2);
    
    // We will just do a dummy create!
    const testJmc = new JmcRegister({
      jmcNumber: `JMC/${currentYearStr}/9999`,
      date: new Date(),
      contractorId: new mongoose.Types.ObjectId(),
      package: 'test pkg',
      location: 'test loc',
      circle: 'test circ',
      division: 'test div',
      subDivision: 'test subdiv',
      subStation: 'test substn',
      feeder: 'test feeder',
      items: [{
        itemId: null,
        loaSerialNo: '',
        loaSrNo: '',
        tempCode: '',
        totalLoaQty: 0,
        activity: 'test',
        description: 'test',
        unit: 'M',
        prevQty: 0,
        claimedQty: 10,
        approvedQty: 0,
        rate: 0,
        amount: 0,
        remarks: ''
      }],
      claimedAmount: 0,
      approvedAmount: 0,
      status: 'Submitted',
      remarks: 'test',
      createdBy: new mongoose.Types.ObjectId()
    });

    await testJmc.save();
    console.log('Create successful! Now deleting...');
    await JmcRegister.deleteOne({ _id: testJmc._id });
    console.log('Test complete!');

    process.exit(0);
  } catch (error) {
    console.error('Test Failed with Error:', error);
    process.exit(1);
  }
};

testImport();
