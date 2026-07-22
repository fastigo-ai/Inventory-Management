import mongoose from 'mongoose';
import { EntityMetadata } from './src/modules/metadata/metadata.schema';

mongoose.connect('mongodb://127.0.0.1:27017/inventory-app').then(async () => {
  const meta = await EntityMetadata.findOne({ entityName: 'Item' });
  console.log(JSON.stringify(meta.fields.map((f: any) => ({ name: f.name, label: f.label, required: f.required }))));
  process.exit();
});
