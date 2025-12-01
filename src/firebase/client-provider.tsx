'use client';
import { ReactNode } from 'react';
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';
import { FirebaseProvider } from './provider';

function initializeFirebaseClient(): { firebaseApp: FirebaseApp; auth: Auth; firestore: Firestore } {
  let firebaseApp: FirebaseApp;
  if (getApps().length === 0) {
    firebaseApp = initializeApp(firebaseConfig);
  } else {
    // reuse existing app
    firebaseApp = getApps()[0] as FirebaseApp;
  }
  const auth = getAuth(firebaseApp);
  const firestore = getFirestore(firebaseApp);
  return { firebaseApp, auth, firestore };
}

export const FirebaseClientProvider = ({ children }: { children: ReactNode }) => {
  const firebaseContext = initializeFirebaseClient();
  return <FirebaseProvider value={firebaseContext}>{children}</FirebaseProvider>;
};
