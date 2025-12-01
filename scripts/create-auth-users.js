#!/usr/bin/env node
// Script to create Firebase Auth users from Firestore 'users' collection
// Requires a service account JSON. Provide it via SERVICE_ACCOUNT_PATH env var
// or place a file named 'serviceAccountKey.json' in the project root.

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function loadServiceAccount() {
  const envPath = process.env.SERVICE_ACCOUNT_PATH;
  const envJson = process.env.SERVICE_ACCOUNT_KEY;
  if (envJson) {
    try {
      return JSON.parse(envJson);
    } catch (e) {
      console.error('Invalid JSON in SERVICE_ACCOUNT_KEY env var');
      process.exit(1);
    }
  }
  const p = envPath || path.join(process.cwd(), 'serviceAccountKey.json');
  if (!fs.existsSync(p)) {
    console.error('Service account not found. Set SERVICE_ACCOUNT_PATH or create serviceAccountKey.json in project root.');
    process.exit(1);
  }
  return require(p);
}

function generateTempPassword() {
  // 12 char temp password with letters, numbers and symbols
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=';
  let out = '';
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function main() {
  const serviceAccount = loadServiceAccount();
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();
  const auth = admin.auth();

  console.log('Scanning Firestore `users` collection...');
  const snap = await db.collection('users').get();
  const results = [];
  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.authUid) {
      console.log(`Skipping ${doc.id} (${data.email}) — already has authUid.`);
      continue;
    }
    if (!data.email) {
      console.log(`Skipping ${doc.id} — no email.`);
      continue;
    }
    try {
      const tempPass = generateTempPassword();
      const userRecord = await auth.createUser({ email: data.email, password: tempPass, displayName: data.name || undefined });
      // mark mustChangePassword claim
      await auth.setCustomUserClaims(userRecord.uid, { mustChangePassword: true });
      // update Firestore doc with auth mapping (do not save password)
      await db.collection('users').doc(doc.id).update({ authUid: userRecord.uid, authCreatedAt: admin.firestore.FieldValue.serverTimestamp() });
      // generate a password reset link to send to the user (recommended)
      const resetLink = await auth.generatePasswordResetLink(data.email, {url: 'https://your-app-url.example.com'}).catch(() => null);
      console.log(`Created Auth user for ${data.email} -> uid=${userRecord.uid}`);
      if (resetLink) console.log(`Password reset link for ${data.email}:\n  ${resetLink}`);
      results.push({ docId: doc.id, email: data.email, uid: userRecord.uid, resetLink });
    } catch (err) {
      console.error(`Failed to create user for ${data.email}:`, err.message || err);
    }
  }

  fs.writeFileSync(path.join(process.cwd(), 'created-auth-users.json'), JSON.stringify(results, null, 2));
  console.log('Wrote created-auth-users.json with created users and reset links.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
