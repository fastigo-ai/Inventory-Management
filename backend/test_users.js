const { MongoClient } = require('mongodb');
async function run() {
  const uri = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('test');
  
  const roles = await db.collection('roles').find({ name: 'Store Manager' }).toArray();
  if (roles.length > 0) {
    const smRoleId = roles[0]._id;
    const users = await db.collection('users').find({ role: smRoleId }).toArray();
    for (const u of users) {
      console.log(`Store Manager: ${u.firstName} ${u.lastName} | package: '${u.assignedPackage}' | circle: '${u.assignedCircle}'`);
    }
  }
  await client.close();
}
run().catch(console.error);
