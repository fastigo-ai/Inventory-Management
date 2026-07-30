const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0')
  .then(async () => {
    const db = mongoose.connection.db;
    const items = await db.collection('items').find().toArray();
    let found = false;
    for (let item of items) {
      if (item.dynamicData && (item.dynamicData.solanLoaQuantity || item.dynamicData.nahanLoaQuantity)) {
        console.log('Item has LOA QTY:', item.dynamicData.name, item.dynamicData.solanLoaQuantity, item.dynamicData.nahanLoaQuantity);
        found = true;
      }
    }
    if (!found) { console.log('NO ITEMS HAVE LOA QTY POPULATED!'); }
    process.exit(0);
  });
