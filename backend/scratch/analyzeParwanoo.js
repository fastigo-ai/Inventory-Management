const mongoose = require('mongoose');
const xlsx = require('xlsx');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const JmcRegister = mongoose.model('JmcRegister', new mongoose.Schema({
        location: String,
        division: String,
        subStation: String,
        feeder: String,
        jmcNumber: String,
        createdAt: Date,
        contractorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contractor' }
    }, { collection: 'jmcregisters' }));

    const dbJmcs = await JmcRegister.find({ division: { $regex: 'Parwanoo', $options: 'i' } }).lean();
    console.log(`Total in DB: ${dbJmcs.length}`);
    
    // Group by Date
    const byDate = {};
    dbJmcs.forEach(j => {
        const d = j.createdAt.toISOString.substring ? j.createdAt.toISOString().substring(0, 16) : j.createdAt.toString();
        byDate[d] = (byDate[d] || 0) + 1;
    });
    console.log('Grouped by createdAt:', byDate);

    // Read both excel sheets
    const sheets = ['PARWANOO JMC.xlsx', 'Parwanoo.xlsx'];
    for (const sheetName of sheets) {
        try {
            const wb = xlsx.readFile(`C:\\Users\\sanjeet kumar\\Downloads\\${sheetName}`);
            const rows = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header: 1});
            const locRow = rows[5]; 
            const excelLocations = [];
            for(let i=3; i<locRow.length; i++) {
                if(locRow[i]) excelLocations.push(locRow[i].toString().trim().toUpperCase());
            }
            console.log(`\nSheet ${sheetName} has ${excelLocations.length} locations on row 5 (starting col 3).`);
            
            // let's also count the non-empty columns on row 5, ignoring first 3
            let count = 0;
            for(let i=3; i<locRow.length; i++) {
                if(locRow[i]) count++;
            }
            console.log(`Count of locations in ${sheetName}: ${count}`);
        } catch(e) {
            console.log(`Error reading ${sheetName}: ${e.message}`);
        }
    }

    mongoose.connection.close();
}).catch(console.error);
