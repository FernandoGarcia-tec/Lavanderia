import { NextResponse } from 'next/server';

export const runtime = 'node';

async function initAdmin() {
  // dynamic import to avoid bundling in edge
  const adminMod = await import('firebase-admin');

  if (!adminMod.apps || !adminMod.apps.length) {
    // Try to load service account from env or file path
    const path = process.env.SERVICE_ACCOUNT_PATH || './serviceAccountKey.json';
    try {
      let credential: any = undefined;
      if (process.env.SERVICE_ACCOUNT_KEY) {
        credential = adminMod.credential.cert(JSON.parse(process.env.SERVICE_ACCOUNT_KEY));
      } else {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const key = require(path);
        credential = adminMod.credential.cert(key);
      }

      adminMod.initializeApp({ credential });
    } catch (err) {
      // fallback to default initialization
      try {
        adminMod.initializeApp();
      } catch (e) {
        console.error('Failed to initialize firebase-admin', e);
        throw e;
      }
    }
  }

  return adminMod;
}

async function requireAdmin(adminMod: any, idToken: string) {
  if (!idToken) throw { status: 401, message: 'Missing ID token' };
  try {
    const decoded = await adminMod.auth().verifyIdToken(idToken);
    // Accept either custom claim 'admin' or role === 'admin'
    if (decoded.admin || decoded.role === 'admin') return decoded;
    throw { status: 403, message: 'Forbidden: admin only' };
  } catch (err: any) {
    console.error('verifyIdToken error', err);
    if (err && err.code === 'auth/id-token-expired') throw { status: 401, message: 'Token expired' };
    throw { status: 401, message: 'Invalid token' };
  }
}

export async function POST(req: Request) {
  try {
    const adminMod = await initAdmin();

    // read auth token from Authorization header: Bearer <token>
    const authHeader = req.headers.get('authorization') || '';
    let idToken: string | undefined = undefined;
    if (authHeader.startsWith('Bearer ')) idToken = authHeader.split(' ')[1];

    // also allow token in body for convenience
    if (!idToken) {
      try {
        const body = await req.json();
        idToken = body?.idToken;
      } catch (e) {
        // ignore
      }
    }

    await requireAdmin(adminMod, idToken as string);

    const auth = adminMod.auth();
    const db = adminMod.firestore();

    let nextPageToken: string | undefined = undefined;
    let created = 0;
    const errors: Array<any> = [];

    do {
      const list = await auth.listUsers(1000, nextPageToken);
      for (const userRecord of list.users) {
        try {
          const uid = userRecord.uid;
          const ref = db.collection('users').doc(uid);
          const snap = await ref.get();
          if (!snap.exists) {
            await ref.set({
              authUid: uid,
              email: userRecord.email || null,
              name: userRecord.displayName || null,
              status: 'pendiente',
              role: null,
              createdAt: adminMod.firestore.FieldValue.serverTimestamp(),
            });
            await db.collection('audit_logs').add({
              action: 'migration:create_user_doc',
              uid: userRecord.uid,
              email: userRecord.email || null,
              timestamp: adminMod.firestore.FieldValue.serverTimestamp(),
              message: 'Created missing users/{uid} from Auth migration',
            });
            created++;
          }
        } catch (e) {
          console.error('Error migrating user', userRecord.uid, e);
          errors.push({ uid: userRecord.uid, error: String(e) });
        }
      }
      nextPageToken = list.pageToken as any;
    } while (nextPageToken);

    return NextResponse.json({ success: true, created, errors });
  } catch (err: any) {
    console.error('migrate-auth-users error', err);
    const status = err?.status || 500;
    const message = err?.message || String(err);
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
