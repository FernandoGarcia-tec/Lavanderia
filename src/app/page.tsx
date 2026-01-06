"use client";

import { useState } from 'react';
import Link from "next/link";
import { AppLogo } from "@/components/app-logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, useFirestore } from '@/firebase/provider';
import { signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  getDocFromServer, 
  setDoc, 
  serverTimestamp, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Loader2, KeyRound } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [identifier, setIdentifier] = useState(''); 
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados para el Modal de Recuperación
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Función de Login
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let emailToUse = identifier.trim();

      // 1. DETECCIÓN: ¿Es un teléfono?
      const cleanIdentifier = emailToUse.replace(/[\s-]/g, '');
      const isPhone = !emailToUse.includes('@') && /^\d+$/.test(cleanIdentifier) && cleanIdentifier.length >= 7;

      if (isPhone) {
        console.log(`Buscando correo para el teléfono: ${emailToUse}`);
        const usersRef = collection(firestore, 'users');
        const q = query(usersRef, where('phone', '==', emailToUse));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          if (userData.email) {
            emailToUse = userData.email;
          } else {
            throw new Error("Este número de teléfono no tiene un correo electrónico asociado para iniciar sesión.");
          }
        } else {
          throw new Error("No encontramos una cuenta con ese número de teléfono. Intenta con tu correo.");
        }
      }

      // 2. Autenticación
      const cred = await signInWithEmailAndPassword(auth, emailToUse, password);
      const uid = cred.user.uid;
      const userEmail = cred.user.email;
      
      try {
        const idTokenResult = await cred.user.getIdTokenResult();
        if (idTokenResult?.claims?.mustChangePassword) {
          router.push('/change-password');
          setLoading(false);
          return;
        }
      } catch (claimErr) { 
        console.warn('Failed to read token claims', claimErr);
      }
      
      // 3. Buscar documento y Rol
      let userDocSnapshot;
      let userData = null;
      let docRef = doc(firestore, 'users', uid);

      try {
        userDocSnapshot = await getDocFromServer(docRef);
      } catch (err) {
        userDocSnapshot = await getDoc(docRef);
      }

      if (userDocSnapshot.exists()) {
        userData = userDocSnapshot.data();
      } else {
        const usersRef = collection(firestore, 'users');
        const q = query(usersRef, where('email', '==', userEmail));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const foundDoc = querySnapshot.docs[0];
          userData = foundDoc.data();
          docRef = foundDoc.ref;
        }
      }

      // 4. Autoreparación / Creación
      if (!userData) {
        const newUser = {
            email: userEmail,
            name: cred.user.displayName || userEmail?.split('@')[0],
            role: 'client',
            status: 'aprobado',
            createdAt: serverTimestamp(),
            authUid: uid,
            ...(isPhone ? { phone: identifier } : {}) 
        };
        await setDoc(doc(firestore, 'users', uid), newUser);
        userData = newUser;
      }

      // 5. Validaciones
      if (userData && userData.status === 'pendiente') {
        await signOut(auth);
        setError('La cuenta está pendiente. Espera a que el administrador la autorice.');
        setLoading(false);
        return;
      }

      const role = userData?.role;

      if (!role) {
        await setDoc(docRef, { role: 'client' }, { merge: true });
        router.push('/client');
        return;
      }

      // 6. Redirección
      if (role === 'admin') {
        router.push('/admin');
      } else if (role === 'personal') {
        router.push('/staff');
      } else if (role === 'client') {
        router.push('/client');
      } else {
        await signOut(auth);
        setError('Rol desconocido o no autorizado.');
        setLoading(false);
      }

    } catch (err: any) {
      console.error('Login error', err);
      if (err.message && err.message.includes("número de teléfono")) {
         setError(err.message);
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Datos incorrectos. Verifica tu correo/teléfono y contraseña.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Demasiados intentos fallidos. Intenta más tarde.');
      } else {
        setError(err.message || 'Error al iniciar sesión. Inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  }

  // Función de Recuperación de Contraseña
  async function handlePasswordReset() {
    if (!resetEmail) {
        toast({ title: 'Campo vacío', description: 'Por favor ingresa tu correo electrónico.', variant: 'destructive' });
        return;
    }
    setResetLoading(true);
    try {
        await sendPasswordResetEmail(auth, resetEmail);
        toast({ title: 'Correo enviado', description: `Se ha enviado un enlace a ${resetEmail}` });
        setIsResetOpen(false);
        setResetEmail('');
    } catch (error: any) {
        console.error(error);
        if (error.code === 'auth/user-not-found') {
            toast({ title: 'Error', description: 'No existe una cuenta con este correo.', variant: 'destructive' });
        } else {
            toast({ title: 'Error', description: 'No se pudo enviar el correo.', variant: 'destructive' });
        }
    } finally {
        setResetLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 relative font-sans flex items-center justify-center p-4 overflow-hidden">
      
      {/* FONDO */}
      <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-br from-cyan-500 via-sky-500 to-blue-600 rounded-b-[50px] shadow-lg overflow-hidden z-0">
        <div className="absolute top-10 left-10 w-24 h-24 bg-white/10 rounded-full blur-xl animate-pulse" />
        <div className="absolute top-20 right-20 w-32 h-32 bg-cyan-200/20 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 left-1/3 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
      </div>

      {/* CONTENIDO */}
      <div className="relative z-10 w-full max-w-md animate-in zoom-in-95 duration-500">
        <div className="mb-8 flex justify-center animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner ring-4 ring-white/10">
             <AppLogo />
          </div>
        </div>

        <Card className="w-full shadow-2xl border-0 rounded-3xl overflow-hidden bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center bg-slate-50/50 pb-4">
            <CardTitle className="font-headline text-2xl text-cyan-900">Lavanderia y planchaduría "ANGY"</CardTitle>
            <CardDescription>
              Introduce tus datos para acceder a tu cuenta.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="identifier" className="text-slate-600">Correo o Teléfono</Label>
                <Input
                  id="identifier"
                  type="text" 
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="ejemplo@correo.com o 5512345678"
                  required
                  className="h-12 border-slate-200 focus-visible:ring-cyan-500 rounded-xl text-base"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-slate-600">Contraseña</Label>
                  <button
                    type="button"
                    onClick={() => {
                        // Pre-llenar el email si el usuario ya escribió algo que parece un correo
                        if (identifier.includes('@')) setResetEmail(identifier);
                        setIsResetOpen(true);
                    }}
                    className="text-sm font-medium text-cyan-600 hover:underline hover:text-cyan-700"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
                    required
                    className="h-12 border-slate-200 focus-visible:ring-cyan-500 rounded-xl pr-10 text-base"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-transparent"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5 text-slate-400" /> : <Eye className="h-5 w-5 text-slate-400" />}
                  </Button>
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl shadow-md shadow-cyan-200 transition-all hover:scale-[1.02] text-base font-semibold"
                disabled={loading}
              >
                {loading ? (
                    <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Verificando...
                    </div>
                ) : 'Iniciar Sesión'}
              </Button>
              {error && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-100 rounded-xl text-center animate-in fade-in slide-in-from-top-1">
                    <p className="text-sm text-red-600 font-medium">{error}</p>
                  </div>
              )}
            </form>
            
            <div className="mt-6 text-center text-sm text-muted-foreground">
              ¿No tienes una cuenta?{" "}
              <Link href="/register" className="font-medium text-cyan-600 hover:underline">
                Regístrate
              </Link>
            </div>
          </CardContent>

            {/* 
            <CardFooter className="flex flex-col gap-4 bg-slate-50/30 pt-6">
            <div className="relative w-full">
              <Separator className="bg-slate-200" />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-muted-foreground font-medium rounded-full border border-slate-100">
              PROTOTIPO
              </span>
            </div>
            <p className="text-center text-xs text-slate-400">
              Para fines de demostración, puedes entrar directamente:
            </p>
            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3">
              <Button variant="outline" asChild className="rounded-xl border-slate-200 hover:bg-cyan-50 hover:text-cyan-700 hover:border-cyan-200 transition-colors">
              <Link href="/client">Cliente</Link>
              </Button>
              <Button variant="outline" asChild className="rounded-xl border-slate-200 hover:bg-cyan-50 hover:text-cyan-700 hover:border-cyan-200 transition-colors">
              <Link href="/staff">Personal</Link>
              </Button>
              <Button variant="outline" asChild className="rounded-xl border-slate-200 hover:bg-cyan-50 hover:text-cyan-700 hover:border-cyan-200 transition-colors">
              <Link href="/admin">Admin</Link>
              </Button>
            </div>
            </CardFooter>
            */}
        </Card>
      </div>

      {/* --- MODAL RECUPERAR CONTRASEÑA --- */}
      <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
            <DialogHeader>
                <div className="mx-auto w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center mb-2 text-cyan-600">
                    <KeyRound className="h-6 w-6" />
                </div>
                <DialogTitle className="text-center text-xl text-slate-800">Recuperar Contraseña</DialogTitle>
                <DialogDescription className="text-center">
                    Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu acceso.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Label htmlFor="resetEmail" className="text-slate-600 mb-2 block">Correo Electrónico</Label>
                <Input 
                    id="resetEmail" 
                    type="email" 
                    placeholder="ejemplo@correo.com" 
                    className="h-12 rounded-xl"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                />
            </div>
            <DialogFooter className="sm:justify-center gap-2">
                <Button variant="ghost" onClick={() => setIsResetOpen(false)} className="rounded-xl px-6">Cancelar</Button>
                <Button 
                    onClick={handlePasswordReset} 
                    disabled={resetLoading} 
                    className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl px-8 shadow-md shadow-cyan-200"
                >
                    {resetLoading ? 'Enviando...' : 'Enviar Enlace'}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}