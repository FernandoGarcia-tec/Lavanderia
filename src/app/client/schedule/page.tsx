"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { 
  CheckCircle, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  ArrowLeft, 
  ArrowRight,
  Package2,
  Droplets,
  Brush,
  Bell,
  User,
  Shirt,
  Wind,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth, useFirestore } from '@/firebase/provider';
import { addDoc, collection, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

// --- ICONOS PERSONALIZADOS DEL FOOTER (De tu referencia) ---
const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
);
const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 1.4 3.3 4.4 3.3 4.4s-1.4 1.4-2.8 2.1c-1.1 1.1-2.2 2.3-3.8 3.2s-3.6 1.6-5.4 1.6c-1.8 0-3.6-.6-5.4-1.6s-3-2.1-3.8-3.2c-1.4-.7-2.8-2.1-2.8-2.1s1.7-3 3.3-4.4C4.7 6.1 4 4 4 4s1.1.7 2.2 1.4c1.1.7 2.2 1.1 3.3 1.1s2.2-.4 3.3-1.1c1.1-.7 2.2-1.4 2.2-1.4" /></svg>
);
const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>
);

// --- BURBUJAS ANIMADAS (De tu referencia) ---
const AnimatedBubbles = () => (
    <div className="bubbles absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 15 }).map((_, i) => {
        const hash = (i * 2654435761) % 4294967296;
        const randomX = (hash % 80) + 10;
        const randomDelay = -((hash % 200) / 10);
        const randomDuration = 15 + (hash % 15);
        
        return (
          <span
            key={i}
            className="absolute bg-white/10 rounded-full animate-float bottom-[-50px]"
            style={{
              left: `${randomX}%`,
              animationDelay: `${randomDelay}s`,
              animationDuration: `${randomDuration}s`,
              width: `${20 + (hash % 15)}px`,
              height: `${20 + (hash % 15)}px`,
              animation: `float ${randomDuration}s linear infinite`,
            }}
          />
        );
      })}
      <style jsx>{`
        @keyframes float {
            0% { transform: translateY(0) rotate(0deg); opacity: 0; }
            10% { opacity: 0.5; }
            90% { opacity: 0.3; }
            100% { transform: translateY(-60vh) rotate(360deg); opacity: 0; }
        }
      `}</style>
    </div>
);

// --- MAPEOS DE SERVICIOS ---
const serviceIconByName: Record<string, JSX.Element> = {
  'Lavandería': <Droplets className="w-12 h-12" />,
  'Lavado': <Droplets className="w-12 h-12" />,
  'Lavado Premium': <Shirt className="w-12 h-12" />,
  'Planchaduría': <Shirt className="w-12 h-12" />,
  'Planchado': <Shirt className="w-12 h-12" />,
  'Tintorería': <Sparkles className="w-12 h-12" />,
  'Edredones': <Droplets className="w-12 h-12" />,
  'Planchado Fino': <Brush className="w-12 h-12" />,
};

const serviceColorByName: Record<string, string> = {
  'Lavandería': 'text-blue-400',
  'Lavado': 'text-blue-400',
  'Lavado Premium': 'text-indigo-400',
  'Planchaduría': 'text-orange-400',
  'Planchado': 'text-orange-400',
  'Tintorería': 'text-purple-400',
  'Edredones': 'text-teal-400',
  'Planchado Fino': 'text-pink-400',
};

