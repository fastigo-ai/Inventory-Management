const str = "Package 1 (S/N)";
const re = new RegExp(`^${str}$`, 'i');
console.log("Regex:", re);
console.log("Matches?", re.test(str));
