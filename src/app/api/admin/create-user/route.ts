export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

type Body = {
  email: string;
  name: string;
  role?: string;
  password?: string;
};

export async function POST(req: Request) {
  try {
    const body: Body = await req.json();
    const { email, name, role = 'client', password } = body;

    // load firebase-admin dynamically to avoid bundling issues
    const admin = await import('firebase-admin');

    if (!admin.apps || admin.apps.length === 0) {
      const keyPath = process.env.SERVICE_ACCOUNT_PATH || path.join(process.cwd(), 'serviceAccountKey.json');
      if (!fs.existsSync(keyPath)) {
        throw new Error(`service account key not found at ${keyPath}. Set SERVICE_ACCOUNT_PATH env var or place serviceAccountKey.json in project root.`);
      }
      const raw = fs.readFileSync(keyPath, 'utf8');
      const serviceAccount = JSON.parse(raw);
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }

    // Create user in Auth
    const created = await admin.auth().createUser({
      email,
      password: password || Math.random().toString(36).slice(-8),
      displayName: name,
      emailVerified: false,
    });

    // Set custom claim so user must change password on first login
    await admin.auth().setCustomUserClaims(created.uid, { mustChangePassword: true });

    // Create / update user doc in Firestore
    const db = admin.firestore();
    await db.collection('users').doc(created.uid).set(
      {
        name,
        email,
        role,
        status: 'activo',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Generate password reset link so admin can send it
    const resetLink = await admin.auth().generatePasswordResetLink(email);

    return NextResponse.json({ ok: true, uid: created.uid, resetLink });
  } catch (err: any) {
    console.error('create-user error', err);
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
