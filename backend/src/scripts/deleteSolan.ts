import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const JmcRegister = mongoose.model('JmcRegister', new mongoose.Schema({}, { strict: false }), 'jmcregisters');
const Wip = mongoose.model('Wip', new mongoose.Schema({}, { strict: false }), 'wips');
const WipRequired = mongoose.model('WipRequired', new mongoose.Schema({}, { strict: false }), 'wiprequireds');

async function deleteSolanData() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  
  const circleRegex = new RegExp('^solan$', 'i');
  
  const delJmc = await JmcRegister.deleteMany({ circle: { $regex: circleRegex } });
  console.log(`Deleted ${delJmc.deletedCount} JMC records for Solan`);
  
  const delWip = await Wip.deleteMany({ circle: { $regex: circleRegex } });
  console.log(`Deleted ${delWip.deletedCount} WIP Consumed records for Solan`);
  
  const delWipReq = await WipRequired.deleteMany({ circle: { $regex: circleRegex } });
  console.log(`Deleted ${delWipReq.deletedCount} WIP Required records for Solan`);
  
  process.exit(0);
}

deleteSolanData().catch(err => {
    console.error(err);
    process.exit(1);
});
