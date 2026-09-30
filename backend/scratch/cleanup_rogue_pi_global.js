require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const PI = mongoose.model('PurchaseInvoice', new mongoose.Schema({}, { strict: false }));
    
    const pis = await PI.find({}).lean();
    let updatedCount = 0;
    let deletedCount = 0;
    let totalItemsRemoved = 0;
    
    for (const pi of pis) {
        if (!pi.lineItems || pi.lineItems.length === 0) continue;
        
        let needsUpdate = false;
        const validItems = [];
        
        for (const li of pi.lineItems) {
            const hasLoa = li.loaSerialNo && String(li.loaSerialNo).trim() !== '';
            
            if (!hasLoa) {
                console.log(`Removing item from PI ${pi.invoiceNumber} (Circle: ${li.circle || 'None'}): TempCode=${li.tempCode}, Qty=${li.quantity}`);
                needsUpdate = true;
                totalItemsRemoved++;
            } else {
                validItems.push(li);
            }
        }
        
        if (needsUpdate) {
            if (validItems.length === 0) {
                console.log(`Deleting entire PI ${pi.invoiceNumber} as it has no valid items left.`);
                await PI.deleteOne({ _id: pi._id });
                deletedCount++;
            } else {
                console.log(`Updating PI ${pi.invoiceNumber} to remove invalid items.`);
                await PI.updateOne({ _id: pi._id }, { $set: { lineItems: validItems } });
                updatedCount++;
            }
        }
    }
    
    console.log(`\nGlobal Cleanup Complete!`);
    console.log(`Items Removed: ${totalItemsRemoved}`);
    console.log(`PIs Updated: ${updatedCount}`);
    console.log(`PIs Deleted (Empty): ${deletedCount}`);
    
    process.exit(0);
});
