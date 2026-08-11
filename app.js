const fs = require('fs');
const os = require('os');
console.log(os.platform());
console.log(`V8 version: ${process.versions.v8}`);
const v8 = require('v8');
const heapStats = v8.getHeapStatistics();

console.log('Heap size limit:', (heapStats.heap_size_limit / 1024 / 1024).toFixed(2), 'MB');
console.log('Total heap size:', (heapStats.total_heap_size / 1024 / 1024).toFixed(2), 'MB');
console.log('Used heap size:', (heapStats.used_heap_size / 1024 / 1024).toFixed(2), 'MB');

console.log('Before file read');
fs.readFile('myfile.txt', 'utf8', (err, data) => {
  if (err) throw err;
  console.log('File contents:', data);
});
console.log('After file read');
