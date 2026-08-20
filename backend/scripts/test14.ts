import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const items = await mongoose.connection.db!.collection('items').findOne({ _id: new mongoose.Types.ObjectId("6a7426d44457b533373dd7f3") });
  console.log("Raw item:", items);
  process.exit(0);
}
run();
