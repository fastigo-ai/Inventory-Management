const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: './.env' });

const MONGO_URI = process.env.MONGO_URI;

async function checkDILoaSerialNos() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to remote DB');

    const db = mongoose.connection.db;
    
    // Fetch all DIs
    const dis = await db.collection('dis').find({}).toArray();
    
    let totalItems = 0;
    let itemsWithLoa = 0;
    let itemsWithoutLoa = 0;
    let disWithMissingLoa = 0;
    
    for (const di of dis) {
      let hasMissingInThisDI = false;
      const items = di.lineItems || [];
      
      for (const item of items) {
        totalItems++;
        const loa = item.loaSerialNo || item.loaSrNo;
        if (loa && loa.trim() !== '') {
          itemsWithLoa++;
        } else {
          itemsWithoutLoa++;
          hasMissingInThisDI = true;
          // Uncomment to see specific items
          // console.log(`Missing LOA in DI ${di.diNumber} - Item TempCode: ${item.tempCode}, Name: ${item.itemName}`);
        }
      }
      
      if (hasMissingInThisDI) {
        disWithMissingLoa++;
      }
    }
    
    console.log(`\n--- DI Line Items LOA Serial No Analysis ---`);
    console.log(`Total DIs checked: ${dis.length}`);
    console.log(`Total Line Items: ${totalItems}`);
    console.log(`Items WITH LOA Serial No: ${itemsWithLoa}`);
    console.log(`Items WITHOUT LOA Serial No: ${itemsWithoutLoa}`);
    console.log(`Number of DIs containing at least one item without LOA: ${disWithMissingLoa}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from DB');
  }
}

checkDILoaSerialNos();
