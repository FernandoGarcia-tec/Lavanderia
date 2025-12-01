import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

import { useFirebase } from './provider';
import { useFirebaseApp } from './provider';
import { useFirestore } from './provider';
import { useAuth } from './provider';
import { FirebaseProvider } from './provider';
import { FirebaseClientProvider } from './client-provider';

import { useUser } from './auth/use-user';

import { useCollection } from './firestore/use-collection';
import { useDoc } from './firestore/use-doc';

let firebaseApp: FirebaseApp;
let auth: Auth;
let firestore: Firestore;

function initializeFirebase() {
  if (getApps().length === 0) {
    firebaseApp = initializeApp(firebaseConfig);
  } else {
    // if an app already exists, reuse it
    firebaseApp = getApps()[0] as FirebaseApp;
  }

  // Ensure auth and firestore are always obtained from the app
  auth = getAuth(firebaseApp);
  firestore = getFirestore(firebaseApp);

  return { firebaseApp, auth, firestore };
}

export {
  initializeFirebase,
  FirebaseProvider,
  FirebaseClientProvider,
  useCollection,
  useDoc,
  useUser,
  useFirebase,
  useFirebaseApp,
  useFirestore,
  useAuth,
};
