import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const Metadata = mongoose.model('Metadata', new mongoose.Schema({}, { strict: false }));
import Item from '../modules/items/item.model';

async function run() {
  await mongoose.connect(process.env.MONGO_URI as string);
  
  // Find all unique activities
  const uniqueActivities = await Item.distinct('dynamicData.activity');
  const validActivities = uniqueActivities.filter(a => a && typeof a === 'string');
  console.log("Unique Activities found:", validActivities);

  const meta = await Metadata.findOne({ entityName: 'Item' });
  if (!meta) process.exit(1);

  const fields = (meta as any).fields;
  const activityField = fields.find((f: any) => f.name === 'activity');
  if (activityField) {
    activityField.options = validActivities;
    activityField.type = 'text'; // Keep it text so it renders as search bar with datalist
    await Metadata.updateOne({ entityName: 'Item' }, { $set: { fields } });
    console.log("Updated Metadata options for activity!");
  }
  process.exit(0);
}
run();
