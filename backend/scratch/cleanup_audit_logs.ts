import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import AuditLog from '../src/modules/audit/auditLog.model';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/erp-system');
  console.log('Connected to DB');

  const result = await AuditLog.deleteMany({ entityType: 'UnknownEntity' });
  console.log(`Deleted ${result.deletedCount} UnknownEntity logs`);

  await mongoose.disconnect();
}

run().catch(console.error);
