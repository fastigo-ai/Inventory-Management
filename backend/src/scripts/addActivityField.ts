import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const Metadata = mongoose.model('Metadata', new mongoose.Schema({}, { strict: false }));

async function run() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const meta = await Metadata.findOne({ entityName: 'Item' });
  if (!meta) {
    console.log("Metadata not found");
    process.exit(1);
  }

  const fields = (meta as any).fields;
  const hasActivity = fields.find((f: any) => f.name === 'activity');
  if (!hasActivity) {
    fields.push({
      name: 'activity',
      label: 'Activity',
      type: 'text',
      required: false,
      options: [],
      isFilterable: true,
      isSortable: true,
      order: fields.length
    });
    
    // Check if tempCode exists and place activity right after it, or at the end
    const tempCodeIdx = fields.findIndex((f: any) => f.name === 'tempCode');
    if (tempCodeIdx !== -1) {
      // Remove it from the end
      const activityField = fields.pop();
      // Insert it after tempCode
      fields.splice(tempCodeIdx + 1, 0, activityField);
      // Re-order fields
      fields.forEach((f: any, idx: number) => { f.order = idx + 1; });
    }

    await Metadata.updateOne({ entityName: 'Item' }, { $set: { fields } });
    console.log("Activity field added to Metadata successfully!");
  } else {
    console.log("Activity field already exists.");
  }
  process.exit(0);
}
run();
