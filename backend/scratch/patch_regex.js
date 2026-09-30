const fs = require('fs');
let content = fs.readFileSync('backend/src/modules/di/di.controller.ts', 'utf8');

const regexToReplace = /n\.replace\(\/\[\.\*\+\?\^\$\{\}\(\)\|\[\\\\\]\\\\\\\\\]\/g, '\\\\\\\\\$&'\)/g;
const fixedString = "n.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')";

content = content.replace("n.replace(/[.*+?^${}()|[\\\\]\\\\\\\\]/g, '\\\\\\\\$&')", fixedString);
fs.writeFileSync('backend/src/modules/di/di.controller.ts', content);
