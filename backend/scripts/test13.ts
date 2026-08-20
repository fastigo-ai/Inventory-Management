import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const collections = await mongoose.connection.db!.listCollections().toArray();
  console.log("Collections:", collections.map(c => c.name));
  process.exit(0);
}
run();
