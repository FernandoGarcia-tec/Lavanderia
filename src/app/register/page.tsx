import Link from "next/link";
import Image from "next/image";
import logo from "./logo.png";
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

export default function RegisterPage() {
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
            <form className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-600">Nombre Completo</Label>
                <Input 
                  id="name" 
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
                  placeholder="nombre@ejemplo.com"
                  required
                  className="h-11 border-slate-200 focus-visible:ring-cyan-500 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-600">Contraseña</Label>
                <Input 
                  id="password" 
                  type="password" 
                  required 
                  className="h-11 border-slate-200 focus-visible:ring-cyan-500 rounded-xl"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl shadow-md shadow-cyan-200 transition-all hover:scale-[1.02] mt-2"
              >
                Registrarse
              </Button>
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