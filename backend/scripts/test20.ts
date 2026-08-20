const pkg = "Package 1 (S/N)";
const escaped = pkg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*');
console.log("Escaped:", escaped);
const regex = new RegExp(`^${escaped}$`, 'i');
console.log("Matches with space:", regex.test("Package 1 (S/N)"));
console.log("Matches without space:", regex.test("Package 1(S/N)"));
