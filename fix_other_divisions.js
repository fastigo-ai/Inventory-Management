const fs = require('fs');

const fixIncomingWO = (path) => {
  let code = fs.readFileSync(path, 'utf8');
  const oldDiv = `  const getDivisions = (circle: string) => {
    switch (circle?.toLowerCase()) {
      case 'nahan':
        return ['Nahan', 'Rajgarh', 'Poanta'];
      case 'solan':
        return ['Solan', 'Baddhi', 'Parwahoo', 'Arki'];
      default:
        return [];
    }
  };`;
  const newDiv = `  const getDivisions = (circle: string) => {
    switch (circle?.toLowerCase()) {
      case 'nahan':
        return ['Nahan', 'Rajgarh', 'Poanta'];
      case 'solan':
        return ['Solan', 'Baddhi', 'Parwahoo', 'Arki'];
      case 'rohru':
        return ['Rohru', 'Jubbal'];
      default:
        return [];
    }
  };`;
  code = code.replace(oldDiv, newDiv);
  fs.writeFileSync(path, code);
};

const fixOutward = (path) => {
  let code = fs.readFileSync(path, 'utf8');
  const oldDiv = `  const getDivisions = (circle: string) => {
    switch (circle?.toLowerCase()) {
      case 'nahan': return ['Rajgarh', 'Poanta'];
      case 'solan': return ['Kumarhatti', 'Nalagarh'];
      default: return [];
    }
  };`;
  const newDiv = `  const getDivisions = (circle: string) => {
    switch (circle?.toLowerCase()) {
      case 'nahan': return ['Rajgarh', 'Poanta'];
      case 'solan': return ['Kumarhatti', 'Nalagarh'];
      case 'rohru': return ['Rohru', 'Jubbal'];
      default: return [];
    }
  };`;
  code = code.replace(oldDiv, newDiv);
  fs.writeFileSync(path, code);
};

fixIncomingWO('frontend/src/app/site-portal/incoming-work-orders/page.tsx');
fixOutward('frontend/src/app/store/outward-register/new/page.tsx');
console.log('Fixed all instances of getDivisions');
