const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const item = await mongoose.connection.collection('items').findOne({
    "dynamicData.name": { $regex: "LT AB Cable on poles", $options: "i" }
  });
  if(item) {
    console.log("Keys:");
    for(const key of Object.keys(item.dynamicData)) {
      if(key.toLowerCase().includes('nahan') || key.toLowerCase().includes('solan')) {
         console.log(key, ':', item.dynamicData[key]);
      }
    }
  } else {
    console.log("Item not found");
  }
  process.exit();
}).catch(console.error);
