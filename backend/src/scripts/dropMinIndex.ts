import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function check() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
  console.log('Connected.');
  
  try {
     const db = mongoose.connection.db;
     if (!db) { throw new Error("DB connection not found"); }
     await db.collection('contractorassignments').dropIndex('assignmentNumber_1');
     console.log('Index assignmentNumber_1 dropped.');
  } catch (err: any) {
     console.log('Error dropping index (may not exist):', err.message);
  }
  
  process.exit(0);
}

check();
