const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const MONGO_URI = process.env.MONGO_URI;

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`Connected to database: ${mongoose.connection.name}`);
    const db = mongoose.connection.db;

    const jmcCount = await db.collection('jmcregisters').countDocuments({ circle: { $regex: /nahan/i } });
    console.log(`Count of JMC registers in Nahan circle: ${jmcCount}`);

    const wipCount = await db.collection('wipregisters').countDocuments({ circle: { $regex: /nahan/i } });
    console.log(`Count of WIP registers in Nahan circle: ${wipCount}`);

    if (jmcCount > 0) {
      const deleteJmcRes = await db.collection('jmcregisters').deleteMany({ circle: { $regex: /nahan/i } });
      console.log(`Deleted ${deleteJmcRes.deletedCount} JMC registers for Nahan.`);
    }

    if (wipCount > 0) {
      const deleteWipRes = await db.collection('wipregisters').deleteMany({ circle: { $regex: /nahan/i } });
      console.log(`Deleted ${deleteWipRes.deletedCount} WIP registers for Nahan.`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
