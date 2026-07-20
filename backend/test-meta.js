const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/erp_system');
  
  // Register schema
  const Schema = mongoose.Schema;
  const FieldSchema = new Schema({
    name: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, required: true },
    required: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
  }, { _id: false });
  
  const MetadataSchema = new Schema({
    entityName: { type: String, required: true, unique: true },
    fields: [FieldSchema]
  }, { timestamps: true });
  
  const Metadata = mongoose.models.MetadataTest || mongoose.model('MetadataTest', MetadataSchema);

  // 1. Seed
  await Metadata.findOneAndUpdate(
    { entityName: 'TestItem' },
    { fields: [
      { name: 'field1', label: 'Field 1', type: 'text' },
      { name: 'field2', label: 'Field 2', type: 'text' }
    ] },
    { new: true, upsert: true, runValidators: true }
  );

  // 2. Fetch and modify
  const meta = await Metadata.findOne({ entityName: 'TestItem' });
  let newFields = meta.fields.toObject();
  
  // delete field1, mark field2 inactive
  newFields = newFields.filter(f => f.name !== 'field1');
  newFields[0].active = false;

  // 3. Update
  await Metadata.findOneAndUpdate(
    { entityName: 'TestItem' },
    { fields: newFields },
    { new: true, upsert: true, runValidators: true }
  );

  // 4. Fetch again
  const finalMeta = await Metadata.findOne({ entityName: 'TestItem' });
  console.log(JSON.stringify(finalMeta.fields, null, 2));

  process.exit(0);
}
run().catch(console.error);
