import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

import mongoose from 'mongoose';
import connectDB from '../src/core/database';
import { JmcRegister } from '../src/modules/jmc/jmc.schema';

async function main() {
  try {
    await connectDB();
    console.log('Connected to DB');

    const dbJmcs = await JmcRegister.find({ division: { $regex: /Parwanoo/i } }).lean();
    console.log(`Found ${dbJmcs.length} JMCs in DB for division "Parwanoo"`);

    const locationCount: Record<string, any[]> = {};

    for (const jmc of dbJmcs) {
      const loc = (jmc.location || '').trim().toLowerCase();
      if (!locationCount[loc]) locationCount[loc] = [];
      locationCount[loc].push(jmc);
    }

    let hasDuplicate = false;
    for (const [loc, jmcs] of Object.entries(locationCount)) {
      if (jmcs.length > 1) {
        hasDuplicate = true;
        console.log(`\nLocation "${loc}" has ${jmcs.length} JMCs in the DB!`);
        jmcs.forEach((j: any) => {
          console.log(` - JMC Number: ${j.jmcNumber} | Sub-Station: ${j.subStation} | Feeder: ${j.feeder} | CreatedAt: ${j.createdAt}`);
        });
      }
    }

    if (!hasDuplicate) {
      console.log('No duplicate locations found. Check if another field is different (e.g. feeder/substation).');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from DB');
  }
}

main();
