#!/usr/bin/env node
// Usage: node scripts/set-user-role.js <UID> <role> [email] [name]
// Example: node scripts/set-user-role.js auqI36TYG6fmxPqVjwbPolaLpmk1 personal user@example.com "Juan Perez"

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

function loadServiceAccount() {
  const envPath = process.env.SERVICE_ACCOUNT_PATH || path.join(process.cwd(), 'serviceAccountKey.json');
  if (!fs.existsSync(envPath)) {
    console.error('serviceAccountKey.json not found at', envPath);
    process.exit(1);
  }
  return require(envPath);
}

async function main() {
  const [,, uid, role = 'client', email, ...nameParts] = process.argv;
  const name = nameParts.join(' ') || '';
  if (!uid) {
    console.error('UID required. Usage: node scripts/set-user-role.js <UID> <role> [email] [name]');
    process.exit(1);
  }
  const sa = loadServiceAccount();
  admin.initializeApp({ credential: admin.credential.cert(sa) });
  const db = admin.firestore();

  const docRef = db.collection('users').doc(uid);
  const payload = { role, status: 'aprobado', authUid: uid };
  if (email) payload.email = email;
  if (name) payload.name = name;
  payload.authCreatedAt = admin.firestore.FieldValue.serverTimestamp();
  payload.createdAt = admin.firestore.FieldValue.serverTimestamp();

  await docRef.set(payload, { merge: true });
  console.log(`Updated users/${uid} -> role=${role}`);
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
