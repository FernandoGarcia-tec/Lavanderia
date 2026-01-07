export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
// Load firebase-admin dynamically at runtime to avoid bundler issues
let admin: any;
function loadAdmin() {
  if (admin) return admin;
  try {
    // Prefer CJS require in Node runtime
    // @ts-ignore
    admin = require('firebase-admin');
  } catch (e) {
    // Fallback to dynamic import
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    admin = require('firebase-admin');
  }
  return admin;
}
import fs from 'fs';
import path from 'path';

function initAdmin() {
  const envJson = process.env.SERVICE_ACCOUNT_KEY;
  const envPath = process.env.SERVICE_ACCOUNT_PATH || './serviceAccountKey.json';
  console.log('initAdmin: SERVICE_ACCOUNT_PATH=', envPath, 'SERVICE_ACCOUNT_KEY present=', !!envJson);
  console.log('SERVICE_ACCOUNT_KEY length:', envJson ? envJson.length : 'undefined');
  console.log('SERVICE_ACCOUNT_KEY length:', process.env.SERVICE_ACCOUNT_KEY?.length);
  const adminMod = loadAdmin();
  console.log('initAdmin: loaded adminMod, adminMod.apps?.length=', adminMod?.apps?.length);
  if (adminMod && adminMod.apps && adminMod.apps.length) return;
  if (envJson) {
    const credentialObj = JSON.parse(envJson);
    adminMod.initializeApp({ credential: adminMod.credential.cert(credentialObj) });
  } else {
    const p = path.isAbsolute(envPath) ? envPath : path.join(process.cwd(), envPath);
    if (!fs.existsSync(p)) {
      throw new Error(`Service account file not found at ${p}. Set SERVICE_ACCOUNT_PATH or SERVICE_ACCOUNT_KEY.`);
    }
    const raw = fs.readFileSync(p, 'utf8');
    const sa = JSON.parse(raw);
    adminMod.initializeApp({ credential: adminMod.credential.cert(sa) });
    console.log('initAdmin: adminMod.apps after initialize=', adminMod.apps?.length);
  }
}

export async function POST(req: Request) {
  try {
    initAdmin();
    const body = await req.json();
    const { name, email, role, defaultPassword } = body || {};
    if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 });

    const adminMod = loadAdmin();
    console.log('POST: adminMod loaded, apps length=', adminMod?.apps?.length);
    const auth = adminMod.auth();
    const db = adminMod.firestore();

    // create auth user
    let userRecord;
    try {
      userRecord = await auth.createUser({ email, password: defaultPassword || 'Cambio123!', displayName: name || undefined });
    } catch (err: any) {
      // If user already exists, try to fetch it
      if (err.code === 'auth/email-already-exists') {
        userRecord = await auth.getUserByEmail(email);
      } else {
        throw err;
      }
    }

    // set claim to force password change
    await auth.setCustomUserClaims(userRecord.uid, { mustChangePassword: true });

    // Create or update Firestore user doc using the exact Auth UID as document ID
    const userDocRef = db.collection('users').doc(userRecord.uid);
    const now = admin.firestore.FieldValue.serverTimestamp();
    // Use set with merge to create or update the doc at users/{uid}
    await userDocRef.set({
      name: name || '',
      email,
      role: role || 'client',
      status: 'aprobado',
      authUid: userRecord.uid,
      createdAt: now,
      authCreatedAt: now,
    }, { merge: true });
    const docRef = userDocRef;

    // generate password reset link to send to user (recommended)
    let resetLink = null;
    try {
      resetLink = await auth.generatePasswordResetLink(email, { url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002' });
    } catch (e) {
      // ignore
    }

    return NextResponse.json({ ok: true, uid: userRecord.uid, docId: docRef.id, resetLink });
  } catch (err: any) {
    // Serialize error safely
    const serialized: any = {
      message: err?.message || String(err),
      code: err?.code || null,
      stack: err?.stack || null,
    };
    try {
      // copy enumerable + non-enumerable properties
      Object.getOwnPropertyNames(err || {}).forEach((k) => {
        if (!(k in serialized)) serialized[k] = (err as any)[k];
      });
    } catch (e) {
      // ignore
    }
    console.error('create-auth-user error', serialized);
    return NextResponse.json({ error: serialized.message, code: serialized.code, details: serialized }, { status: 500 });
  }
}
