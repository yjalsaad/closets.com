/* Sets a new password for the YAS Bloom gate: node scripts/bloom-password.js "<new password>"
 * Rewrites the salt and hash in src/showroom3d/BloomGate.jsx. The password itself is never stored. Rebuild and deploy after. */
const crypto = require('crypto'); const fs = require('fs'); const path = require('path');
const pw = String(process.argv[2] || '').trim();
if (pw.length < 10) { console.error('Give a password of at least 10 characters, in quotes.'); process.exit(1); }
const file = path.join(__dirname, '..', 'src', 'showroom3d', 'BloomGate.jsx');
const salt = crypto.randomBytes(16).toString('hex'); const rounds = 210000;
const hash = crypto.pbkdf2Sync(pw, Buffer.from(salt, 'hex'), rounds, 32, 'sha256').toString('hex');
const src = fs.readFileSync(file, 'utf8');
const next = src.replace(/export const GATE = \{[^}]*\};/, `export const GATE = { salt: '${salt}', hash: '${hash}', rounds: ${rounds} };`);
if (next === src) { console.error('GATE line not found in BloomGate.jsx'); process.exit(1); }
fs.writeFileSync(file, next); console.log('YAS Bloom password changed. Everyone who was let in must enter the new one. Rebuild and deploy.');
