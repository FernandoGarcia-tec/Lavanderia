"use client";

import { useState } from 'react';
import Link from "next/link";
import Image from "next/image";
import logo from "./logo.png";
import { useAuth, useFirestore } from '@/firebase/provider';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { AppLogo } from "@/components/app-logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function RegisterPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;
      // Create user document in Firestore
      await setDoc(doc(firestore, 'users', uid), {
        name,
        email,
        role: 'client',
        status: 'pendiente',
        createdAt: serverTimestamp(),
      });
      toast({
        title: 'Cuenta creada',
        description: 'Tu cuenta fue registrada. Espera aprobación o inicia sesión.',
      });
      // Redirect to login or dashboard
      router.push('/');
    } catch (err: any) {
      console.error('Registration error', err);
      setError(err.message || 'Error al registrar');
    } finally {
      setLoading(false);
    }
  }
  return (
    // CONTENEDOR PRINCIPAL
    <div className="min-h-screen bg-slate-50 relative overflow-hidden font-sans flex items-center justify-center p-4">
      
      {/* --- FONDO SUPERIOR (MITAD PANTALLA) --- */}
      <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-br from-cyan-500 via-sky-500 to-blue-600 rounded-b-[50px] shadow-lg overflow-hidden z-0">
        {/* Decoración: Burbujas */}
        <div className="absolute top-10 left-10 w-24 h-24 bg-white/10 rounded-full blur-xl animate-pulse" />
        <div className="absolute top-20 right-20 w-32 h-32 bg-cyan-200/20 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 left-1/3 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
      </div>

      {/* --- CONTENIDO FLOTANTE --- */}
      <div className="relative z-10 w-full max-w-md animate-in zoom-in-95 duration-500">
         {/* LOGO WRAPPER */}
                <div className="mb-8 flex justify-center animate-in fade-in slide-in-from-top-4 duration-700">
                  <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner ring-4 ring-white/10">
                     <AppLogo />
                  </div>
                </div>
        {/* --- logotipo ---
import Image from "next/image";
import logo from "./logo.png";
        <div className="flex justify-start mb-6">
          <Image
            src={logo}
            alt="Logo"
            width={300}
            height={300}
            className="object-contain ml-[-500px]"
          />
        </div> 
        */}

        {/* TARJETA */}
        <Card className="w-full shadow-2xl border-0 rounded-3xl overflow-hidden">
          
          <CardHeader className="text-center bg-slate-50/50 pb-4">
            <CardTitle className="font-headline text-2xl text-cyan-900">Crear una Cuenta</CardTitle>
            <CardDescription>
              Únete a la plataforma ANGY para gestionar tus servicios.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-600">Nombre Completo</Label>
                <Input 
                  id="name" 
                  value={name}
                  onChange={(e) => setName((e.target as HTMLInputElement).value)}
                  placeholder="John Doe" 
                  required 
                  className="h-11 border-slate-200 focus-visible:ring-cyan-500 rounded-xl"
                />
              </div>

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
                <Label htmlFor="password" className="text-slate-600">Contraseña</Label>
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
                className="w-full h-11 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl shadow-md shadow-cyan-200 transition-all hover:scale-[1.02] mt-2"
                disabled={loading}
              >
                {loading ? 'Creando cuenta...' : 'Registrarse'}
              </Button>
              {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              ¿Ya tienes una cuenta?{" "}
              <Link href="/" className="font-medium text-cyan-600 hover:underline hover:text-cyan-700">
                Iniciar Sesión
              </Link>
            </div>
          </CardContent>
        </Card>
        
        <p className="text-center text-xs text-slate-400 mt-8">
           © 2025 Angy Lavandería.
        </p>
      </div>
    </div>
  );
}