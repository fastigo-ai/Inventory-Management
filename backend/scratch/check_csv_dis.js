const fs = require('fs');
const readline = require('readline');
const mongoose = require('mongoose');
require('dotenv').config();

const filePath = 'C:\\Users\\sanjeet kumar\\Downloads\\di_registration_sample 3009 Rampur (1).csv';

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const DI = mongoose.connection.collection('dis');
    const diNumbers = new Set();
    
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let headers = [];
    let diNumIndex = -1;
    let isFirstLine = true;

    for await (const line of rl) {
      if (isFirstLine) {
        headers = line.split(',');
        diNumIndex = headers.findIndex(h => {
          const lower = h.toLowerCase().replace(/["\s]/g, '');
          return lower.includes('dinum') || lower.includes('dino');
        });
        isFirstLine = false;
        continue;
      }
      
      if (diNumIndex !== -1) {
        // Basic CSV split, ignores quotes escaping unfortunately, but sufficient for DI numbers usually
        const cols = line.split(',');
        if (cols.length > diNumIndex) {
          const diNum = cols[diNumIndex].replace(/["\r]/g, '').trim();
          if (diNum) diNumbers.add(diNum);
        }
      }
    }
    
    const uniqueDIs = Array.from(diNumbers);
    console.log(`Found ${uniqueDIs.length} unique DI numbers in CSV.`);
    
    if (uniqueDIs.length > 0) {
      const existingDIs = await DI.find({ diNumber: { $in: uniqueDIs } }).toArray();
      console.log(`Found ${existingDIs.length} DIs already in the database:`);
      existingDIs.forEach(d => console.log(`- ${d.diNumber} (Status: ${d.status})`));
    }
    
    process.exit(0);
  })
  .catch(console.error);
