const mongoose = require('mongoose');

mongoose.connect("mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0").then(async () => {
  const items = await mongoose.connection.collection('items').find({
    "dynamicData.activity": { $regex: "New LT AB Cable 3CX240", $options: "i" }
  }).toArray();
  
  console.log(`Found ${items.length} items`);
  for (const item of items) {
    console.log(`- name: ${item.dynamicData.name}, circle: ${item.dynamicData.circle}, solanLoa: ${item.dynamicData.solanLoaQuantity}, nahanLoa: ${item.dynamicData.nahanLoaQuantity}`);
  }
  process.exit();
}).catch(console.error);
