import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || '';

async function checkRequestedBy() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.\n');

  const transferCol = mongoose.connection.collection('storetransfers');
  const userCol = mongoose.connection.collection('users');

  const transfers = await transferCol.find({}).limit(10).toArray();
  const users = await userCol.find({}).toArray();

  console.log('Users in DB:');
  users.forEach(u => {
    console.log(`  User _id: ${u._id} | Name: "${u.firstName} ${u.lastName}" | Email: "${u.email}" | Role: "${u.role}"`);
  });

  console.log('\nSample Transfers in DB:');
  transfers.forEach(t => {
    console.log(`  Transfer _id: ${t._id} | requestedBy ID: ${t.requestedBy} | requestedByName: ${t.requestedByName}`);
  });

  await mongoose.disconnect();
}

checkRequestedBy().catch(err => {
  console.error(err);
  mongoose.disconnect();
});
