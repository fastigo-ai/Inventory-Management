import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { JmcRegister } from '../modules/jmc/jmc.schema';
import { WipRegister } from '../modules/wip/wip.schema';
import { WipRequiredRegister } from '../modules/wip-required/wipRequired.schema';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const checkRecentUploads = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL;
    await mongoose.connect(MONGO_URI as string);

    const jmcCount = await JmcRegister.countDocuments();
    const jmcNahanCount = await JmcRegister.countDocuments({ circle: /nahan/i });
    const jmcRecent = await JmcRegister.find().sort({ createdAt: -1 }).limit(3).select('jmcNumber circle status createdAt').lean();

    const wipCount = await WipRegister.countDocuments();
    const wipNahanCount = await WipRegister.countDocuments({ circle: /nahan/i });
    const wipRecent = await WipRegister.find().sort({ createdAt: -1 }).limit(3).select('wipNumber circle status createdAt').lean();

    const wipReqCount = await WipRequiredRegister.countDocuments();
    const wipReqNahanCount = await WipRequiredRegister.countDocuments({ circle: /nahan/i });

    console.log({
      jmc: { total: jmcCount, nahan: jmcNahanCount, recent: jmcRecent },
      wipConsumed: { total: wipCount, nahan: wipNahanCount, recent: wipRecent },
      wipRequired: { total: wipReqCount, nahan: wipReqNahanCount }
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

checkRecentUploads();
