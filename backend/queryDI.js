const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";

async function queryDI() {
  try {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;

    const dis = await db.collection('dis').find({ 
      status: { $ne: 'Cancelled' }
    }).toArray();
    
    let totalQty = 0;
    
    dis.forEach(di => {
      // Check if DI circle is Nahan or if any line item circle is Nahan
      const isDICircleNahan = (di.circle || '').toLowerCase() === 'nahan';
      
      if (!di.lineItems) return;
      
      di.lineItems.forEach(item => {
        const isItemCircleNahan = (item.circle || '').toLowerCase() === 'nahan';
        const name = (item.itemName || '').toLowerCase();
        
        // Filter by item name "stp 9 mtr" or similar
        if (name.includes('stp') && name.includes('9') && name.includes('mtr')) {
          // If DI circle is nahan, or line item circle is nahan, or if both are empty but the DI package is 1(S/N)?
          // Let's just check if it's Nahan
          if (isDICircleNahan || isItemCircleNahan) {
            totalQty += Number(item.quantity || 0);
          }
        }
      });
    });

    console.log("Total DI Qty for STP 9 Mtr in Nahan:", totalQty);
    
  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
}

queryDI();
