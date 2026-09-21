import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();
mongoose.connect(process.env.MONGO_URI || '').then(async () => {
  const StoreInwardEntry = mongoose.model('StoreInwardEntry', new mongoose.Schema({}, { strict: false }));
  const count = await StoreInwardEntry.countDocuments({
      $or: [
        { subcircle: /Nalagarh/i },
        { subCircle: /Nalagarh/i }
      ]
  });
  console.log('Nalagarh Inwards:', count);
  
  const anyNalagarh = await StoreInwardEntry.findOne({
      $or: [
        { subcircle: /Nalagarh/i },
        { subCircle: /Nalagarh/i }
      ]
  }).lean();
  console.log('Sample:', anyNalagarh);
  mongoose.disconnect();
});
