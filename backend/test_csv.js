const { parseAndSanitizeCsv } = require('./dist/utils/csv.util.js');
const buffer = Buffer.from('Name,TEMP CODE\nTest Name,12345\n"Test 2",67890');
const parsed = parseAndSanitizeCsv(buffer);
console.log(parsed);
