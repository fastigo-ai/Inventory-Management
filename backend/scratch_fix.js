const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    replacements.forEach(([search, replace]) => {
        content = content.split(search).join(replace);
    });
    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log('Updated', filePath);
    }
}

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

const replacements = [
    ["'DRAFT'", "'Draft'"],
    ['\"DRAFT\"', '\"Draft\"'],
    ["'PENDING_RECEIPT'", "'Pending Receipt'"],
    ['\"PENDING_RECEIPT\"', '\"Pending Receipt\"'],
    ["'APPROVED'", "'Approved'"],
    ['\"APPROVED\"', '\"Approved\"'],
    ["'SUBMITTED'", "'Submitted'"],
    ['\"SUBMITTED\"', '\"Submitted\"'],
    ["'VERIFIED'", "'Verified'"],
    ['\"VERIFIED\"', '\"Verified\"'],
    ["'NEEDS_CORRECTION'", "'Needs Correction'"],
    ['\"NEEDS_CORRECTION\"', '\"Needs Correction\"'],
    ["'VOIDED'", "'Voided'"],
    ['\"VOIDED\"', '\"Voided\"'],
    ["'done'", "'Done'"],
    ['\"done\"', '\"Done\"'],
    ["'pending'", "'Pending'"],
    ['\"pending\"', '\"Pending\"'],
    ["'MHROV done but not signed'", "'Pending Signature'"],
    ['\"MHROV done but not signed\"', '\"Pending Signature\"']
];

walkDir('src/modules', function(filePath) {
    if (filePath.endsWith('.ts')) {
        replaceInFile(filePath, replacements);
    }
});

walkDir('../frontend/src', function(filePath) {
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
        replaceInFile(filePath, replacements);
    }
});
console.log('Frontend and Backend replaced.');
