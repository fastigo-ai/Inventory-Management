const targetPackage = "Package-1(S/N)";
const packageEscaped = targetPackage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s*');
const packageRegex = new RegExp(`^${packageEscaped}$`, 'i');
console.log('Regex:', packageRegex);
console.log('Test "Package-1(S/N)":', packageRegex.test('Package-1(S/N)'));
console.log('Test "Package 1(S/N)":', packageRegex.test('Package 1(S/N)'));
console.log('Test "Package 1 (S/N)":', packageRegex.test('Package 1 (S/N)'));
