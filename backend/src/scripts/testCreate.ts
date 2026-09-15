import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import xlsx from 'xlsx';
import { JmcRegister } from '../modules/jmc/jmc.schema';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const testCreate = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL;
    await mongoose.connect(MONGO_URI as string);
    console.log('Connected to DB');

    const contractorId = new mongoose.Types.ObjectId("6a6daab0d8ead4796940f860"); // Chikara Construction

    try {
        await JmcRegister.create({
            jmcNumber: "JMC/26/9999",
            date: new Date(),
            contractorId: contractorId,
            package: "205(2069)",
            location: "BHAGWANPUR",
            circle: "NAHAN",
            subCircle: "",
            division: "NAHAN",
            subDivision: "PAONTA SAHIB",
            subStation: "33/11 KV DHOULA KUAN",
            feeder: "11 KV BHAGWANPUR",
            items: [],
            claimedAmount: 0,
            approvedAmount: 0,
            status: 'Submitted',
            remarks: 'test',
            createdBy: new mongoose.Types.ObjectId()
        });
        console.log("Created successfully!");
    } catch (e: any) {
        console.log("Error creating JMC:", e.message);
    }

    process.exit(0);
  } catch (error) {
    console.error('Fatal Error during test:', error);
    process.exit(1);
  }
};

testCreate();
