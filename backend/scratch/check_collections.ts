import mongoose from 'mongoose';

const MONGO_URI = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/inventory-erp?retryWrites=true&w=majority";

async function checkCollections() {
  await mongoose.connect(MONGO_URI);
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('Collections:', collections.map(c => c.name));
  process.exit(0);
}
checkCollections();
