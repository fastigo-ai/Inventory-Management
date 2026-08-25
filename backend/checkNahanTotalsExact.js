const mongoose = require('mongoose');
const uri = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';

async function run() {
  await mongoose.connect(uri);

  const Item = mongoose.model('Item', new mongoose.Schema({ dynamicData: Object, circle: String, name: String, tempCode: String }));
  const ContractorAssignment = mongoose.model('ContractorAssignment', new mongoose.Schema({ location: String, division: String, status: String, lineItems: Array }));
  
  const nahanItems = await Item.find({
    $or: [{ 'dynamicData.circle': /nahan/i }, { circle: /nahan/i }]
  }).lean();
  
  const validTempCodes = new Set(nahanItems.map(it => String(it.dynamicData?.tempCode || it.tempCode || '').trim()));
  const validNames = new Set(nahanItems.map(it => String(it.dynamicData?.name || it.name || '').trim().toLowerCase()));

  const assignments = await ContractorAssignment.find({
    status: { $ne: 'Cancelled' },
    $or: [{ location: /nahan/i }, { division: /nahan/i }, { 'lineItems.circle': /nahan/i }]
  }).lean();
  
  let totalIssued = 0;
  assignments.forEach(a => {
    (a.lineItems || []).forEach(li => {
      const temp = String(li.tempCode || '').trim();
      const name = String(li.itemName || li.name || li.description || '').trim().toLowerCase();
      
      if ((temp && temp !== '-' && validTempCodes.has(temp)) || (name && validNames.has(name))) {
        totalIssued += Number(li.quantity || li.acceptedQuantity || li.issuedQty || 0);
      }
    });
  });

  console.log('Total Issued (Filtered by Nahan Items):', totalIssued);
  mongoose.disconnect();
}
run().catch(console.error);
