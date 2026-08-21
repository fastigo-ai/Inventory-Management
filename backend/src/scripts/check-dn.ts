import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function checkDN() {
  await mongoose.connect(process.env.MONGO_URI || '');
  const db = mongoose.connection.db!;
  const dns = await db.collection('demandnotes').find({}).toArray();
  console.log('Demand Notes count:', dns.length);
  const statuses = dns.map(d => d.status);
  console.log('Statuses:', [...new Set(statuses)]);
  
  // Also let's check users and their roles
  const users = await db.collection('users').find({}).toArray();
  console.log('User roles IDs:');
  for (const u of users.slice(0,5)) {
    const role = await db.collection('roles').findOne({ _id: u.role });
    console.log(`User ${u.firstName} role: ${role?.name}`);
  }
  await mongoose.disconnect();
}

checkDN().catch(console.error);
