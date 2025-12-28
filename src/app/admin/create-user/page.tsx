"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  UserPlus, 
  Mail, 
  User, 
  Lock, 
  Shield, 
  Loader2, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Phone // Icono para teléfono
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminCreateUserPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState(''); // Estado para teléfono
  const [role, setRole] = useState('client');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      // Usamos /api/create-auth-user porque es el endpoint que ya configuramos para recibir 'phone'
      const res = await fetch('/api/create-auth-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          name, 
          role, 
          password,
          phone: phone.trim() // Enviamos el teléfono
        }),
      });
      const json = await res.json();
      
      if (res.ok) { 
         setMessage({ type: 'success', text: `Usuario creado exitosamente.` });
         // Limpiar formulario
         setEmail('');
         setName('');
         setPhone('');
         setPassword('');
         setRole('client');
      } else {
        setMessage({ type: 'error', text: json.error || 'Error desconocido al crear usuario.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: String(err.message || err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden font-sans flex items-center justify-center p-4">
      
      {/* Fondo superior estilo acuático */}
      <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-br from-cyan-600 via-sky-500 to-blue-600 rounded-b-[50px] shadow-lg overflow-hidden z-0">
        <div className="absolute top-10 left-10 w-24 h-24 bg-white/10 rounded-full blur-xl animate-pulse" />
        <div className="absolute top-20 right-20 w-32 h-32 bg-cyan-200/20 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 left-1/3 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
      </div>

      <div className="relative z-10 w-full max-w-lg animate-in zoom-in-95 duration-500">
        
        <Button 
            variant="ghost" 
            className="mb-4 text-white hover:bg-white/20 hover:text-white" 
            onClick={() => router.back()}
        >
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver
        </Button>

        <Card className="shadow-2xl border-0 rounded-3xl overflow-hidden backdrop-blur-sm bg-white/95">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-6 text-center">
            <div className="mx-auto bg-cyan-100 p-3 rounded-full w-fit mb-2 text-cyan-600 shadow-sm">
                <UserPlus className="h-8 w-8" />
            </div>
            <CardTitle className="font-headline text-2xl text-slate-800">Crear Nuevo Usuario</CardTitle>
            <CardDescription className="text-slate-500">
              Registra un nuevo usuario en el sistema con un rol específico.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-8 px-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-600 font-medium">Nombre Completo</Label>
                <div className="relative group">
                    <User className="absolute left-3 top-3 h-5 w-5 text-slate-400 group-focus-within:text-cyan-600 transition-colors" />
                    <Input 
                        id="name" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        required 
                        placeholder="Ej: Ana López"
                        className="pl-10 h-11 rounded-xl border-slate-200 focus-visible:ring-cyan-500"
                    />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-600 font-medium">Correo Electrónico</Label>
                <div className="relative group">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400 group-focus-within:text-cyan-600 transition-colors" />
                    <Input 
                        id="email" 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        required 
                        placeholder="correo@ejemplo.com"
                        className="pl-10 h-11 rounded-xl border-slate-200 focus-visible:ring-cyan-500"
                    />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-slate-600 font-medium">Teléfono (Opcional)</Label>
                <div className="relative group">
                    <Phone className="absolute left-3 top-3 h-5 w-5 text-slate-400 group-focus-within:text-cyan-600 transition-colors" />
                    <Input 
                        id="phone" 
                        type="tel" 
                        value={phone} 
                        onChange={(e) => setPhone(e.target.value)} 
                        placeholder="Ej: 55 1234 5678"
                        className="pl-10 h-11 rounded-xl border-slate-200 focus-visible:ring-cyan-500"
                    />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-slate-600 font-medium">Rol Asignado</Label>
                    <div className="relative">
                        <Shield className="absolute left-3 top-3 h-5 w-5 text-slate-400 z-10" />
                        <Select value={role} onValueChange={setRole}>
                            <SelectTrigger className="pl-10 h-11 rounded-xl border-slate-200">
                                <SelectValue placeholder="Selecciona rol" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="client">Cliente</SelectItem>
                                <SelectItem value="personal">Personal</SelectItem>
                                <SelectItem value="admin">Administrador</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-slate-600 font-medium">Contraseña (Opcional)</Label>
                    <div className="relative group">
                        <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400 group-focus-within:text-cyan-600 transition-colors" />
                        <Input 
                            id="password" 
                            type="text" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            placeholder="Automática si vacío"
                            className="pl-10 h-11 rounded-xl border-slate-200 focus-visible:ring-cyan-500"
                        />
                    </div>
                  </div>
              </div>

              {message && (
                <div className={`p-4 rounded-xl flex items-start gap-3 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                    {message.type === 'success' ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
                    <p>{message.text}</p>
                </div>
              )}

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-12 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl shadow-lg shadow-cyan-200 font-bold text-base transition-all hover:scale-[1.02] mt-2"
              >
                {loading ? (
                    <span className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" /> Creando...
                    </span>
                ) : (
                    'Crear Usuario'
                )}
              </Button>

            </form>
          </CardContent>
          <CardFooter className="bg-slate-50 border-t border-slate-100 p-4 justify-center">
            <p className="text-xs text-slate-400">
                Se enviarán credenciales si se configura el servicio de correo.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}