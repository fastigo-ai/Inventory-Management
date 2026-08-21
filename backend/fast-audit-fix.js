const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("=== FAST ALL-CIRCLE AUDIT & AUTO-FIX ===\n");

  const circles = ['Nahan', 'Rohru', 'Solan', 'Rampur'];

  for (const circle of circles) {
    const regex = new RegExp(`^${circle}$`, 'i');

    // Step 1: Get all inward entries NOT in this circle but linked to a PI that has this circle
    // Get PI IDs that have this circle
    const piIds = await mongoose.connection.collection('purchaseinvoices')
      .distinct('_id', { 'lineItems.circle': regex });

    // Get DI numbers/IDs that have this circle
    const diIds = await mongoose.connection.collection('dis')
      .distinct('_id', { $or: [{ 'lineItems.circle': regex }, { circle: regex }] });
    const diNumbers = await mongoose.connection.collection('dis')
      .distinct('diNumber', { $or: [{ 'lineItems.circle': regex }, { circle: regex }] });

    // Count correctly placed
    const correctCount = await mongoose.connection.collection('storeinwardentries')
      .countDocuments({ circle: regex });

    // Find mis-assigned: linked to Nahan PI/DI but circle is wrong
    const misassigned = await mongoose.connection.collection('storeinwardentries').find({
      circle: { $not: regex },
      $or: [
        { purchaseInvoiceId: { $in: piIds } },
        { diId: { $in: diIds } },
        { diRefNo: { $in: diNumbers } }
      ]
    }).toArray();

    // Fix them
    if (misassigned.length > 0) {
      await mongoose.connection.collection('storeinwardentries').updateMany(
        { _id: { $in: misassigned.map(m => m._id) } },
        { $set: { circle } }
      );
    }

    console.log(`[${circle.toUpperCase().padEnd(10)}] ✅ Already Correct: ${correctCount} | 🔧 Fixed Mis-assigned: ${misassigned.length}`);
  }

  console.log("\n✅ ALL DONE. Every circle audited and fixed.");
  process.exit(0);
}
run().catch(console.error);
