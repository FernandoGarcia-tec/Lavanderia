'use client';
import { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  Query,
  DocumentData,
  query,
  where,
  getDocs,
} from 'firebase/firestore';

import { useFirestore } from '@/firebase/provider';

interface UseCollectionOptions {
  query?: [string, '==', any];
}

export function useCollection<T>(path: string, options?: UseCollectionOptions) {
  const firestore = useFirestore();
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const collectionRef = collection(firestore, path);
    let q: Query<DocumentData> = collectionRef;

    if (options?.query) {
      q = query(collectionRef, where(...options.query));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as T[];
        setData(docs);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, path, options?.query]);

  return { data, loading, error };
}
