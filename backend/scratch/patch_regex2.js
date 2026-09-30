const fs = require('fs');
let c = fs.readFileSync('backend/src/modules/di/di.controller.ts', 'utf8');

// We want to replace:
// n.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')
// with:
// n.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&') Wait no.
// The actual correct regex inside JS string is:
// n.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&') NO.
// Let's use String.raw to make it extremely clear what we want in the file.

const badString = "n.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')";
const goodString = "n.replace(/[.*+?^${}()|[\\\]\\\\]/g, '\\\\$&')";

if(c.includes(badString)) {
  c = c.replace(badString, goodString);
  fs.writeFileSync('backend/src/modules/di/di.controller.ts', c);
  console.log("Replaced successfully!");
} else {
  console.log("Could not find the exact string.");
}
