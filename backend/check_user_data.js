const mongoose = require('mongoose');
const { getSitePortalDashboardSummary } = require('./src/modules/dashboard/dashboard.controller');

async function checkUserAndData() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0?retryWrites=true&w=majority');
  
  const User = mongoose.connection.collection('users');
  const user = await User.findOne({ email: 'solansite@gmail.com' });
  
  if (!user) {
    console.log('User not found');
    process.exit(1);
  }

  const req = {
    user: user,
    query: {}
  };
  
  const res = {
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      console.log('API Response:', JSON.stringify(data, null, 2));
      process.exit(0);
    }
  };
  
  // Need to mock the models that are missing
  require('./src/modules/wip/wip.schema');
  require('./src/modules/jmc/jmc.schema');
  require('./src/modules/demand-notes/demandNote.schema');
  require('./src/modules/store/mhrov.schema');
  require('./src/modules/contractors/contractor.schema');
  require('./src/modules/contractors/contractorReturn.schema');

  try {
    await getSitePortalDashboardSummary(req, res);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}
checkUserAndData();
