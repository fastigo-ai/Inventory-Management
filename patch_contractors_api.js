const fs = require('fs');
const filePath = 'frontend/src/features/contractors/api/contractors.api.ts';
let content = fs.readFileSync(filePath, 'utf8');

const oldGetContractors = `export const getContractors = async (location?: string) => {
  const url = location ? \`/contractors?location=\${encodeURIComponent(location)}\` : '/contractors';
  const response = await api.get(url);
  return response.data;
};`;

const newGetContractors = `export const getContractors = async (location?: string, search?: string) => {
  let url = '/contractors?';
  if (location) url += \`location=\${encodeURIComponent(location)}&\`;
  if (search) url += \`search=\${encodeURIComponent(search)}&\`;
  const response = await api.get(url);
  return response.data;
};`;

content = content.replace(oldGetContractors, newGetContractors);
fs.writeFileSync(filePath, content);
