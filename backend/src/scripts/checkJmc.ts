import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const JmcRegister = mongoose.model('JmcRegister', new mongoose.Schema({}, { strict: false }), 'jmcregisters');

async function testExportData() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  
  const jmcs = await JmcRegister.find({ _id: new mongoose.Types.ObjectId("6aa7bab903d852c8500b3ad6") }).lean();
  
  console.log(`Found JMC: ${jmcs.length}`);
  if (jmcs.length === 0) process.exit(0);
  
  const jmc = jmcs[0] as any;
  const items = jmc.items || [];
  
  // Find the items that have tempCode '101'
  const items101 = items.filter((i: any) => String(i.tempCode).trim() === '101');
  
  for(let i=0; i<items101.length; i++) {
     const it = items101[i];
     console.log(`JMC Item - Temp: '${it.tempCode}', LOA: '${it.loaSrNo || it.loaSerialNo}', Desc: '${it.description}'`);
  }
  
  // Find the items that have tempCode '83'
  const items83 = items.filter((i: any) => String(i.tempCode).trim() === '83');
  
  for(let i=0; i<items83.length; i++) {
     const it = items83[i];
     console.log(`JMC Item - Temp: '${it.tempCode}', LOA: '${it.loaSrNo || it.loaSerialNo}', Desc: '${it.description}'`);
  }

  process.exit(0);
}

testExportData().catch(err => {
    console.error(err);
    process.exit(1);
});
