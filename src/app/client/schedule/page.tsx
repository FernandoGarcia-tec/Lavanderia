"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
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
  Sparkles,
  Trash2,
  ShoppingBag,
  Info,
  Plus,
  Phone,
  X
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

// --- ICONOS Y REDES SOCIALES ---
const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
);
const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 1.4 3.3 4.4 3.3 4.4s-1.4 1.4-2.8 2.1c-1.1 1.1-2.2 2.3-3.8 3.2s-3.6 1.6-5.4 1.6c-1.8 0-3.6-.6-5.4-1.6s-3-2.1-3.8-3.2c-1.4-.7-2.8-2.1-2.8-2.1s1.7-3 3.3-4.4C4.7 6.1 4 4 4 4s1.1.7 2.2 1.4c1.1.7 2.2 1.1 3.3 1.1s2.2-.4 3.3-1.1c1.1-.7 2.2-1.4 2.2-1.4" /></svg>
);
const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>
);

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

const serviceIconByName: Record<string, JSX.Element> = {
  'Lavandería': <Droplets className="w-8 h-8" />,
  'Lavado': <Droplets className="w-8 h-8" />,
  'Planchaduría': <Wind className="w-8 h-8" />,
  'Tintorería': <Sparkles className="w-8 h-8" />,
  'Edredones': <Package2 className="w-8 h-8" />,
  'default': <Shirt className="w-8 h-8" />
};

const serviceColorByName: Record<string, string> = {
  'Lavandería': 'text-blue-500 bg-blue-50',
  'Lavado': 'text-blue-500 bg-blue-50',
  'Planchaduría': 'text-orange-500 bg-orange-50',
  'Tintorería': 'text-purple-500 bg-purple-50',
  'Edredones': 'text-teal-500 bg-teal-50',
  'default': 'text-slate-500 bg-slate-50'
};

interface CartItem {
  serviceId: string;
  serviceName: string;
  unit: string;
  priceUnit: number;
}

