const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: '.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.useDb('test');
  const WipRegister = db.collection('wipregisters');
  
  const result = await WipRegister.deleteMany({
    circle: { $regex: /SOLAN/i },
    $or: [
       { subDivision: { $regex: /Baddi|Baddhi|Manpura|Barotiwala|Bartiwala|Brotiwala|Barotinala|Goela/i } },
       { division: { $regex: /Baddi|Baddhi|Manpura|Barotiwala|Bartiwala|Brotiwala|Barotinala|Goela/i } }
    ]
  });
  
  console.log(`Successfully deleted ${result.deletedCount} WIP records for the entire Baddi region.`);
  
  mongoose.disconnect();
}

run().catch(console.error);
