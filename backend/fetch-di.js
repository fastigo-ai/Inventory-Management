const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0?retryWrites=true&w=majority');
  const DI = mongoose.connection.collection('dis');
  const di = await DI.findOne({ "lineItems.0": { $exists: true } });
  console.log(JSON.stringify(di, null, 2));
  process.exit(0);
}

main().catch(console.error);