export default function SchedulePage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();
  
  const [services, setServices] = useState<Array<{ id: string; name: string; desc?: string; price?: number; unit?: string }>>([]);
  const [servicesLoading, setServicesLoading] = useState<boolean>(true);

  // Carrito de compras (solo ítems seleccionados)
  const [cart, setCart] = useState<CartItem[]>([]);

  // Datos del formulario final
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    phone: '',
    notes: ''
  });
  // Calcular la fecha mínima (hoy) para el input date
  const minDate = format(new Date(), 'yyyy-MM-dd');

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/');
  };

  // Cargar servicios
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

  // Manejo del Carrito Simplificado
  const addToCart = (service: any) => {
      const exists = cart.find(item => item.serviceId === service.id);
      if (exists) {
        toast({ title: "Ya seleccionado", description: `El servicio ${service.name} ya está en tu lista.` });
        return;
      }

      const newItem: CartItem = {
          serviceId: service.id,
          serviceName: service.name,
          unit: service.unit,
          priceUnit: service.price || 0
      };
      setCart([...cart, newItem]);
      toast({ title: "Agregado", description: `${service.name} añadido a la lista.` });
  };

  const removeFromCart = (index: number) => {
      const newCart = [...cart];
      newCart.splice(index, 1);
      setCart(newCart);
  };

  const handleSubmit = async () => {
    if (!auth?.currentUser) {
      toast({ title: "Error", description: "Debes iniciar sesión para agendar.", variant: "destructive" });
      return;
    }
    if (cart.length === 0) {
        toast({ title: "Lista vacía", description: "Selecciona al menos un servicio.", variant: "destructive" });
        return;
    }
    if (!formData.phone) {
        toast({ title: "Falta teléfono", description: "Por favor ingresa un número de contacto para cualquier duda.", variant: "destructive" });
        return;
    }

    setLoading(true);
    try {
      const deliveryDateTime = new Date(formData.date);
      const [h, m] = formData.time.split(':');
      if (h) deliveryDateTime.setHours(Number(h), Number(m) || 0);

      await addDoc(collection(firestore, 'orders'), {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        userName: auth.currentUser.displayName || 'Cliente',
        items: cart, 
        serviceName: cart.length === 1 ? cart[0].serviceName : 'Varios Servicios',
        estimatedTotal: 0, // Se calcula después por el personal
        
        date: formData.date,
        time: formData.time,
        phone: formData.phone,
        notes: formData.notes,
        // Eliminado address
        
        deliveryDate: serverTimestamp(),
        status: 'pendiente',
        paymentStatus: 'pendiente', 
        createdAt: serverTimestamp(),
      });
      setStep(3);
      toast({ title: "¡Solicitud Enviada!", description: "El personal confirmará los detalles." });
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "No se pudo agendar el servicio.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const userInitial = (auth?.currentUser?.email || "U").charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen flex-col bg-white font-body font-sans">
      
      {/* --- HEADER --- */}
      <header className="sticky top-0 z-50 w-full bg-white/80 shadow-sm backdrop-blur-sm border-b border-white/20">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/client" className="font-headline text-lg font-bold text-gray-800 flex items-center gap-2">
            <div className="bg-cyan-600 rounded-lg p-1.5"><Droplets className="h-5 w-5 text-white" /></div>
            <span className="hidden sm:inline">Lavandería Angy</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/client/schedule" className="text-sm font-medium text-cyan-700 bg-cyan-50 px-3 py-1.5 rounded-full transition-colors">
              Programar servicio
            </Link>
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5 text-gray-600" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded-full border border-slate-200 transition-colors pr-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={auth?.currentUser?.photoURL || undefined} />
                    <AvatarFallback className="bg-cyan-100 text-cyan-700 text-xs font-bold">{userInitial}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium text-gray-700 truncate max-w-[100px]">{auth?.currentUser?.email?.split('@')[0]}</span>
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
          
          <Button variant="ghost" size="icon" className="md:hidden">
            <User className="h-6 w-6 text-slate-700" />
          </Button>
        </div>
      </header>

      <main className="flex-1 pb-20">
        {/* HERO SECTION */}
        <section className="relative flex h-[40vh] flex-col items-center justify-center bg-gradient-to-br from-cyan-500 via-sky-500 to-blue-600 text-center overflow-hidden rounded-b-[40px] shadow-lg mb-8">
          <AnimatedBubbles />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
          
          <div className="relative z-10 space-y-2 px-4">
            <h1 className="font-headline text-3xl font-bold text-white md:text-5xl drop-shadow-md">
              Agendar Servicio
            </h1>
            <p className="text-sm text-cyan-50 md:text-lg max-w-lg mx-auto leading-relaxed">
              Selecciona tus prendas y programa de agendado en simples pasos.
            </p>
            
            {/* WIZARD INDICATOR */}
            <div className="flex justify-center items-center gap-8 mt-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                        <div className={`
                            flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm transition-all duration-300 shadow-lg border-2
                            ${step >= i 
                                ? 'bg-white text-cyan-600 border-white scale-110' 
                                : 'bg-white/20 text-white/70 border-white/30'
                            }
                        `}>
                            {step > i ? <CheckCircle className="w-5 h-5" /> : i}
                        </div>
                        <span className={`text-[10px] font-medium uppercase tracking-wide ${step >= i ? 'text-white' : 'text-white/50'}`}>
                            {i === 1 ? 'Servicios' : i === 2 ? 'Datos' : 'Confirmación'}
                        </span>
                    </div>
                ))}
            </div>
          </div>
        </section>

        {/* CONTENT */}
        <section className="container mx-auto px-4 -mt-16 relative z-20">
            <div className="max-w-4xl mx-auto">
            
            {/* PASO 1: SELECCIÓN DE SERVICIOS (CARRITO SIMPLIFICADO) */}
            {step === 1 && (
                <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500">
                    <Card className="shadow-xl border-0 rounded-2xl overflow-hidden">
                        <CardHeader className="bg-white border-b border-slate-100 pb-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="text-xl text-slate-800">Catálogo</CardTitle>
                                    <CardDescription>Haz clic para agregar al pedido.</CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <ShoppingBag className="h-5 w-5 text-cyan-600" />
                                    <Badge variant="secondary" className="text-cyan-700 bg-cyan-50 border-cyan-100">{cart.length} en lista</Badge>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 bg-slate-50/50 min-h-[300px]">
                            {servicesLoading ? (
                                <div className="text-center py-12 text-slate-400">Cargando catálogo...</div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {services.map((service) => {
                                        const isSelected = cart.some(i => i.serviceId === service.id);
                                        const icon = Object.keys(serviceIconByName).find(key => service.name.includes(key)) 
                                            ? serviceIconByName[Object.keys(serviceIconByName).find(key => service.name.includes(key))!] 
                                            : serviceIconByName['default'];
                                        const colorClass = serviceColorByName[Object.keys(serviceColorByName).find(key => service.name.includes(key)) || 'default'];

                                        return (
                                            <div 
                                                key={service.id}
                                                onClick={() => isSelected ? null : addToCart(service)}
                                                className={`
                                                    p-4 rounded-xl border transition-all cursor-pointer group flex items-center justify-between active:scale-95
                                                    ${isSelected 
                                                        ? 'bg-cyan-50 border-cyan-300 ring-2 ring-cyan-100 opacity-80' 
                                                        : 'bg-white border-slate-200 hover:border-cyan-400 hover:shadow-md'
                                                    }
                                                `}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-2.5 rounded-xl ${colorClass} group-hover:scale-110 transition-transform`}>
                                                        {icon}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-700 text-sm group-hover:text-cyan-700">{service.name}</h4>
                                                        <p className="text-xs text-slate-400 mt-0.5">
                                                            {service.desc || 'Servicio estándar'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className={`p-1.5 rounded-full transition-colors ${isSelected ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-cyan-600 group-hover:text-white'}`}>
                                                    {isSelected ? <CheckCircle className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                        
                        {/* RESUMEN DEL CARRITO */}
                        {cart.length > 0 && (
                            <div className="bg-white border-t border-slate-100 p-4">
                                <h4 className="text-sm font-bold text-slate-700 mb-3 px-1">Servicios Seleccionados:</h4>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {cart.map((item, idx) => (
                                        <Badge key={idx} variant="outline" className="pl-3 pr-1 py-1.5 bg-slate-50 border-slate-200 text-slate-700 flex items-center gap-2">
                                            {item.serviceName} 
                                            <button onClick={() => removeFromCart(idx)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full p-0.5 transition-colors">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2 bg-blue-50 text-blue-700 p-3 rounded-xl text-xs">
                                    <Info className="w-4 h-4 shrink-0" />
                                    <span>El costo total se calculará al momento de pesar/contar tus prendas en la entrega.</span>
                                </div>
                            </div>
                        )}
                        <CardFooter className="bg-white p-4 border-t border-slate-100 flex justify-end">
                            <Button 
                                onClick={() => setStep(2)} 
                                disabled={cart.length === 0}
                                className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl shadow-lg px-8 h-12 text-base font-semibold transition-all hover:scale-[1.02]"
                            >
                                Continuar <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}

            {/* PASO 2: FORMULARIO DE RECOLECCIÓN */}
            {step === 2 && (
                <Card className="rounded-2xl shadow-xl border-0 bg-white animate-in slide-in-from-right-8 duration-500">
                    <CardHeader className="border-b border-gray-100 pb-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-xl text-gray-800">Detalles de agendado</CardTitle>
                                <CardDescription>Indícanos cuándo pasaría a dejar.</CardDescription>
                            </div>
                            <div className="bg-slate-100 p-2 rounded-lg">
                                <MapPin className="h-5 w-5 text-slate-500" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-gray-600 font-medium">Fecha</Label>
                                <div className="relative">
                                    <CalendarIcon className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                                    <Input 
                                        type="date" 
                                        min={minDate}
                                        className="pl-10 h-12 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-cyan-500 transition-colors"
                                        value={formData.date}
                                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-600 font-medium">Hora (8:00 AM - 8:00 PM)</Label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400 z-10" />
                                    <select
                                        className="w-full pl-10 h-12 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-cyan-500 transition-colors appearance-none cursor-pointer text-sm"
                                        value={formData.time}
                                        onChange={(e) => setFormData({...formData, time: e.target.value})}
                                    >
                                        <option value="">Selecciona una hora</option>
                                        <option value="08:00">08:00 AM</option>
                                        <option value="08:30">08:30 AM</option>
                                        <option value="09:00">09:00 AM</option>
                                        <option value="09:30">09:30 AM</option>
                                        <option value="10:00">10:00 AM</option>
                                        <option value="10:30">10:30 AM</option>
                                        <option value="11:00">11:00 AM</option>
                                        <option value="11:30">11:30 AM</option>
                                        <option value="12:00">12:00 PM</option>
                                        <option value="12:30">12:30 PM</option>
                                        <option value="13:00">01:00 PM</option>
                                        <option value="13:30">01:30 PM</option>
                                        <option value="14:00">02:00 PM</option>
                                        <option value="14:30">02:30 PM</option>
                                        <option value="15:00">03:00 PM</option>
                                        <option value="15:30">03:30 PM</option>
                                        <option value="16:00">04:00 PM</option>
                                        <option value="16:30">04:30 PM</option>
                                        <option value="17:00">05:00 PM</option>
                                        <option value="17:30">05:30 PM</option>
                                        <option value="18:00">06:00 PM</option>
                                        <option value="18:30">06:30 PM</option>
                                        <option value="19:00">07:00 PM</option>
                                        <option value="19:30">07:30 PM</option>
                                        <option value="20:00">08:00 PM</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <Label className="text-gray-600 font-medium">Teléfono de Contacto</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                                <Input 
                                    type="tel" 
                                    placeholder="55 1234 5678"
                                    className="pl-10 h-12 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-cyan-500 transition-colors"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-gray-600 font-medium">Instrucciones Adicionales</Label>
                            <Textarea 
                                placeholder="Ej: 'Ropa delicada en bolsa aparte'..." 
                                className="rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-cyan-500 transition-colors resize-none min-h-[100px]"
                                value={formData.notes}
                                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="bg-slate-50 p-6 flex justify-between rounded-b-2xl border-t border-slate-100">
                        <Button variant="ghost" onClick={() => setStep(1)} className="text-slate-500 hover:text-slate-800 hover:bg-white border border-transparent hover:border-slate-200 rounded-xl px-6 h-11">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Volver
                        </Button>
                        <Button 
                            onClick={handleSubmit} 
                            disabled={loading || !formData.date || !formData.phone}
                            className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl shadow-lg shadow-cyan-200 px-8 h-11 transition-all hover:scale-[1.02]"
                        >
                            {loading ? 'Enviando...' : 'Confirmar Solicitud'} <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {/* PASO 3: CONFIRMACIÓN */}
            {step === 3 && (
                <Card className="rounded-2xl shadow-2xl border-0 bg-white text-center py-16 animate-in zoom-in-95 duration-500">
                    <CardContent className="flex flex-col items-center">
                        <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-6 border-4 border-green-100 animate-bounce-slow">
                            <CheckCircle className="w-12 h-12 text-green-600" />
                        </div>
                        <h2 className="text-3xl font-bold text-slate-800 mb-3 tracking-tight">¡Solicitud Recibida!</h2>
                        <p className="text-slate-500 max-w-md mx-auto mb-8 leading-relaxed">
                            Hemos agendado tu servicio. Puedes pasar a entregar el dia: <strong className="text-cyan-700">{formData.date}</strong> a las <strong className="text-cyan-700">{formData.time}</strong>.
                        </p>
                        <div className="flex gap-4">
                            <Button variant="outline" onClick={() => router.push('/')} className="h-12 px-8 rounded-xl border-slate-200 text-slate-600 hover:text-slate-900">
                                Ir al Inicio
                            </Button>
                            <Button className="bg-cyan-600 hover:bg-cyan-700 text-white h-12 px-8 rounded-xl shadow-lg shadow-cyan-200" onClick={() => {
                                setStep(1);
                                setCart([]);
                                setFormData({ date: '', time: '', phone: '', notes: '' });
                            }}>
                                Solicitar Otro
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
            </div>
        </section>
      </main>

      {/* --- FOOTER --- */}
       <footer className="bg-gray-100 py-6">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-8 md:flex-row md:px-6">
          <p className="text-sm text-gray-500">
            © 2025 Desarrollado por José Fernando Garcia Quintero
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

      {/* BOTÓN FLOTANTE DE AYUDA 
      <a 
        href="tel:3121234567"
        className="fixed bottom-6 right-6 z-50 bg-green-500 hover:bg-green-600 text-white p-3 rounded-full shadow-xl shadow-green-200/50 transition-all hover:scale-105 flex items-center gap-2 group"
      >
        <Phone className="w-6 h-6" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-in-out whitespace-nowrap font-medium px-0 group-hover:px-2">
          ¿Ayuda? 312 123 4567
        </span>
      </a>*/}

    </div>
  );
}