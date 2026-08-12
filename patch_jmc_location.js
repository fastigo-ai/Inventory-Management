const fs = require('fs');
const filePath = 'frontend/src/app/site-portal/jmc-register/new/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const oldOnChange = 'onChange={e => setFormData({...formData, contractorId: e.target.value})}';
const newOnChange = `onChange={e => {
                    const selectedId = e.target.value;
                    const selectedContractor = contractors.find(c => c._id === selectedId);
                    setFormData(prev => ({
                      ...prev, 
                      contractorId: selectedId,
                      package: selectedContractor?.dynamicData?.package || selectedContractor?.dynamicData?.assignedPackage || selectedContractor?.package || prev.package,
                      circle: selectedContractor?.dynamicData?.circle || selectedContractor?.dynamicData?.assignedCircle || selectedContractor?.circle || selectedContractor?.location || prev.circle
                    }));
                  }}`;

content = content.replace(oldOnChange, newOnChange);
fs.writeFileSync(filePath, content);
