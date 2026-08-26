import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/erp-system')
  .then(async () => {
    const circles = await mongoose.connection.db?.collection('items').distinct('dynamicData.circle');
    console.log(`Distinct circles:`, circles);
    
    mongoose.connection.close();
  });
