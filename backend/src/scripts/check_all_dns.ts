import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/erp-system')
  .then(async () => {
    const dns = await mongoose.connection.db?.collection('demandnotes').find().toArray();
    console.log(`Total DNs in DB: ${dns?.length}`);
    dns?.forEach(d => {
      console.log(`DN: ${d.demandNoteNumber}, Package: "${d.package}", Circle: "${d.circle}", Status: ${d.status}, Date: ${d.createdAt}`);
    });
    
    mongoose.connection.close();
  });
