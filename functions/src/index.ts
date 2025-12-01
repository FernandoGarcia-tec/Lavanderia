import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Inicializa admin una sola vez
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Función que se ejecuta cuando se crea un usuario en Auth
export const createUserOnAuth = functions
  .region('us-central1')
  .auth.user()
  .onCreate(async (user) => {
    const uid = user.uid;
    const docRef = db.collection('users').doc(uid);

    try {
      const doc = await docRef.get();

      if (doc.exists) {
        console.log(`users/${uid} already exists — updating fields`);
        await docRef.update({
          email: user.email || null,
          name: user.displayName || null,
          authUid: uid,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        await db.collection('audit_logs').add({
          action: 'onCreateAuthUser:update',
          uid,
          email: user.email || null,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          message: 'Updated existing users doc on auth onCreate',
        });
      } else {
        await docRef.set({
          authUid: uid,
          email: user.email || null,
          name: user.displayName || null,
          status: 'pendiente',
          role: null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        await db.collection('audit_logs').add({
          action: 'onCreateAuthUser:create',
          uid,
          email: user.email || null,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          message: 'Created users doc with status pendiente',
        });

        console.log(`Created users/${uid} with status 'pendiente'`);
      }
    } catch (error) {
      console.error('Error in createUserOnAuth:', error);
      // Re-throw para que Firebase registre el fallo
      throw error;
    }
  });
