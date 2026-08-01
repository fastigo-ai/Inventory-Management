import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const Metadata = mongoose.model('Metadata', new mongoose.Schema({}, { strict: false }));

async function run() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const meta = await Metadata.findOne({ entityName: 'Item' }).lean();
  const pkgField = (meta as any).fields.find((f: any) => f.name === 'package');
  console.log("Package options:", pkgField.options);
  
  process.exit(0);
}
run();
