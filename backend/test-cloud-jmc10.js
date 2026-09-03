const mongoose = require('mongoose');
const URI = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';
mongoose.connect(URI).then(async () => {
  const Invoice = mongoose.connection.collection('contractorinvoices');
  const ak = await mongoose.connection.collection('contractors').findOne({ $or: [{ name: /A K Contractor/i }, { 'dynamicData.companyName': /A K Contractor/i }] });
  
  const invs = await Invoice.find({ contractorId: ak._id, status: { $ne: 'Rejected' } }).toArray();
  console.log(`Found ${invs.length} past invoices for AK Contractor`);
  let billedQty = 0;
  invs.forEach(inv => {
    inv.lineItems.forEach(li => {
      billedQty += li.jmcDoneQty || 0;
      console.log(`Invoice ${inv.invoiceNumber}, Item: ${li.itemId}, jmcDoneQty: ${li.jmcDoneQty}`);
    });
  });
  console.log("Total billed jmcDoneQty:", billedQty);
  process.exit(0);
});
