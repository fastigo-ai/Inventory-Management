import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const Item = mongoose.model('Item', new mongoose.Schema({}, { strict: false }), 'items');
const JmcRegister = mongoose.model('JmcRegister', new mongoose.Schema({}, { strict: false }), 'jmcregisters');

async function testExportData() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  
  const jmcs = await JmcRegister.find({ _id: new mongoose.Types.ObjectId("6aa7bab903d852c8500b3ad6") }).lean();
  const testJmc = jmcs[0] as any;
  
  if (!testJmc) process.exit(0);
  
  const items = await Item.find({ "dynamicData.circle": "Solan" }).lean() as any[];
  
  let failedMatches = 0;
  
  testJmc.items.forEach((jmcItem: any) => {
      // Find the master item for this JMC item using the old buggy logic
      const masterItemsMatches = items.filter((m: any) => {
          const d = m.dynamicData || {};
          const act = d.activity ? String(d.activity).trim() : '';
          const tempCode = d.tempCode || m.tempCode || '';
          
          if (!jmcItem.activity || act.toLowerCase() !== jmcItem.activity.trim().toLowerCase()) return false;
          if (tempCode && String(jmcItem.tempCode) === String(tempCode)) return true;
          return false;
      });
      
      if (masterItemsMatches.length > 0) {
          // See if the NEW logic matches ANY of these master items
          const newLogicMatch = masterItemsMatches.find((masterItem: any) => {
              const d = masterItem.dynamicData || {};
              const tempCode = d.tempCode || masterItem.tempCode || '';
              const loaSrNo = d.loaSrNo || d.loaSerialNo || d.sku || masterItem.sku || '';
              const desc = d.description || d.itemDescription || d.name || '';
              const act = d.activity ? String(d.activity).trim() : '';
              
              if (jmcItem.itemId && jmcItem.itemId.toString() === masterItem._id.toString()) return true;
              
              const actMatch = (jmcItem.activity || '').trim().toLowerCase() === (act ? act.toLowerCase() : '');
              const tempMatch = String(jmcItem.tempCode || '') === String(tempCode || '');
              const loaMatch = String(jmcItem.loaSrNo || jmcItem.loaSerialNo || '') === String(loaSrNo || '');
              const descMatch = String(jmcItem.description || jmcItem.itemDescription || '') === String(desc || '');
              
              return tempMatch && loaMatch && descMatch;
          });
          
          if (!newLogicMatch) {
              failedMatches++;
              console.log(`Failed to strictly match JMC Item: Temp: '${jmcItem.tempCode}', LOA: '${jmcItem.loaSrNo}', Desc: '${jmcItem.description}'`);
              masterItemsMatches.forEach((m:any) => {
                 const d = m.dynamicData || {};
                 console.log(`   Candidate Master: Temp: '${d.tempCode}', LOA: '${d.loaSrNo || d.sku}', Desc: '${d.description || d.name}'`);
                 
                 const loaMatch = String(jmcItem.loaSrNo || jmcItem.loaSerialNo || '') === String(d.loaSrNo || d.sku || '');
                 const descMatch = String(jmcItem.description || jmcItem.itemDescription || '') === String(d.description || d.name || '');
                 console.log(`     -> loaMatch: ${loaMatch}, descMatch: ${descMatch}`);
              });
          }
      }
  });

  console.log(`Total failed strict matches: ${failedMatches}`);

  process.exit(0);
}

testExportData().catch(err => {
    console.error(err);
    process.exit(1);
});
