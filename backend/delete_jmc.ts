import 'dotenv/config';
import connectDB from './src/core/database';
import { JmcRegister } from './src/modules/jmc/jmc.schema';
import mongoose from 'mongoose';

async function run() {
  try {
    await connectDB();
    console.log("Connected to DB, deleting JmcRegister data...");
    const result = await JmcRegister.deleteMany({});
    console.log(`Deleted ${result.deletedCount} JMC records.`);
  } catch (error) {
    console.error("Error deleting JMC data:", error);
  } finally {
    mongoose.connection.close();
  }
}
run();
