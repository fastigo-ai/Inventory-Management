require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI || process.env.DB_URI || process.env.MONGODB_URI)
  .then(async () => {
    try {
      // Define inline schema
      const JmcRegisterSchema = new mongoose.Schema({
        status: { type: String }
      }, { collection: 'jmcregisters' }); // The model name is JmcRegister, so collection is probably jmcregisters

      const JmcModel = mongoose.model('JmcRegisterInline', JmcRegisterSchema);
      
      const approvedCount = await JmcModel.countDocuments({ status: 'Approved' });
      const draftCount = await JmcModel.countDocuments({ status: 'Draft' });
      const submittedCount = await JmcModel.countDocuments({ status: 'Submitted' });
      
      console.log('JMC Counts:');
      console.log('- Approved:', approvedCount);
      console.log('- Draft:', draftCount);
      console.log('- Submitted:', submittedCount);
      
    } catch (err) {
      console.error(err);
    } finally {
      process.exit(0);
    }
  });
