const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to DB');
    const db = mongoose.connection.db;
    const BillingCompany = db.collection('billingcompanies');
    const PI = db.collection('purchaseinvoices');
    
    const holistic = await BillingCompany.findOne({ name: { $regex: /holistic/i } });
    if (!holistic) {
      console.log('Holistic company not found in billingcompanies');
      process.exit(1);
    }
    console.log('Found Holistic:', holistic);
    
    const result = await PI.updateMany(
      {},
      { 
        $set: { 
          'billingCompany.name': holistic.name,
          'billingCompany.address': holistic.address || '',
          'billingCompany.gstin': holistic.gstin || '',
          'billingCompany.state': holistic.state || '',
          'billingFrom': holistic.name
        } 
      }
    );
    console.log('Update result:', result);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
