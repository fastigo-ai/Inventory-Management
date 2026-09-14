const fs = require('fs');
const path = require('path');
// Mocking express request
const filePath = '/Users/Apple/Desktop/JMC PORTAL.xlsx';
const buffer = fs.readFileSync(filePath);

// We need to import parseJmcTemplate. We can compile it or use ts-node.
// Since ts-node might not be configured, let's just write a small script that compiles and runs it.
