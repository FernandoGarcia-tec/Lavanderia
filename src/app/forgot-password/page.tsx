"use client";

import { useState } from 'react';
import Link from "next/link";
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
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { useAuth } from '@/firebase/provider';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const auth = useAuth(); // Assuming useAuth provides the auth instance, if not use getAuth()
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setSubmitted(true);
    } catch (err: any) {
      console.error('Password reset error', err);
      if (err.code === 'auth/user-not-found') {
        setError('No existe una cuenta con este correo electrónico.');
      } else if (err.code === 'auth/invalid-email') {
        setError('El correo electrónico no es válido.');
      } else {
        setError('Ocurrió un error al enviar el correo. Inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
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
          <CardHeader className="text-center bg-slate-50/50 pb-4 relative">
             <Button 
                variant="ghost" 
                size="sm" 
                className="absolute left-4 top-4 text-slate-500 hover:text-slate-800" 
                asChild
            >
                <Link href="/"><ArrowLeft className="w-5 h-5" /></Link>
            </Button>
            <CardTitle className="font-headline text-2xl text-cyan-900 pt-2">Recuperar Contraseña</CardTitle>
            <CardDescription>
              Te enviaremos un enlace para restablecer tu contraseña.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6">
            {!submitted ? (
                <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-600">Correo Electrónico</Label>
                    <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@correo.com"
                    required
                    className="h-12 border-slate-200 focus-visible:ring-cyan-500 rounded-xl text-base"
                    />
                </div>
                
                <Button 
                    type="submit" 
                    className="w-full h-12 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl shadow-md shadow-cyan-200 transition-all hover:scale-[1.02] text-base font-semibold"
                    disabled={loading}
                >
                    {loading ? 'Enviando...' : 'Enviar enlace'}
                </Button>
                {error && <p className="text-sm text-red-600 mt-2 text-center bg-red-50 p-2 rounded-lg border border-red-100">{error}</p>}
                </form>
            ) : (
                <div className="text-center space-y-4 py-4 animate-in fade-in zoom-in">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 mb-4">
                        <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">¡Correo enviado!</h3>
                    <p className="text-slate-600">
                        Revisa tu bandeja de entrada en <strong>{email}</strong> y sigue las instrucciones para crear una nueva contraseña.
                    </p>
                    <Button 
                        variant="outline" 
                        className="mt-6 w-full h-11 border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl"
                        asChild
                    >
                        <Link href="/">Volver al Inicio</Link>
                    </Button>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}