const fs = require('fs');
const path = require('path');

const directory = 'c:/Users/sanjeet kumar/Desktop/DoortwoFy/erp-system/frontend/src/app';

function replaceLimit(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            replaceLimit(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('limit: 1000')) {
                // Ensure we don't accidentally modify limits that shouldn't be touched, 
                // but since these are all getting items for forms, 50000 is safer.
                content = content.replace(/limit:\s*1000/g, 'limit: 50000');
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Updated', fullPath);
            }
        }
    }
}

replaceLimit(directory);
console.log('Done');
