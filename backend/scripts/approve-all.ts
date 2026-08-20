import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { JmcRegister } from '../src/modules/jmc/jmc.schema';
import { WipRegister } from '../src/modules/wip/wip.schema';
import { WipRequiredRegister } from '../src/modules/wip-required/wipRequired.schema';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI as string);
  console.log('Connected to DB');

  const jmcResult = await JmcRegister.updateMany({}, { $set: { status: 'Approved' } });
  console.log(`JMC Registers updated: ${jmcResult.modifiedCount}`);

  const wipResult = await WipRegister.updateMany({}, { $set: { status: 'Approved' } });
  console.log(`WIP Registers updated: ${wipResult.modifiedCount}`);

  const wipReqResult = await WipRequiredRegister.updateMany({}, { $set: { status: 'Approved' } });
  console.log(`WIP Required Registers updated: ${wipReqResult.modifiedCount}`);

  await mongoose.disconnect();
}

run().catch(console.error);
