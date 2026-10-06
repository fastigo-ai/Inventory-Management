const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to DB');
    const PI = mongoose.connection.collection('purchaseinvoices');
    
    const result = await PI.updateMany(
      {}, 
      { $set: { status: 'Posted' } }
    );
    console.log('Update result:', result);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
