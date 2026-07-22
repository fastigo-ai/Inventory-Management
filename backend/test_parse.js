const str = '[{"stage":"1st stage"}]';
try {
  JSON.parse(str);
  console.log('SUCCESS');
} catch (e) {
  console.log('FAILED:', e);
}
