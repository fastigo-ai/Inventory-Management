const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/erp').then(async () => {
  const min = mongoose.connection.collection('contractorassignments');
  const items = await min.find({ circle: { $regex: /kumarhatti/i } }).toArray();
  console.log('ContractorAssignments with circle kumarhatti: ', items.length);
  
  const inward = mongoose.connection.collection('storeinwardentries');
  const inwards = await inward.find({ circle: { $regex: /kumarhatti/i } }).toArray();
  console.log('StoreInwardEntries with circle kumarhatti: ', inwards.length);
  
  const nalagarhMin = await min.find({ circle: { $regex: /nalagarh/i } }).toArray();
  console.log('ContractorAssignments with circle nalagarh: ', nalagarhMin.length);
  
  process.exit(0);
});
