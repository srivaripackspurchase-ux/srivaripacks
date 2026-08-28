const bcrypt = require('bcryptjs');
const passwordToHash = process.argv[2];
if (!passwordToHash) {
  console.log('Error: Please provide a password argument.');
  console.log('Usage: node hash_pw.js <your_password>');
  process.exit(1);
}
const hash = bcrypt.hashSync(passwordToHash, 10);
console.log('------------------------------------------------');
console.log('Bcrypt Password Hash:');
console.log(hash);
console.log('------------------------------------------------');
