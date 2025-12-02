"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { 
  CheckCircle, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Shirt, 
  Wind, 
  Sparkles, 
  ArrowLeft, 
  ArrowRight,
  Package2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth, useFirestore } from '@/firebase/provider';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Bell, User } from "lucide-react";

// Social icons used in footer
const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
);

const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M22 4s-.7 2.1-2 3.4c1.6 1.4 3.3 4.4 3.3 4.4s-1.4 1.4-2.8 2.1c-1.1 1.1-2.2 2.3-3.8 3.2s-3.6 1.6-5.4 1.6c-1.8 0-3.6-.6-5.4-1.6s-3-2.1-3.8-3.2c-1.4-.7-2.8-2.1-2.8-2.1s1.7-3 3.3-4.4C4.7 6.1 4 4 4 4s1.1.7 2.2 1.4c1.1.7 2.2 1.1 3.3 1.1s2.2-.4 3.3-1.1c1.1-.7 2.2-1.4 2.2-1.4" />
    </svg>
);

const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
);

// Tipos de servicio con iconos
const SERVICE_TYPES = [
  { id: 'lavanderia', label: 'Lavandería', icon: <Shirt className="w-8 h-8" />, desc: 'Lavado y secado por encargo (por Kilo)', color: 'bg-blue-100 text-blue-600' },
  { id: 'planchaduria', label: 'Planchaduría', icon: <Wind className="w-8 h-8" />, desc: 'Planchado profesional (por Docena/Pieza)', color: 'bg-orange-100 text-orange-600' },
  { id: 'tintoreria', label: 'Tintorería', icon: <Sparkles className="w-8 h-8" />, desc: 'Limpieza en seco para prendas delicadas', color: 'bg-purple-100 text-purple-600' },
  { id: 'edredones', label: 'Edredones', icon: <Package2 className="w-8 h-8" />, desc: 'Limpieza especial para ropa de cama', color: 'bg-teal-100 text-teal-600' },
];

