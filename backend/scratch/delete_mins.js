const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

async function deleteMins() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Find Soma Electrical contractor
    const Contractor = mongoose.models.Contractor || mongoose.model('Contractor', new mongoose.Schema({
      dynamicData: mongoose.Schema.Types.Mixed
    }, { strict: false }));
    
    const soma = await Contractor.findOne({
      $or: [
        { "dynamicData.displayName": /soma electrical/i },
        { "dynamicData.name": /soma electrical/i },
        { "dynamicData.companyName": /soma electrical/i },
        { "dynamicData.contractorName": /soma electrical/i }
      ]
    });

    if (!soma) {
      console.log('Soma Electrical not found');
      process.exit(1);
    }

    console.log(`Found Soma Electrical: ${soma._id}`);

    const ContractorAssignment = mongoose.models.ContractorAssignment || mongoose.model('ContractorAssignment', new mongoose.Schema({
      contractorId: mongoose.Schema.Types.ObjectId,
      minNo: String,
      circle: String,
      location: String,
      status: String
    }, { strict: false }));

    // Find MINs for Soma in Nahan
    const mins = await ContractorAssignment.find({
      contractorId: soma._id,
      $or: [
        { circle: /nahan/i },
        { location: /nahan/i }
      ]
    });

    console.log(`Found ${mins.length} MINs for Soma Electrical in Nahan.`);
    
    const toDelete = mins.filter(m => m.minNo !== '12' && m.minNo !== 12);
    console.log(`Will delete ${toDelete.length} MINs (kept MIN 12).`);
    
    for (const m of toDelete) {
      console.log(`Deleting MIN NO: ${m.minNo} (ID: ${m._id})`);
      await ContractorAssignment.deleteOne({ _id: m._id });
    }

    console.log('Done');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

deleteMins();
