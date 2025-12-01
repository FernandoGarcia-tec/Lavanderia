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
import { doc, getDoc, getDocFromServer, setDoc, serverTimestamp } from 'firebase/firestore';
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
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;
      
      // check custom claims for mustChangePassword
      try {
        const idTokenResult = await cred.user.getIdTokenResult();
        if (idTokenResult?.claims?.mustChangePassword) {
          router.push('/change-password');
          setLoading(false);
          return;
        }
      } catch (claimErr) { // <--- AQUÍ FALTABA LA LLAVE DE CIERRE ANTERIOR
        console.warn('Failed to read token claims', claimErr);
      }

      console.log('Login: auth uid=', uid, 'email=', cred.user.email, 'displayName=', cred.user.displayName);
      const userPath = `users/${uid}`;
      let userDoc;
      try {
        // Prefer server read to avoid local cache returning stale data
        userDoc = await getDocFromServer(doc(firestore, 'users', uid));
      } catch (serverErr) {
        // Fallback to regular getDoc if server read fails (older SDKs or offline)
        console.warn('getDocFromServer failed, falling back to getDoc', serverErr);
        userDoc = await getDoc(doc(firestore, 'users', uid));
      }
      let data = userDoc.exists() ? userDoc.data() : null;
      console.log('Login: fetched user doc path=', userPath, 'exists=', userDoc.exists());
      console.log('Login: userDoc.data=', JSON.stringify(data));
      console.log('Login: data.role=', data?.role, 'typeof role=', typeof data?.role);

      // If the user doc does not exist, create a provisional document WITHOUT a role
      // (status 'pendiente') so admins must approve. This prevents defaulting to 'client'.
      if (!userDoc.exists()) {
        const provisional = {
          name: cred.user.displayName || cred.user.email || 'Sin nombre',
          email: cred.user.email || '',
          status: 'pendiente',
          authUid: uid,
          createdAt: serverTimestamp(),
          authCreatedAt: serverTimestamp(),
        };
        try {
          await setDoc(doc(firestore, 'users', uid), provisional, { merge: true });
          console.log('Login: provisional users doc created for', uid);
          data = provisional;
        } catch (setErr) {
          console.error('Login: failed to create provisional user doc', setErr);
        }
      }

      if (data && data.status === 'pendiente') {
        // Sign out and show message
        await signOut(auth);
        setError('La cuenta está pendiente. Espera a que el administrador la autorice.');
        setLoading(false);
        return;
      }

      // Redirect based on role. If role is missing, sign out and keep user at login.
      const role = data?.role;
      console.log('Login: resolved role=', role);
      const nombre = data?.name || (cred?.user?.displayName ?? 'sin-nombre');
      console.log(`Nombre del usuario: ${nombre}`);

      if (!role) {
        await signOut(auth);
        setError('Cuenta sin rol asignado. Contacta al administrador.');
        setLoading(false);
        return;
      }

      if (role === 'admin') {
        router.push('/admin');
      } else if (role === 'personal') {
        router.push('/staff');
      } else if (role === 'client') {
        router.push('/client');
      } else {
        // Unknown role: block access
        await signOut(auth);
        setError('Rol desconocido. Contacta al administrador.');
        setLoading(false);
        return;
      }
    } catch (err: any) {
      console.error('Login error', err);
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  // CONTENEDOR PRINCIPAL CON EL FONDO Y ESTILOS
  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden font-sans flex items-center justify-center p-4">
      
      {/* --- FONDO SUPERIOR (MITAD PANTALLA) --- */}
      <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-br from-cyan-500 via-sky-500 to-blue-600 rounded-b-[50px] shadow-lg overflow-hidden z-0">
        {/* Decoración: Burbujas */}
        <div className="absolute top-10 left-10 w-24 h-24 bg-white/10 rounded-full blur-xl animate-pulse" />
        <div className="absolute top-20 right-20 w-32 h-32 bg-cyan-200/20 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 left-1/3 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
      </div>

      {/* --- CONTENIDO PRINCIPAL (FLOTANTE) --- */}
      <div className="relative z-10 w-full max-w-md animate-in zoom-in-95 duration-500">
        
        {/* LOGO WRAPPER */}
        <div className="mb-8 flex justify-center animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner ring-4 ring-white/10">
             <AppLogo />
          </div>
        </div>

        {/* TARJETA */}
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

          {/* FOOTER (PROTOTIPO) */}
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
        
        <p className="text-center text-xs text-slate-400 mt-8">
           © 2025 Angy Lavandería.
        </p>
      </div>
    </div>
  );
}