export default function SchedulePage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();
  const [services, setServices] = useState<Array<{ id: string; name: string; desc?: string; price?: number; unit?: string }>>([]);
  const [servicesLoading, setServicesLoading] = useState<boolean>(true);

  // Estado del formulario
  const [formData, setFormData] = useState({
    serviceType: '',
    serviceName: '',
    date: '',
    time: '',
    address: '',
    notes: ''
  });

  const handleServiceSelect = (id: string, name: string) => {
    setFormData({ ...formData, serviceType: id, serviceName: name });
    setStep(2);
  };

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/');
  };

  useEffect(() => {
    const colRef = collection(firestore, 'services');
    const unsub = onSnapshot(colRef, (snap) => {
      const list = snap.docs.map(d => ({ 
        id: d.id, 
        name: d.data().name || 'Servicio', 
        desc: d.data().description || '', 
        price: d.data().price, 
        unit: d.data().unit 
      }));
      setServices(list);
      setServicesLoading(false);
    }, (err) => {
      console.error('Error loading services:', err);
      setServicesLoading(false);
    });
    return () => unsub();
  }, [firestore]);

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
        status: 'pendiente',
        createdAt: serverTimestamp(),
      });
      setStep(3);
      toast({ title: "¡Pedido Agendado!", description: "Recibimos tu solicitud correctamente." });
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "No se pudo agendar el servicio.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white font-body font-sans">
      
      {/* --- HEADER (Estilo de Referencia) --- */}
      <header className="sticky top-0 z-50 w-full bg-white/80 shadow-sm backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/" className="font-headline text-lg font-bold text-gray-800">
            Lavandería y Planchaduría Angy
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/client/schedule" className="text-sm font-medium text-primary transition-colors hover:text-cyan-600">
              Programar servicio
            </Link>
            <Link href="#" className="text-sm font-medium text-gray-600 transition-colors hover:text-cyan-600">
              Historial de pedidos
            </Link>
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5 text-gray-600" />
              <span className="sr-only">Notificaciones</span>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors">
                  <User className="h-5 w-5 text-gray-600" />
                  <span className="text-sm text-gray-600">{auth?.currentUser?.email || 'Usuario'}</span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600 cursor-pointer">
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
          
          {/* Mobile Menu Trigger (Visual only for consistency with ref) */}
          <Button variant="ghost" size="icon" className="md:hidden">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {/* --- HERO SECTION (Estilo de Referencia con Wizard Title) --- */}
        <section className="relative flex h-[50vh] flex-col items-center justify-center bg-gradient-to-br from-cyan-500 via-sky-500 to-blue-600 text-center overflow-hidden rounded-b-[50px] shadow-lg">
          <AnimatedBubbles />
          {/* Decoración */}
          <div className="absolute top-10 left-10 w-24 h-24 bg-white/10 rounded-full blur-xl animate-pulse" />
          <div className="absolute top-20 right-20 w-32 h-32 bg-cyan-200/20 rounded-full blur-2xl" />
          <div className="absolute -bottom-10 left-1/3 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
          
          <div className="relative z-10 space-y-4 px-4">
            <h1 className="font-headline text-4xl font-bold text-white md:text-5xl drop-shadow">
              Agendar Nuevo Servicio
            </h1>
            <p className="text-lg text-white/90 md:text-xl">
              Sigue los pasos para programar tu recolección
            </p>
            
            {/* INDICADOR DE PASOS DENTRO DEL HERO */}
            <div className="flex justify-center items-center gap-6 mt-8">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center">
                        <div className={`
                            flex items-center justify-center w-12 h-12 rounded-full font-bold text-lg transition-all duration-300 shadow-md
                            ${step >= i 
                                ? 'bg-white text-cyan-600' 
                                : 'bg-white/20 text-white backdrop-blur-sm'
                            }
                        `}>
                            {step > i ? <CheckCircle className="w-6 h-6" /> : i}
                        </div>
                    </div>
                ))}
            </div>
          </div>
        </section>

        {/* --- CONTENT SECTION (Donde va la lógica del Wizard) --- */}
        <section className="container mx-auto px-4 py-16 md:px-6 -mt-20 relative z-20">
            <div className="max-w-4xl mx-auto">
            
            {/* PASO 1: SELECCIÓN DE SERVICIO */}
            {step === 1 && (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {servicesLoading && (
                        <div className="col-span-full py-12 text-center bg-white rounded-xl shadow-lg">Cargando servicios...</div>
                    )}
                    
                    {!servicesLoading && services.map((service) => (
                        <div 
                            key={service.id}
                            onClick={() => handleServiceSelect(service.id, service.name)}
                            className="group flex items-center justify-between rounded-xl bg-white p-8 shadow-lg transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer border border-slate-50"
                        >
                            <div className="flex-1 pr-4">
                                <h3 className="font-headline text-2xl font-semibold text-gray-700 group-hover:text-cyan-600 transition-colors">
                                    {service.name}
                                </h3>
                                {service.desc && <p className="text-gray-500 mt-2 text-sm">{service.desc}</p>}
                                {service.price != null && (
                                    <p className="mt-2 font-medium text-cyan-600">
                                        ${Number(service.price).toFixed(2)} {service.unit ? `/ ${service.unit}` : ''}
                                    </p>
                                )}
                            </div>
                            <div className={`transition-transform group-hover:scale-110 ${serviceColorByName[service.name] || 'text-blue-400'}`}>
                                {serviceIconByName[service.name] ?? <Shirt className="w-12 h-12" />}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* PASO 2: FORMULARIO */}
            {step === 2 && (
                <Card className="rounded-xl shadow-xl border-0 bg-white animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <CardHeader className="border-b border-gray-100 pb-6">
                        <CardTitle className="text-2xl text-gray-800">Detalles de Recolección</CardTitle>
                        <CardDescription>
                            Servicio: <span className="font-bold text-cyan-600">{formData.serviceName}</span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-gray-600">Fecha</Label>
                                <div className="relative">
                                    <CalendarIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                    <Input 
                                        type="date" 
                                        className="pl-10 h-12 rounded-lg border-gray-200 bg-gray-50 focus:bg-white transition-colors"
                                        value={formData.date}
                                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-600">Hora</Label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                    <Input 
                                        type="time" 
                                        className="pl-10 h-12 rounded-lg border-gray-200 bg-gray-50 focus:bg-white transition-colors"
                                        value={formData.time}
                                        onChange={(e) => setFormData({...formData, time: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <Label className="text-gray-600">Dirección</Label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                <Input 
                                    placeholder="Calle, Número, Colonia..." 
                                    className="pl-10 h-12 rounded-lg border-gray-200 bg-gray-50 focus:bg-white transition-colors"
                                    value={formData.address}
                                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-gray-600">Notas (Opcional)</Label>
                            <Textarea 
                                placeholder="Ej: Timbre no sirve..." 
                                className="rounded-lg border-gray-200 bg-gray-50 focus:bg-white transition-colors resize-none min-h-[100px]"
                                value={formData.notes}
                                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="bg-gray-50 p-6 flex justify-between rounded-b-xl">
                        <Button variant="ghost" onClick={() => setStep(1)} className="text-gray-500 hover:text-gray-800">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Volver
                        </Button>
                        <Button 
                            onClick={handleSubmit} 
                            disabled={loading || !formData.date || !formData.address}
                            className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg shadow-md px-8 h-11"
                        >
                            {loading ? 'Procesando...' : 'Confirmar Pedido'} <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {/* PASO 3: CONFIRMACIÓN */}
            {step === 3 && (
                <Card className="rounded-xl shadow-xl border-0 bg-white text-center py-16 animate-in zoom-in-95 duration-500">
                    <CardContent className="flex flex-col items-center">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                            <CheckCircle className="w-10 h-10 text-green-600" />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-800 mb-2">¡Pedido Recibido!</h2>
                        <p className="text-gray-500 max-w-md mx-auto mb-8">
                            Hemos registrado tu solicitud de <strong>{formData.serviceName}</strong>. 
                            Pasaremos el <strong>{formData.date}</strong> a las <strong>{formData.time}</strong>.
                        </p>
                        <div className="flex gap-4">
                            <Button variant="outline" onClick={() => router.push('/')} className="h-11 px-6 rounded-lg">
                                Volver al Inicio
                            </Button>
                            <Button className="bg-cyan-600 hover:bg-cyan-700 text-white h-11 px-6 rounded-lg shadow-md" onClick={() => {
                                setStep(1);
                                setFormData({serviceType: '', serviceName: '', date: '', time: '', address: '', notes: ''});
                            }}>
                                Agendar Otro
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
            </div>
        </section>
      </main>

      {/* --- FOOTER (Estilo de Referencia) --- */}
      <footer className="bg-gray-100 py-6 mt-auto">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-8 md:flex-row md:px-6">
          <p className="text-sm text-gray-500">
            © 2025 José Fernando Garcia Quintero
          </p>
          <div className="flex items-center gap-6">
             <div className="flex gap-4">
              <Link href="#" className="text-gray-500 hover:text-cyan-600">
                <FacebookIcon className="h-5 w-5" />
              </Link>
              <Link href="#" className="text-gray-500 hover:text-cyan-600">
                <TwitterIcon className="h-5 w-5" />
              </Link>
              <Link href="#" className="text-gray-500 hover:text-cyan-600">
                <InstagramIcon className="h-5 w-5" />
              </Link>
            </div>
             <div className="flex gap-4 text-sm">
                 <Link href="#" className="text-gray-500 hover:text-cyan-600">Blog</Link>
                <Link href="#" className="text-gray-500 hover:text-cyan-600">Support</Link>
                <Link href="#" className="text-gray-500 hover:text-cyan-600">Developers</Link>
             </div>
          </div>
        </div>
      </footer>
    </div>
  );
}