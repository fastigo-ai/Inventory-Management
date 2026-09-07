
import * as dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import { buildStockSummaryData } from "./src/modules/store/store.controller";

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log("Connected to DB");
    
    const searchRegex = new RegExp("^Nisar Mohd$", "i");
    const Contractor = mongoose.model("Contractor");
    const c = await Contractor.findOne({
      $or: [
        { "dynamicData.companyName": { $regex: searchRegex } },
        { "dynamicData.displayName": { $regex: searchRegex } },
        { "name": { $regex: searchRegex } }
      ]
    });
    console.log("Contractor ID:", c?._id);
    
    if (c) {
      const summaryNisar = await buildStockSummaryData("Nahan", undefined, c._id.toString());
      console.log("Finding item 425");
      const item425 = summaryNisar.find((s: any) => s.loaSrNo === "425");
      console.log("Item 425:", item425);
      
      console.log("Finding item 395");
      const item395 = summaryNisar.find((s: any) => s.loaSrNo === "395");
      console.log("Item 395:", item395);
    }
    
  } catch(e) { console.error(e) }
  process.exit(0);
};
run();

