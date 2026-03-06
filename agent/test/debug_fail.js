const { fastClassify } = require('../src/services/fast-classifier');
const input = "can you please turn down the sound";
const result = fastClassify(input);
console.log('Input:', input);
console.log('Result:', JSON.stringify(result, null, 2));
if (result) {
  console.log('Matched Intent:', result.intent);
} else {
  console.log('Result is null');
}