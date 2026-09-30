require('dotenv').config();
const m = require('mongoose');
m.connect(process.env.MONGO_URI).then(async()=>{
  const DI = m.model('DI', new m.Schema({},{strict:false}));
  const uniqueDiNos = ['21058-86', '1355-85'];
  
  // Case insensitive approach using Regex in $in or we can just try case-sensitive first
  const allDIs = await DI.find({ diNumber: { $in: uniqueDiNos } }).lean();
  console.log('Case sensitive match:', allDIs.map(d=>d.diNumber));

  // Try with regex
  const regexes = uniqueDiNos.map(no => new RegExp('^' + no + '$', 'i'));
  const allDIsRegex = await DI.find({ diNumber: { $in: regexes } }).lean();
  console.log('Case insensitive match:', allDIsRegex.map(d=>d.diNumber));
  
  // Try checking with spaces
  const allDIsSpaces = await DI.find({ diNumber: { $regex: /21058-86/ } }).lean();
  console.log('Contains 21058-86 (with possible spaces/quotes):', allDIsSpaces.map(d=>`"${d.diNumber}"`));
  
  process.exit(0);
});
