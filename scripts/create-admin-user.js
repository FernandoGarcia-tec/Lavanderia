// create-admin-user.js
// Script para crear un usuario admin en Firebase Auth y Firestore

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function loadServiceAccount() {
  const envPath = process.env.SERVICE_ACCOUNT_PATH || path.join(process.cwd(), 'serviceAccountKey.json');
  if (!fs.existsSync(envPath)) {
    console.error('serviceAccountKey.json not found at', envPath);
    process.exit(1);
  }
  return require(envPath);
}

async function main() {
  const email = process.argv[2] || 'admin@lavanderia.com';
  const password = process.argv[3] || 'Admin1234!';
  const name = process.argv[4] || 'Admin General';
  const phone = process.argv[5] || '';

  const sa = loadServiceAccount();
  admin.initializeApp({ credential: admin.credential.cert(sa) });
  try {
    // Crear usuario en Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
      phoneNumber: phone ? '+52' + phone : undefined,
    });
    const uid = userRecord.uid;
    // Crear/actualizar documento en Firestore
    const db = admin.firestore();
    await db.collection('users').doc(uid).set({
      email,
      name,
      role: 'admin',
      status: 'aprobado',
      authUid: uid,
      authCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log('Usuario admin creado:', email, 'UID:', uid);
    process.exit(0);
  } catch (err) {
    console.error('Error creando usuario admin:', err.message);
    process.exit(1);
  }
}

main();
