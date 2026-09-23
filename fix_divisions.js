const fs = require('fs');

const fixFile = (path) => {
  let code = fs.readFileSync(path, 'utf8');
  
  const oldDiv = `  const getDivisions = (circle: string) => {
    switch (circle?.toLowerCase()) {
      case 'nahan':
        return ['Nahan', 'Rajgarh', 'Poanta'];
      case 'solan':
        return ['Solan', 'Nalagarh', 'Kumarhatti', 'Baddhi', 'Parwahoo', 'Arki'];
      default:
        return [];
    }
  };`;

  const newDiv = `  const getDivisions = (circle: string) => {
    switch (circle?.toLowerCase()) {
      case 'nahan':
        return ['Nahan', 'Rajgarh', 'Poanta'];
      case 'solan':
        return ['Solan', 'Nalagarh', 'Kumarhatti', 'Baddhi', 'Parwahoo', 'Arki'];
      case 'rohru':
        return ['Rohru', 'Jubbal'];
      default:
        return [];
    }
  };`;

  code = code.replace(oldDiv, newDiv);
  fs.writeFileSync(path, code);
  console.log('Fixed', path);
};

fixFile('frontend/src/app/ho-billing/contractor-work-orders/new/page.tsx');
fixFile('frontend/src/app/ho-billing/contractor-work-orders/[id]/edit/page.tsx');
