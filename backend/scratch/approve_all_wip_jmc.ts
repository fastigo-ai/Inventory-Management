import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || '').then(async () => {
  const db = mongoose.connection.db;
  if (!db) return;

  try {
    const jmcResult = await db.collection('jmcregisters').updateMany(
      {},
      { $set: { status: 'Approved' } }
    );
    console.log(`JMC Registers approved: ${jmcResult.modifiedCount} (Matched: ${jmcResult.matchedCount})`);

    const wipResult = await db.collection('wipregisters').updateMany(
      {},
      { $set: { status: 'Approved' } }
    );
    console.log(`WIP Consumed approved: ${wipResult.modifiedCount} (Matched: ${wipResult.matchedCount})`);

    const wipReqResult = await db.collection('wiprequiredregisters').updateMany(
      {},
      { $set: { status: 'Approved' } }
    );
    console.log(`WIP Required approved: ${wipReqResult.modifiedCount} (Matched: ${wipReqResult.matchedCount})`);

  } catch (error) {
    console.error("Error approving records:", error);
  } finally {
    mongoose.disconnect();
  }
});
