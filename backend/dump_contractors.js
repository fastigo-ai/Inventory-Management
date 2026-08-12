const mongoose = require('mongoose');
const fs = require('fs');

mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0?retryWrites=true&w=majority')
  .then(async () => {
    const contractors = await mongoose.connection.db.collection('contractors').find().toArray();
    const names = contractors.map(c => c.dynamicData?.companyName).filter(Boolean);
    fs.writeFileSync('contractors_dump.txt', names.join('\n'));
    console.log('Done');
    process.exit(0);
  });
