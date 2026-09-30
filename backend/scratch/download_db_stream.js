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
    
    const outputPath = path.resolve(__dirname, '../../erp_db_backup.json');
    const stream = fs.createWriteStream(outputPath);
    
    stream.write('{\n');
    console.log('Exporting database...');
    
    const ignoredCollections = ['itemsummaries', 'audits', 'logs', 'sessions'];
    const colsToExport = collections.filter(c => !ignoredCollections.includes(c.name));
    
    for (let i = 0; i < colsToExport.length; i++) {
      const colName = colsToExport[i].name;
      stream.write(`  "${colName}": [\n`);
      
      const collection = db.collection(colName);
      const cursor = collection.find({});
      
      let first = true;
      let count = 0;
      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        if (!first) {
          stream.write(',\n');
        }
        stream.write('    ' + JSON.stringify(doc));
        first = false;
        count++;
      }
      
      stream.write('\n  ]');
      if (i < colsToExport.length - 1) {
         stream.write(',\n');
      } else {
         stream.write('\n');
      }
      
      console.log(`Exported collection: ${colName} (${count} documents)`);
    }

    stream.write('}\n');
    stream.end();
    
    stream.on('finish', () => {
       console.log(`\nDatabase exported successfully to: ${outputPath}`);
       process.exit(0);
    });
  } catch (error) {
    console.error('Error exporting database:', error);
    process.exit(1);
  }
}

exportDB();
