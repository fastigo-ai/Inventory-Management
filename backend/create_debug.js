const fs = require('fs');
let code = fs.readFileSync('compare_jmc_data.js', 'utf8');
code += '\nconsole.log(Array.from(dataImported.keys()).slice(0,2)); console.log(Array.from(dataExported.keys()).slice(0,2));';
fs.writeFileSync('debug_keys.js', code);
