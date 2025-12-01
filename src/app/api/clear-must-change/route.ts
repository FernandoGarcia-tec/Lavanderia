export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
// Load firebase-admin dynamically at runtime to avoid bundler issues
let admin: any;
function loadAdmin() {
  if (admin) return admin;
  try {
    // @ts-ignore
    admin = require('firebase-admin');
  } catch (e) {
    // fallback (should not happen in Node)
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
  const adminMod = loadAdmin();
  if (adminMod && adminMod.apps && adminMod.apps.length) return;
  if (envJson) {
    try {
      const credentialObj = JSON.parse(envJson);
      adminMod.initializeApp({ credential: adminMod.credential.cert(credentialObj) });
      return;
    } catch (e) {
      console.error('Invalid SERVICE_ACCOUNT_KEY JSON');
      throw e;
    }
  }
  const p = path.isAbsolute(envPath) ? envPath : path.join(process.cwd(), envPath);
  if (!fs.existsSync(p)) {
    throw new Error(`Service account file not found at ${p}. Set SERVICE_ACCOUNT_PATH or SERVICE_ACCOUNT_KEY.`);
  }
  const raw = fs.readFileSync(p, 'utf8');
  const sa = JSON.parse(raw);
  adminMod.initializeApp({ credential: adminMod.credential.cert(sa) });
}

export async function POST(req: Request) {
  try {
    initAdmin();
    const body = await req.json();
    const uid = body?.uid;
    if (!uid) return NextResponse.json({ error: 'uid is required' }, { status: 400 });
    await admin.auth().setCustomUserClaims(uid, { mustChangePassword: false });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    const serialized: any = { message: err?.message || String(err), code: err?.code || null, stack: err?.stack || null };
    try { Object.getOwnPropertyNames(err || {}).forEach((k) => { if (!(k in serialized)) serialized[k] = (err as any)[k]; }); } catch (e) {}
    console.error('clear-must-change error', serialized);
    return NextResponse.json({ error: serialized.message, code: serialized.code, details: serialized }, { status: 500 });
  }
}
