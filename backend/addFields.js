const mongoose = require('mongoose');
require('dotenv').config();

const fieldsToAdd = [
  { name: 'solanLoaQuantity', label: 'Solan LOA Qty', type: 'number', order: 29, tab: 'Additional Information' },
  { name: 'nahanLoaQuantity', label: 'Nahan LOA Qty', type: 'number', order: 30, tab: 'Additional Information' },
  { name: 'rampurLoaQuantity', label: 'Rampur LOA Qty', type: 'number', order: 31, tab: 'Additional Information' },
  { name: 'rohruLoaQuantity', label: 'Rohru LOA Qty', type: 'number', order: 32, tab: 'Additional Information' },
  { name: 'solanBomQuantity', label: 'Solan BOM Qty', type: 'number', order: 33, tab: 'Additional Information' },
  { name: 'nahanBomQuantity', label: 'Nahan BOM Qty', type: 'number', order: 34, tab: 'Additional Information' },
  { name: 'rampurBomQuantity', label: 'Rampur BOM Qty', type: 'number', order: 35, tab: 'Additional Information' },
  { name: 'rohruBomQuantity', label: 'Rohru BOM Qty', type: 'number', order: 36, tab: 'Additional Information' },
];

mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0').then(async () => {
  const meta = await mongoose.connection.db.collection('metadatas').findOne({ entityName: 'Item' });
  let updated = false;
  const newFields = [...meta.fields];
  
  for (const f of fieldsToAdd) {
    if (!newFields.find(x => x.name === f.name)) {
      newFields.push({
        ...f,
        required: false, visible: true, editable: true, unique: false, active: true, systemLocked: false, options: [], colSpan: 1, sectionToggle: false
      });
      updated = true;
    }
  }
  
  if (updated) {
    await mongoose.connection.db.collection('metadatas').updateOne({ entityName: 'Item' }, { $set: { fields: newFields } });
    console.log('Added per-circle LOA/BOM fields to Item metadata.');
  } else {
    console.log('Fields already exist.');
  }
  process.exit(0);
}).catch(console.error);
