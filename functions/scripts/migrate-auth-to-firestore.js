#!/usr/bin/env node
/*
  Script: migrate-auth-to-firestore.js
  Purpose: List all Firebase Auth users and create missing Firestore docs under `users/{uid}`
  Usage: from repo root run: `cd functions; node scripts/migrate-auth-to-firestore.js`
  It expects a service account JSON at the repo root: `serviceAccountKey.json`.
*/

const path = require('path');
const fs = require('fs');

const svcPath = path.join(__dirname, '..', '..', 'serviceAccountKey.json');
if (!fs.existsSync(svcPath)) {
  console.error('serviceAccountKey.json not found at', svcPath);
  process.exit(1);
}

const admin = require('firebase-admin');

try {
  const serviceAccount = require(svcPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} catch (err) {
  console.error('Failed to initialize admin SDK', err);
  process.exit(1);
}

const db = admin.firestore();

async function ensureUsers() {
  console.log('Starting migration: list all auth users and create missing Firestore docs...');
  let nextPageToken = undefined;
  let created = 0;
  let processed = 0;
  try {
    do {
      const list = await admin.auth().listUsers(1000, nextPageToken);
      for (const user of list.users) {
        processed++;
        const uid = user.uid;
        const userRef = db.doc(`users/${uid}`);
        const snap = await userRef.get();
        if (!snap.exists) {
          const docData = {
            name: user.displayName || user.email || 'Sin nombre',
            email: user.email || '',
            status: 'pendiente',
            authUid: uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            authCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
          };
          await userRef.set(docData, { merge: true });
          // write an audit log
          await db.collection('audit_logs').add({
            action: 'migrate_create_user',
            resource: 'users',
            resourceId: uid,
            actorUid: null,
            actorEmail: null,
            before: null,
            after: docData,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log('Created user doc for', uid, user.email);
          created++;
        }
      }
      nextPageToken = list.pageToken;
    } while (nextPageToken);

    console.log(`Migration finished. Processed=${processed} created=${created}`);
    return { processed, created };
  } catch (err) {
    console.error('Migration error', err);
    throw err;
  }
}

ensureUsers().then(() => process.exit(0)).catch(() => process.exit(2));
