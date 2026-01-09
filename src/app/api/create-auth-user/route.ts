console.log('TEST_VAR:', process.env.TEST_VAR);
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
  console.log('initAdmin: SERVICE_ACCOUNT_KEY present=', !!envJson);
  console.log('SERVICE_ACCOUNT_KEY length:', envJson ? envJson.length : 'undefined');
  const adminMod = loadAdmin();
  console.log('initAdmin: loaded adminMod, adminMod.apps?.length=', adminMod?.apps?.length);
  if (adminMod && adminMod.apps && adminMod.apps.length) return;
  if (!envJson) {
    throw new Error('SERVICE_ACCOUNT_KEY environment variable not set. Please configure it in Vercel.');
  }
  const credentialObj = JSON.parse(envJson);
  adminMod.initializeApp({ credential: adminMod.credential.cert(credentialObj) });
}

export async function POST(req: Request) {
  try {
    initAdmin();
    const body = await req.json();
    const { name, email, phone, role, defaultPassword } = body || {};

    if (!email && !phone) {
      return NextResponse.json({ error: 'Se requiere al menos correo o teléfono.' }, { status: 400 });
    }

    const adminMod = loadAdmin();
    const auth = adminMod.auth();
    const db = adminMod.firestore();

    // Crear usuario según el campo disponible
    let userRecord;
    try {
      let finalEmail = email;
      let cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '';
      if (!finalEmail && phone) {
        // Genera un email ficticio único para el teléfono
        finalEmail = `${cleanPhone}@lavanderia.angy`;
      }

      // Luego usa finalEmail en vez de email en la creación:
      userRecord = await auth.createUser({
        email: finalEmail,
        password: defaultPassword || 'Cambio123!',
        displayName: name || undefined,
        ...(phone ? { phoneNumber: '+' + (cleanPhone.startsWith('52') ? cleanPhone : '52' + cleanPhone) } : {}),
      });
    } catch (err: any) {
      // Si el usuario ya existe, intenta obtenerlo
      if (email && err.code === 'auth/email-already-exists') {
        userRecord = await auth.getUserByEmail(email);
      } else if (phone && err.code === 'auth/phone-number-already-exists') {
        let phoneNumber = phone.replace(/[^0-9]/g, '');
        if (!phoneNumber.startsWith('52')) phoneNumber = '52' + phoneNumber;
        phoneNumber = '+' + phoneNumber;
        userRecord = await auth.getUserByPhoneNumber(phoneNumber);
      } else {
        throw err;
      }
    }

    // set claim to force password change
    await auth.setCustomUserClaims(userRecord.uid, { mustChangePassword: true });

    // Create or update Firestore user doc using the exact Auth UID as document ID
    const userDocRef = db.collection('users').doc(userRecord.uid);
    const now = admin.firestore.FieldValue.serverTimestamp();
    await userDocRef.set({
      name: name || '',
      email: email || null,
      phone: phone || null,
      role: role || 'client',
      status: 'aprobado',
      authUid: userRecord.uid,
      createdAt: now,
      authCreatedAt: now,
    }, { merge: true });
    const docRef = userDocRef;

    // generate password reset link to send to user (solo si hay email)
    let resetLink = null;
    if (email) {
      try {
        resetLink = await auth.generatePasswordResetLink(email, { url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002' });
      } catch (e) {
        // ignore
      }
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
