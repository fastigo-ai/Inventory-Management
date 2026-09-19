const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const { stringify } = require('csv-stringify');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const Item = mongoose.model('Item', new mongoose.Schema({}, { strict: false }), 'items');

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
    console.log('Connected to MongoDB');

    // Fetch items (especially Solan, or just all items to build a map)
    const items = await Item.find({ isDeleted: { $ne: true } }).lean();
    console.log(`Fetched ${items.length} items from DB`);

    // Build map: circle -> tempCode/itemName -> unit
    const itemMap = {};
    for (const item of items) {
      const d = item.dynamicData || {};
      const circle = (d.circle || '').toString().trim().toLowerCase();
      const tempCode = (d.tempCode || '').toString().trim().toLowerCase();
      const itemName = (d.name || d.description || d.itemDescription || '').toString().trim().toLowerCase();
      const unit = d.unit || d.uom || '';

      if (!itemMap[circle]) itemMap[circle] = { byTempCode: {}, byName: {} };
      
      if (tempCode) itemMap[circle].byTempCode[tempCode] = unit;
      if (itemName) itemMap[circle].byName[itemName] = unit;
    }

    const inputPath = path.join(__dirname, 'contractor_issues.csv');
    const outputPath = path.join(__dirname, 'contractor_issues_fixed.csv');

    const records = [];
    const parser = fs.createReadStream(inputPath).pipe(parse({ columns: true, bom: true }));

    let updatedCount = 0;
    for await (const row of parser) {
      const rowCircle = (row.Circle || '').toString().trim().toLowerCase();
      const rowTempCode = (row.TempCode || '').toString().trim().toLowerCase();
      const rowItemName = (row.ItemName || '').toString().trim().toLowerCase();
      
      let newUnit = null;
      // Fallback: If rowCircle isn't found, default to 'solan' as per user request context
      const searchCircle = itemMap[rowCircle] ? rowCircle : (itemMap['solan'] ? 'solan' : rowCircle);
      
      if (itemMap[searchCircle]) {
        if (rowTempCode && itemMap[searchCircle].byTempCode[rowTempCode]) {
          newUnit = itemMap[searchCircle].byTempCode[rowTempCode];
        } else if (rowItemName && itemMap[searchCircle].byName[rowItemName]) {
          newUnit = itemMap[searchCircle].byName[rowItemName];
        }
      }

      if (newUnit && row.Unit !== newUnit) {
        row.Unit = newUnit;
        updatedCount++;
      }
      
      records.push(row);
    }

    console.log(`Updated ${updatedCount} rows with new units.`);

    stringify(records, { header: true }, (err, output) => {
      if (err) throw err;
      fs.writeFileSync(outputPath, output);
      console.log(`Saved fixed CSV to ${outputPath}`);
      process.exit(0);
    });

  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();
