const fs = require('fs');
const files = [
  '/Users/Apple/Desktop/Inventory-Management/frontend/src/app/site-portal/jmc-register/new/page.tsx',
  '/Users/Apple/Desktop/Inventory-Management/frontend/src/app/site-portal/wip-required/new/page.tsx',
  '/Users/Apple/Desktop/Inventory-Management/frontend/src/app/site-portal/wip-register/new/page.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  const useEffectBlock = `
  useEffect(() => {
    if (user && isNew) {
      setFormData(prev => ({
        ...prev,
        package: prev.package || user.assignedPackage || "",
        circle: prev.circle || user.assignedCircle || ""
      }));
    }
  }, [user, isNew]);

  useEffect(() => {
    if (formData.package && formData.circle) {`;

  content = content.replace(/  useEffect\(\(\) => \{\n    if \(formData\.package && formData\.circle\) \{/, useEffectBlock);
  fs.writeFileSync(file, content);
}
console.log("Added user syncing to formData in all 3 files.");
