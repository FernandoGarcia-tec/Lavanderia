'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase/provider';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[]; // Roles permitidos: 'admin', 'personal', 'client'
  redirectTo?: string; // A dónde redirigir si no está autenticado
}

export function AuthGuard({ 
  children, 
  allowedRoles, 
  redirectTo = '/' 
}: AuthGuardProps) {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // No hay usuario autenticado
        router.replace(redirectTo);
        return;
      }

      // Si no se requieren roles específicos, solo verificar autenticación
      if (!allowedRoles || allowedRoles.length === 0) {
        setIsAuthorized(true);
        setIsLoading(false);
        return;
      }

      // Verificar rol del usuario en Firestore
      try {
        const q = query(
          collection(firestore, 'users'),
          where('authUid', '==', user.uid)
        );
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          const userData = snap.docs[0].data();
          const userRole = userData.role || 'client';
          
          if (allowedRoles.includes(userRole)) {
            setIsAuthorized(true);
            setIsLoading(false);
          } else {
            // Usuario autenticado pero sin permiso para esta sección
            console.warn(`Acceso denegado: rol "${userRole}" no permitido`);
            
            // Redirigir según su rol
            if (userRole === 'admin') {
              router.replace('/admin');
            } else if (userRole === 'personal') {
              router.replace('/staff');
            } else {
              router.replace('/client');
            }
          }
        } else {
          // Usuario no encontrado en Firestore, redirigir al login
          router.replace(redirectTo);
        }
      } catch (error) {
        console.error('Error verificando rol:', error);
        router.replace(redirectTo);
      }
    });

    return () => unsubscribe();
  }, [auth, firestore, router, allowedRoles, redirectTo]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 to-blue-100">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-cyan-200"></div>
            <div className="absolute inset-0 rounded-full border-4 border-cyan-600 border-t-transparent animate-spin"></div>
          </div>
          <p className="text-cyan-700 font-medium">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
