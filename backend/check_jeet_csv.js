const fs = require('fs');
const path = 'C:\\Users\\sanjeet kumar\\Downloads\\Jeet.csv';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');
console.log("Header:", lines[0]);
console.log("Line 1:", lines[1]);
