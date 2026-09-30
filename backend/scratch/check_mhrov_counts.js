require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const Mhrov = mongoose.model('Mhrov', new mongoose.Schema({}, {strict: false}));
    const circles = await Mhrov.aggregate([{ $group: { _id: '$circle', count: { $sum: 1 } } }]);
    console.log("MHROV Circles:");
    console.log(circles);
    
    // Check if there are DIs with MHROV Numbers that haven't been mapped yet?
    const DI = mongoose.model('DI', new mongoose.Schema({}, {strict: false}));
    const diMhrovs = await DI.aggregate([
      { $unwind: "$lineItems" },
      { $match: { "lineItems.mhrovNumber": { $exists: true, $ne: null, $ne: "" } } },
      { $group: { _id: "$circle", count: { $sum: 1 } } }
    ]);
    console.log("DIs with MHROV number (by circle):");
    console.log(diMhrovs);

    process.exit(0);
});
