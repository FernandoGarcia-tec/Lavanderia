'use client';
import { initializeFirebase } from '.';
import { FirebaseProvider } from './provider';
import { ReactNode } from 'react';

export const FirebaseClientProvider = ({ children }: { children: ReactNode }) => {
  const firebaseContext = initializeFirebase();
  return <FirebaseProvider value={firebaseContext}>{children}</FirebaseProvider>;
};
