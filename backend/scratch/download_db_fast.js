const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/erp_db';

async function exportDB() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    const exportData = {};
    console.log('Exporting database...');
    for (const collectionInfo of collections) {
      const colName = collectionInfo.name;
      const collection = db.collection(colName);
      const data = await collection.find({}).toArray();
      exportData[colName] = data;
      console.log(`Exported collection: ${colName} (${data.length} documents)`);
    }

    const outputPath = path.resolve(__dirname, '../../erp_db_backup.json');
    // Using no formatting to avoid out-of-memory and speed up writing
    fs.writeFileSync(outputPath, JSON.stringify(exportData));
    console.log(`\nDatabase exported successfully to: ${outputPath}`);
    process.exit(0);
  } catch (error) {
    console.error('Error exporting database:', error);
    process.exit(1);
  }
}

exportDB();
