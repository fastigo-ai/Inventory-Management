const n = 'LT AB Cable on poles [Size: : 3x70mm] + 50 sqmm+16sqmm x 1 Cables {Inclusive 3% sagging & wastage}';

try {
  const currentRegex = /[.*+?^${}()|[\\]\\\\]/g;
  console.log('Current regex output:', n.replace(currentRegex, '\\$&'));
  new RegExp('^' + n.replace(currentRegex, '\\$&') + '$', 'i');
} catch (e) {
  console.log('Current regex failed:', e.message);
}

try {
  const fixedRegex = /[.*+?^${}()|[\]\\]/g;
  console.log('Fixed regex output:', n.replace(fixedRegex, '\\$&'));
  new RegExp('^' + n.replace(fixedRegex, '\\$&') + '$', 'i');
  console.log('Fixed regex succeeded!');
} catch(e) {
  console.log('Fixed regex failed:', e.message);
}
