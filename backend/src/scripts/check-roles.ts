import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function checkRoles() {
  await mongoose.connect(process.env.MONGO_URI || '');
  const db = mongoose.connection.db!;
  const roles = await db.collection('roles').find({}).toArray();
  console.log('Roles:');
  roles.forEach(r => console.log(r.name));
  await mongoose.disconnect();
}

checkRoles().catch(console.error);
