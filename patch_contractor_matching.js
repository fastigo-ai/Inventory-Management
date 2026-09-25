const fs = require('fs');
const path = require('path');

const files = [
  'backend/src/modules/jmc/jmc.controller.ts',
  'backend/src/modules/wip/wip.controller.ts',
  'backend/src/modules/wip-required/wipRequired.controller.ts'
];

const oldBlock = `      let contractorId = null;
      const contractorNameStr = meta.Contractor ? String(meta.Contractor) : "";
      if (contractorNameStr && contractorNames.length > 0) {
        const bestMatch = stringSimilarity.findBestMatch(contractorNameStr, contractorNames);
        if (bestMatch.bestMatch.rating > 0.4) {
          const matchedContractor = allContractors.find((c: any) => {
            const name = c.name || c.dynamicData?.companyName || c.dynamicData?.displayName || c.dynamicData?.name;
            return name === bestMatch.bestMatch.target;
          });
          if (matchedContractor) contractorId = matchedContractor._id;
        }
      }`;

const newBlock = `      let contractorId = null;
      const contractorNameStr = meta.Contractor ? String(meta.Contractor) : "";
      if (contractorNameStr && contractorNames.length > 0) {
        const lowerInput = contractorNameStr.trim().toLowerCase();
        const lowerNames = contractorNames.map((n) => String(n).trim().toLowerCase());
        const bestMatch = stringSimilarity.findBestMatch(lowerInput, lowerNames);
        if (bestMatch.bestMatch.rating > 0.4) {
          const matchedContractor = allContractors.find((c: any) => {
            const name = c.name || c.dynamicData?.companyName || c.dynamicData?.displayName || c.dynamicData?.name;
            return name && String(name).trim().toLowerCase() === bestMatch.bestMatch.target;
          });
          if (matchedContractor) contractorId = matchedContractor._id;
        }
      }`;

files.forEach(file => {
  const filePath = path.resolve(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(oldBlock)) {
      content = content.replace(oldBlock, newBlock);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Successfully patched ${file}`);
    } else {
      console.log(`Block not found in ${file}`);
    }
  } else {
    console.log(`File not found: ${file}`);
  }
});
