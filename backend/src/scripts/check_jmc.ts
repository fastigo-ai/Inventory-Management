import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/erp-system')
  .then(async () => {
    const wo = await mongoose.connection.db?.collection('contractorworkorders').findOne({ _id: new mongoose.Types.ObjectId('6a8e97b552343723172af333') });
    console.log("Work Order Contractor ID:", wo?.contractorId);
    
    if (wo) {
      const cIdStr = String(wo.contractorId);
      const cIdObj = new mongoose.Types.ObjectId(cIdStr);
      
      const jmc = await mongoose.connection.db?.collection('jmcregisters').find({ 
        $or: [{ contractorId: cIdStr }, { contractorId: cIdObj }]
      }).toArray();
      console.log("JMC Register for this Contractor:", jmc?.length);
      
      const wip = await mongoose.connection.db?.collection('wipregisters').find({ 
        $or: [{ contractorId: cIdStr }, { contractorId: cIdObj }]
      }).toArray();
      console.log("WIP Register for this Contractor:", wip?.length);
    }
    
    mongoose.connection.close();
  });
