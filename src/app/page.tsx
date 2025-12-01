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
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
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
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // 1. Autenticación
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;
      const userEmail = cred.user.email;
      
      // Chequeo de claims
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

      console.log('Login: Buscando datos para:', userEmail);
      
      // 2. Buscar documento del usuario
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
        console.log("Usuario encontrado por ID (UID). Rol actual:", userData?.role);
      } else {
        // Fallback: Buscar por correo
        console.log("No encontrado por ID, buscando por correo...");
        const usersRef = collection(firestore, 'users');
        const q = query(usersRef, where('email', '==', userEmail));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const foundDoc = querySnapshot.docs[0];
          userData = foundDoc.data();
          docRef = foundDoc.ref;
          console.log("Usuario encontrado por Correo. Rol actual:", userData?.role);
        }
      }

      // 3. Si NO existe documento, crear perfil de CLIENTE
      if (!userData) {
        console.log("Documento no encontrado. Creando perfil de Cliente...");
        const newUser = {
            email: userEmail,
            name: cred.user.displayName || email.split('@')[0],
            role: 'client', // <--- CLIENTE POR DEFECTO
            status: 'aprobado',
            createdAt: serverTimestamp(),
            authUid: uid
        };
        await setDoc(doc(firestore, 'users', uid), newUser);
        userData = newUser;
      }

      // 4. Validaciones de estado
      if (userData && userData.status === 'pendiente') {
        await signOut(auth);
        setError('La cuenta está pendiente. Espera a que el administrador la autorice.');
        setLoading(false);
        return;
      }

      // --- SIN AUTOCORRECCIÓN DE ROL ---

      const role = userData?.role;

      if (!role) {
        // Solo si NO tiene rol, le ponemos 'client' para que no se rompa la app
        await setDoc(docRef, { role: 'client' }, { merge: true });
        router.push('/client');
        return;
      }

      // 5. Redirección
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
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Correo o contraseña incorrectos.');
      } else {
        setError(err.message || 'Error al iniciar sesión');
      }
    } finally {
      setLoading(false);
    }
  }

  // UI / DISEÑO
  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden font-sans flex items-center justify-center p-4">
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

        <Card className="w-full shadow-2xl border-0 rounded-3xl overflow-hidden">
          <CardHeader className="text-center bg-slate-50/50 pb-4">
            <CardTitle className="font-headline text-2xl text-cyan-900">Lavanderia y planchaduría "ANGY"</CardTitle>
            <CardDescription>
              Introduce tus datos para acceder a tu cuenta.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-600">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
                  placeholder="nombre@ejemplo.com"
                  required
                  className="h-11 border-slate-200 focus-visible:ring-cyan-500 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-slate-600">Contraseña</Label>
                  <Link
                    href="#"
                    className="text-sm font-medium text-cyan-600 hover:underline hover:text-cyan-700"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
                    required
                    className="h-11 border-slate-200 focus-visible:ring-cyan-500 rounded-xl pr-10"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full h-11 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl shadow-md shadow-cyan-200 transition-all hover:scale-[1.02]"
                disabled={loading}
              >
                {loading ? 'Iniciando...' : 'Iniciar Sesión'}
              </Button>
              {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
            </form>
            
            <div className="mt-6 text-center text-sm text-muted-foreground">
              ¿No tienes una cuenta?{" "}
              <Link href="/register" className="font-medium text-cyan-600 hover:underline">
                Regístrate
              </Link>
            </div>
          </CardContent>

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
        </Card>
      </div>
    </div>
  );
}