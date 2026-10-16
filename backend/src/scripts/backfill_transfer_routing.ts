import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { StoreTransfer } from '../modules/store/storeTransfer.schema';
import { StoreTransferService } from '../modules/store/storeTransfer.service';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function backfill() {
  await mongoose.connect(process.env.MONGO_URI as string);
  console.log("Connected to MongoDB for backfilling transfer routing fields...");

  const transfers = await StoreTransfer.find({});
  console.log(`Found ${transfers.length} transfers to check and backfill.`);

  let updatedCount = 0;
  for (const t of transfers) {
    const origin = StoreTransferService.resolveStoreInfo(t.fromStore);
    const dest = StoreTransferService.resolveStoreInfo(t.toStore);

    let needsUpdate = false;
    if (!t.originCircle || t.originCircle !== origin.circle) {
      t.originCircle = origin.circle;
      needsUpdate = true;
    }
    if (!t.originPackage || t.originPackage !== origin.package) {
      t.originPackage = origin.package;
      needsUpdate = true;
    }
    if (origin.subcircle && t.originSubcircle !== origin.subcircle) {
      t.originSubcircle = origin.subcircle;
      needsUpdate = true;
    }
    if (!t.destinationCircle || t.destinationCircle !== dest.circle) {
      t.destinationCircle = dest.circle;
      needsUpdate = true;
    }
    if (!t.destinationPackage || t.destinationPackage !== dest.package) {
      t.destinationPackage = dest.package;
      needsUpdate = true;
    }
    if (dest.subcircle && t.destinationSubcircle !== dest.subcircle) {
      t.destinationSubcircle = dest.subcircle;
      needsUpdate = true;
    }

    if (needsUpdate) {
      await t.save();
      updatedCount++;
    }
  }

  console.log(`Successfully backfilled ${updatedCount} store transfers.`);
  await mongoose.disconnect();
  console.log("Disconnected from MongoDB.");
}

backfill().catch(console.error);
