const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  
  const dis = await mongoose.connection.db.collection('dis').find({ diNumber: "1417-47" }).toArray();
  console.log(`Found ${dis.length} DI(s) with number '1417-47'`);
  
  dis.forEach(di => {
      console.log(`DI: ${di.diNumber} | ID: ${di._id} | Circle: ${di.circle} | Date: ${di.diDate}`);
      console.log(`Number of items: ${di.lineItems?.length || 0}`);
      di.lineItems?.forEach(item => {
          console.log(` - Item: ${item.itemName} | Serial: ${item.loaSerialNo} | TempCode: ${item.tempCode}`);
      });
      console.log('-------------------------');
  });
  
  process.exit(0);
}
run();