export default function SchedulePage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();

  // Estado del formulario
  const [formData, setFormData] = useState({
    serviceType: '',
    date: '',
    time: '',
    address: '',
    notes: ''
  });

  const handleServiceSelect = (id: string) => {
    setFormData({ ...formData, serviceType: id });
    setStep(2); // Avanzar automáticamente al seleccionar
  };

  const handleSubmit = async () => {
    if (!auth?.currentUser) {
      toast({ title: "Error", description: "Debes iniciar sesión para agendar.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(firestore, 'orders'), {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        userName: auth.currentUser.displayName || 'Cliente',
        ...formData,
        status: 'pendiente', // Estado inicial del pedido
        createdAt: serverTimestamp(),
      });
      
      setStep(3); // Ir a pantalla de éxito
      toast({ title: "¡Pedido Agendado!", description: "Recibimos tu solicitud correctamente." });
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "No se pudo agendar el servicio.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Renderizado condicional de pasos
  return (
        <div className="min-h-screen bg-slate-50 relative font-sans overflow-hidden">
                {/* Header */}
                <header className="sticky top-0 z-50 w-full bg-white/80 shadow-sm backdrop-blur-sm">
                    <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
                        <Link href="/" className="font-headline text-lg font-bold text-gray-800">
                            Lavandería y Planchaduría Angy
                        </Link>
                        <nav className="hidden items-center gap-6 md:flex">
                            <Link
                                href="/client/schedule"
                                className="text-sm font-medium text-gray-600 transition-colors hover:text-primary"
                            >
                                Programar servicio
                            </Link>
                            <Link
                                href="#"
                                className="text-sm font-medium text-gray-600 transition-colors hover:text-primary"
                            >
                                Historial de pedidos
                            </Link>
                            <Button variant="ghost" size="icon">
                                <Bell className="h-5 w-5 text-gray-600" />
                                <span className="sr-only">Notificaciones</span>
                            </Button>
                            <div className="flex items-center gap-2">
                                <User className="h-5 w-5 text-gray-600" />
                                <span className="text-sm text-gray-600">user@gmail.com</span>
                            </div>
                        </nav>
                        <Button variant="ghost" size="icon" className="md:hidden">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
                            <span className="sr-only">Toggle menu</span>
                        </Button>
                    </div>
                </header>
        
        {/* FONDO SUPERIOR */}
        <div className="absolute top-0 left-0 w-full h-[40vh] bg-gradient-to-br from-cyan-500 via-sky-500 to-blue-600 rounded-b-[50px] shadow-lg z-0">
            <div className="absolute top-10 left-10 w-24 h-24 bg-white/10 rounded-full blur-xl animate-pulse" />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        </div>

        <div className="relative z-10 container mx-auto px-4 py-8">
            <div className="mb-8 text-center text-white">
                <h1 className="text-3xl font-bold drop-shadow-md">Agendar Nuevo Servicio</h1>
                <p className="opacity-90">Completa los pasos para solicitar tu recolección</p>
                
                {/* INDICADOR DE PASOS */}
                <div className="flex justify-center items-center gap-4 mt-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className={`flex items-center justify-center w-10 h-10 rounded-full font-bold transition-all border-2 ${
                            step >= i ? 'bg-white text-cyan-600 border-white' : 'bg-transparent text-white/50 border-white/30'
                        }`}>
                            {step > i ? <CheckCircle className="w-6 h-6" /> : i}
                        </div>
                    ))}
                </div>
            </div>

            {/* CONTENIDO PRINCIPAL */}
            <div className="max-w-3xl mx-auto">
                {step === 1 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-bottom-8 duration-500">
                        {SERVICE_TYPES.map((service) => (
                            <button
                                key={service.id}
                                onClick={() => handleServiceSelect(service.id)}
                                className="bg-white p-6 rounded-3xl shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all text-left border border-transparent hover:border-cyan-200 group"
                            >
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${service.color} group-hover:bg-cyan-600 group-hover:text-white transition-colors`}>
                                    {service.icon}
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 group-hover:text-cyan-700">{service.label}</h3>
                                <p className="text-slate-500 mt-2 text-sm">{service.desc}</p>
                            </button>
                        ))}
                    </div>
                )}

                {step === 2 && (
                    <Card className="rounded-3xl shadow-2xl animate-in slide-in-from-right-8 duration-500">
                        <CardHeader>
                            <CardTitle>Detalles de Recolección</CardTitle>
                            <CardDescription>Dinos cuándo y dónde pasar por tu ropa.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Fecha</Label>
                                    <div className="relative">
                                        <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                        <Input 
                                            type="date" 
                                            className="pl-10 rounded-xl h-11"
                                            value={formData.date}
                                            onChange={(e) => setFormData({...formData, date: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Hora Preferida</Label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                        <Input 
                                            type="time" 
                                            className="pl-10 rounded-xl h-11"
                                            value={formData.time}
                                            onChange={(e) => setFormData({...formData, time: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Dirección / Ubicación</Label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <Input 
                                        placeholder="Calle, Número, Colonia..." 
                                        className="pl-10 rounded-xl h-11"
                                        value={formData.address}
                                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Notas Adicionales (Opcional)</Label>
                                <Textarea 
                                    placeholder="Ej: 'Cuidado con la camisa blanca', 'Tocar el timbre fuerte'..." 
                                    className="rounded-xl resize-none"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-between">
                            <Button variant="ghost" onClick={() => setStep(1)} className="rounded-xl">
                                <ArrowLeft className="mr-2 h-4 w-4" /> Volver
                            </Button>
                            <Button 
                                onClick={handleSubmit} 
                                disabled={loading || !formData.date || !formData.address}
                                className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl shadow-lg shadow-cyan-200"
                            >
                                {loading ? 'Enviando...' : 'Confirmar Pedido'} <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {step === 3 && (
                    <Card className="rounded-3xl shadow-2xl text-center py-12 animate-in zoom-in-95 duration-500">
                        <CardContent className="flex flex-col items-center">
                            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
                                <CheckCircle className="w-12 h-12 text-green-600" />
                            </div>
                            <h2 className="text-3xl font-bold text-slate-800 mb-2">¡Pedido Recibido!</h2>
                            <p className="text-slate-500 max-w-md mx-auto mb-8">
                                Hemos registrado tu solicitud de <strong>{SERVICE_TYPES.find(s => s.id === formData.serviceType)?.label}</strong>. 
                                Un repartidor pasará el <strong>{formData.date}</strong> a las <strong>{formData.time}</strong>.
                            </p>
                            <div className="flex gap-4">
                                <Button variant="outline" className="rounded-xl border-slate-200" onClick={() => router.push('/')}>
                                    Volver al Inicio
                                </Button>
                                <Button className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl" onClick={() => {
                                    setStep(1);
                                    setFormData({serviceType: '', date: '', time: '', address: '', notes: ''});
                                }}>
                                    Agendar Otro
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
                </div>

                {/* Footer */}
                <footer className="bg-gray-100 py-6">
                    <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-8 md:flex-row md:px-6">
                        <p className="text-sm text-gray-500">
                            © 2025 José Fernando Garcia Quintero
                        </p>
                        <div className="flex items-center gap-6">
                            <div className="flex gap-4">
                                <Link href="#" className="text-gray-500 hover:text-primary">
                                    <FacebookIcon className="h-5 w-5" />
                                </Link>
                                <Link href="#" className="text-gray-500 hover:text-primary">
                                    <TwitterIcon className="h-5 w-5" />
                                </Link>
                                <Link href="#" className="text-gray-500 hover:text-primary">
                                    <InstagramIcon className="h-5 w-5" />
                                </Link>
                            </div>
                            <div className="flex gap-4 text-sm">
                                <Link href="#" className="text-gray-500 hover:text-primary">
                                    Blog
                                </Link>
                                <Link href="#" className="text-gray-500 hover:text-primary">
                                    Support
                                </Link>
                                <Link href="#" className="text-gray-500 hover:text-primary">
                                    Developers
                                </Link>
                            </div>
                        </div>
                    </div>
                </footer>
        </div>
  );
}