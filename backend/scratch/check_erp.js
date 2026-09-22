const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  try {
    await client.connect();
    const erp = client.db('erp-system');
    
    let contractor = await erp.collection('contractors').findOne({ companyName: /Jai prakash/i });
    console.log(`Contractor in erp-system: ${contractor?.companyName}`);
    
    let fastigo = client.db('fastigo_erp');
    let c2 = await fastigo.collection('contractors').findOne({ companyName: /Jai prakash/i });
    console.log(`Contractor in fastigo_erp: ${c2?.companyName}`);
    
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
