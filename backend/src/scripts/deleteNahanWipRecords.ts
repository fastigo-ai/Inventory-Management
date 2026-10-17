import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { WipRegister } from '../modules/wip/wip.schema';
import { WipRequiredRegister } from '../modules/wip-required/wipRequired.schema';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const deleteNahanWip = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL;
    if (!MONGO_URI) throw new Error('No MongoDB URI found in environment variables.');

    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB');

    const nahanRegex = /nahan/i;

    // Check counts before
    const wipConsumedCount = await WipRegister.countDocuments({ circle: nahanRegex });
    const wipRequiredCount = await WipRequiredRegister.countDocuments({ circle: nahanRegex });

    console.log(`Found ${wipConsumedCount} WIP Consumed (WipRegister) for Nahan.`);
    console.log(`Found ${wipRequiredCount} WIP Required (WipRequiredRegister) for Nahan.`);

    // Delete WIP Consumed
    const resConsumed = await WipRegister.deleteMany({ circle: nahanRegex });
    console.log(`Successfully deleted ${resConsumed.deletedCount} WIP Consumed documents for Nahan.`);

    // Delete WIP Required
    const resRequired = await WipRequiredRegister.deleteMany({ circle: nahanRegex });
    console.log(`Successfully deleted ${resRequired.deletedCount} WIP Required documents for Nahan.`);

    process.exit(0);
  } catch (error) {
    console.error('Error deleting Nahan WIP records:', error);
    process.exit(1);
  }
};

deleteNahanWip();
