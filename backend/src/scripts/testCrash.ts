import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import Item from '../modules/items/item.model';

async function run() {
  await mongoose.connect(process.env.MONGO_URI as string);
  try {
    const count = await Item.countDocuments({
      $expr: {
        $regexMatch: {
          input: { $toString: "$dynamicData.package" },
          regex: "Package 2(R/R)", // UNESCAPED!
          options: "i"
        }
      }
    });
    console.log("Success, count:", count);
  } catch (e: any) {
    console.log("CRASHED:", e.message);
  }
  process.exit(0);
}
run();
