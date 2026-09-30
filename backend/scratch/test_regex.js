const n = 'GI STAY WIRE (7/3.15 MM)';
try {
  const regex = new RegExp(`^${n.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}$`, 'i');
  console.log('Regex built successfully:', regex);
} catch (e) {
  console.error('Error building regex:', e);
}
