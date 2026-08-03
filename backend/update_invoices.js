const mongoose = require('mongoose');

async function updateAllInvoices() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0");
    console.log("Connected to MongoDB.");
    
    const db = mongoose.connection;
    const result = await db.collection('purchaseinvoices').updateMany(
      {}, // Match all documents
      { $set: { status: 'Paid' } }
    );
    
    console.log(`Updated ${result.modifiedCount} invoices to 'Paid' status.`);
  } catch (error) {
    console.error("Error updating invoices:", error);
  } finally {
    mongoose.disconnect();
  }
}

updateAllInvoices();
