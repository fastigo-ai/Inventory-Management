import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function checkRoles() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || '');
  const db = mongoose.connection.db;
  if (!db) return;

  const roles = await db.collection('roles').find({}).toArray();
  for (const r of roles) {
    console.log(`Role: ${r.name} | _id: ${r._id}`);
  }

  process.exit(0);
}

checkRoles().catch(console.error);
