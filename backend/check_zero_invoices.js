const mongoose = require('mongoose');

async function checkInvoices() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0");
    const db = mongoose.connection;
    const zeroInvoices = await db.collection('purchaseinvoices').find({ $or: [{ total: 0 }, { total: { $exists: false } }, { total: null }] }).limit(3).toArray();
    console.log("Found:", zeroInvoices.length);
    console.log(JSON.stringify(zeroInvoices, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    mongoose.disconnect();
  }
}

checkInvoices();
