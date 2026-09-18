import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { WipRegister } from '../modules/wip/wip.schema';

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
    console.log('Connected to DB');

    const solanRegex = new RegExp('^solan$', 'i');
    
    const countBefore = await WipRegister.countDocuments({ circle: solanRegex });
    console.log(`Found ${countBefore} WipConsumed documents for Solan circle.`);

    const result = await WipRegister.deleteMany({ circle: solanRegex });
    console.log(`Deleted ${result.deletedCount} WipConsumed documents.`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from DB');
    process.exit(0);
  }
}

run();
