const mongoose = require('mongoose');

mongoose.connect("mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0").then(async () => {
  const item = await mongoose.connection.collection('items').findOne({
    "dynamicData.activity": { $regex: "New LT AB Cable 3CX240", $options: "i" }
  });
  if (!item) {
     console.log("No item found for New LT AB Cable...");
  } else {
     console.log(item.dynamicData);
  }
  process.exit();
}).catch(console.error);
