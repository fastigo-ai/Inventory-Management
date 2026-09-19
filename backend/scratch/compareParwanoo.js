const mongoose = require('mongoose');
const xlsx = require('xlsx');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const JmcRegister = mongoose.model('JmcRegister', new mongoose.Schema({
        location: String,
        division: String,
        subStation: String,
        feeder: String
    }, { collection: 'jmcregisters' }));

    const dbJmcs = await JmcRegister.find({ division: { $regex: 'Parwanoo', $options: 'i' } });
    const dbLocations = dbJmcs.map(j => (j.location || j.subStation || j.feeder || '').trim().toUpperCase());

    const wb = xlsx.readFile('C:\\Users\\sanjeet kumar\\Downloads\\Parwanoo.xlsx');
    const rows = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header: 1});
    const locRow = rows[5]; // Location
    
    const excelLocations = [];
    for(let i=3; i<locRow.length; i++) {
        if(locRow[i]) excelLocations.push(locRow[i].toString().trim().toUpperCase());
    }

    console.log(`DB Count: ${dbLocations.length}, Excel Count: ${excelLocations.length}`);

    const excelSet = new Set(excelLocations);
    const dbSet = new Set(dbLocations);

    const inExcelNotDb = [...excelSet].filter(l => !dbSet.has(l));
    const inDbNotExcel = [...dbSet].filter(l => !excelSet.has(l));

    console.log('In Excel but NOT in DB:', inExcelNotDb);
    console.log('In DB but NOT in Excel:', inDbNotExcel);

    mongoose.connection.close();
}).catch(console.error);
