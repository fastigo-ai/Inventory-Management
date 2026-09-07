
import * as dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import { ContractorAssignment } from "./src/modules/contractors/contractorAssignment.schema";
import { Contractor } from "./src/modules/contractors/contractors.schema";
import { WipRegister } from "./src/modules/registers/wipRegister.schema";
import { JmcRegister } from "./src/modules/registers/jmcRegister.schema";

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log("Connected to DB");
    
    const searchRegex = new RegExp("^Nisar Mohd$", "i");
    const c = await Contractor.findOne({
      $or: [
        { "dynamicData.companyName": { $regex: searchRegex } },
        { "dynamicData.displayName": { $regex: searchRegex } },
        { "name": { $regex: searchRegex } }
      ]
    });
    console.log("Contractor found:", c?.dynamicData?.displayName || c?.name);
    
    if (c) {
      const cid = c._id;
      const assignments = await ContractorAssignment.find({ contractorId: cid });
      console.log("Assignments count for Nisar Mohd:", assignments.length);
      
      const wips = await WipRegister.find({ contractorId: cid });
      console.log("WIPs count for Nisar Mohd:", wips.length);
      
      const jmcs = await JmcRegister.find({ contractorId: cid });
      console.log("JMCs count for Nisar Mohd:", jmcs.length);
    } else {
      console.log("Contractor NOT FOUND in DB!");
    }
  } catch(e) { console.error(e) }
  process.exit(0);
};
run();

