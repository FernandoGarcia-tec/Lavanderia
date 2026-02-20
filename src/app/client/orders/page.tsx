"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { 
  User, 
  Shirt, 
  Clock, 
  Package, 
  Truck, 
  CheckCircle2, 
  Loader2,
  CalendarDays,
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth, useFirestore } from '@/firebase/provider';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/notification-bell";

// --- ICONOS DECORATIVOS ---
const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
);
const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 1.4 3.3 4.4 3.3 4.4s-1.4 1.4-2.8 2.1c-1.1 1.1-2.2 2.3-3.8 3.2s-3.6 1.6-5.4 1.6c-1.8 0-3.6-.6-5.4-1.6s-3-2.1-3.8-3.2c-1.4-.7-2.8-2.1-2.8-2.1s1.7-3 3.3-4.4C4.7 6.1 4 4 4 4s1.1.7 2.2 1.4c1.1.7 2.2 1.1 3.3 1.1s2.2-.4 3.3-1.1c1.1-.7 2.2-1.4 2.2-1.4" /></svg>
);
const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>
);

// --- FONDO ANIMADO ---
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

// --- MAPEO DE ESTADOS DEL PEDIDO ---
const statusSteps = {
  'pendiente': 1,
  'recolectado': 2,
  'en_proceso': 2, 
  'lavando': 2,
  'en_progreso': 2,
  'listo': 3,
  'en_ruta': 3,
  'completado': 3,
  'entregado': 4
};

const statusLabels: Record<string, string> = {
    'pendiente': 'Esperando Recolección',
    'en_proceso': 'En Lavado',
    'en_progreso': 'En Proceso',
    'listo': 'Listo para Entrega',
    'completado': 'Listo para Entrega',
    'entregado': 'Entregado'
};

export default function MyOrdersPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  
  const [latestOrder, setLatestOrder] = useState<any>(null);
  const [loadingOrder, setLoadingOrder] = useState(true);

  const userInitial = (auth?.currentUser?.email || "U").charAt(0).toUpperCase();
  const userName = auth?.currentUser?.displayName || auth?.currentUser?.email?.split('@')[0] || 'Cliente';

  async function handleSignOut() {
    if (!auth) return;
    await signOut(auth);
    router.push('/');
  }

  // Cargar el último pedido activo del usuario
  useEffect(() => {
    if (!firestore) {
      console.log('Firestore no disponible');
      setLoadingOrder(false);
      return;
    }
    
    const currentUser = auth?.currentUser;
    if (!currentUser) {
      console.log('Usuario no autenticado');
      setLoadingOrder(false);
      return;
    }

    let isMounted = true;
    let unsubUserId: (() => void) | null = null;
    let unsubClientId: (() => void) | null = null;
    let userIdOrders = new Map<string, any>();
    let clientIdOrders = new Map<string, any>();

    const rebuild = () => {
      if (!isMounted) return;
      const merged = new Map<string, any>([...clientIdOrders, ...userIdOrders]);
      const orders = Array.from(merged.values());
      orders.sort((a: any, b: any) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
      setLatestOrder(orders[0] || null);
      setLoadingOrder(false);
    };

    const subscribe = async () => {
      const uid = currentUser.uid;
      console.log('Buscando pedidos para usuario:', uid);

      const qByUserId = query(
        collection(firestore, 'orders'),
        where('userId', '==', uid)
      );

      unsubUserId = onSnapshot(qByUserId, (snap) => {
        userIdOrders = new Map();
        snap.docs.forEach(doc => userIdOrders.set(doc.id, { id: doc.id, ...doc.data() }));
        rebuild();
      }, (error) => {
        console.error('Error al cargar pedidos por userId:', error);
        setLoadingOrder(false);
      });

      let userDocId: string | null = null;
      try {
        const userSnap = await getDocs(query(
          collection(firestore, 'users'),
          where('authUid', '==', uid)
        ));
        if (!userSnap.empty) {
          userDocId = userSnap.docs[0].id;
        }
      } catch (error) {
        console.error('Error al resolver usuario:', error);
      }

      if (userDocId) {
        const qByClientId = query(
          collection(firestore, 'orders'),
          where('clientId', '==', userDocId)
        );

        unsubClientId = onSnapshot(qByClientId, (snap) => {
          clientIdOrders = new Map();
          snap.docs.forEach(doc => clientIdOrders.set(doc.id, { id: doc.id, ...doc.data() }));
          rebuild();
        }, (error) => {
          console.error('Error al cargar pedidos por clientId:', error);
          setLoadingOrder(false);
        });
      } else {
        rebuild();
      }
    };

    subscribe();

    return () => {
      isMounted = false;
      if (unsubUserId) unsubUserId();
      if (unsubClientId) unsubClientId();
    };
  }, [firestore, auth?.currentUser?.uid]);

  // Determinar paso actual del progreso
  const currentStep = latestOrder ? (statusSteps[latestOrder.status as keyof typeof statusSteps] || 1) : 0;
  const statusLabel = latestOrder ? (statusLabels[latestOrder.status as string] || 'Procesando') : '';

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-body">
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full bg-white/80 shadow-sm backdrop-blur-sm border-b border-white/20">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/client/" className="font-headline text-lg font-bold text-gray-800 flex items-center gap-2">
             <div className="bg-cyan-600 rounded-lg p-1.5"><Shirt className="h-5 w-5 text-white" /></div>
             <span className="hidden sm:inline">Lavandería Angy</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/client/schedule" className="text-sm font-medium text-gray-600 transition-colors hover:text-cyan-600">
              Solicitar servicio
            </Link>
            <Link href="/client/orders" className="text-sm font-medium text-cyan-700 bg-cyan-50 px-3 py-1.5 rounded-full transition-colors">
              Mi Ropa
            </Link>
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded-full border border-slate-200 transition-colors pr-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={auth?.currentUser?.photoURL || undefined} />
                    <AvatarFallback className="bg-cyan-100 text-cyan-700 text-xs font-bold">{userInitial}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium text-gray-700 truncate max-w-[100px]">{userName}</span>
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
        
        {/* HERO PEQUEÑO */}
        <section className="relative pt-8 pb-20 px-4 overflow-hidden bg-gradient-to-br from-cyan-600 via-sky-500 to-blue-600 rounded-b-[40px] shadow-lg mb-8">
            <AnimatedBubbles />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
            
            <div className="relative z-10 container mx-auto max-w-4xl text-center text-white space-y-2">
                <h1 className="font-headline text-3xl font-bold drop-shadow-md">Seguimiento de Pedido</h1>
                <p className="text-cyan-50">Consulta el estado actual de tu ropa en tiempo real.</p>
            </div>
        </section>

        {/* CONTENIDO PRINCIPAL */}
        <section className="container mx-auto px-4 -mt-16 relative z-20 max-w-4xl space-y-6">
            
            <div className="flex justify-start mb-4">
                <Button variant="ghost" onClick={() => router.push('/client')} className="text-white hover:text-white hover:bg-white/20">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Inicio
                </Button>
            </div>

            {loadingOrder ? (
                <Card className="shadow-xl border-0 rounded-2xl p-12 flex flex-col items-center justify-center min-h-[300px]">
                    <Loader2 className="h-12 w-12 text-cyan-500 animate-spin mb-4" />
                    <p className="text-slate-500">Localizando tu ropa...</p>
                </Card>
            ) : latestOrder ? (
                // TARJETA DE PROGRESO DE SERVICIO
                <Card className="shadow-xl border-0 rounded-2xl overflow-hidden bg-white animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <CardHeader className="bg-slate-50/80 border-b border-slate-100 pb-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <CardTitle className="text-xl text-slate-800 flex items-center gap-2">
                                    {latestOrder.serviceName || 'Varios Servicios'}
                                </CardTitle>
                                <CardDescription className="flex items-center gap-2 mt-1">
                                    <span className="font-mono bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-xs">#{latestOrder.id.slice(0,8).toUpperCase()}</span>
                                    <span>•</span>
                                    <span>{format(latestOrder.createdAt.toDate(), "d 'de' MMMM, yyyy", {locale: es})}</span>
                                </CardDescription>
                            </div>
                            <Badge variant={latestOrder.status === 'entregado' ? 'secondary' : 'default'} className="text-sm px-4 py-1.5 capitalize bg-cyan-600 hover:bg-cyan-700 shadow-md">
                                {statusLabel}
                            </Badge>
                        </div>
                    </CardHeader>
                    
                    <CardContent className="p-8">
                        {/* BARRA DE PROGRESO VISUAL */}
                        <div className="relative py-10 px-2 md:px-10 mb-8">
                            {/* Línea de fondo */}
                            <div className="absolute top-1/2 left-4 right-4 h-1.5 bg-slate-100 -translate-y-1/2 rounded-full hidden md:block"></div>
                            {/* Línea de progreso */}
                            <div 
                                className="absolute top-1/2 left-4 h-1.5 bg-cyan-500 -translate-y-1/2 rounded-full transition-all duration-1000 ease-out hidden md:block"
                                style={{ width: `${Math.min(100, ((currentStep - 1) / 3) * 100)}%`, maxWidth: 'calc(100% - 2rem)' }}
                            ></div>

                            <div className="flex flex-col md:flex-row justify-between gap-8 md:gap-0 relative z-10">
                                {/* Paso 1: Solicitado */}
                                <div className={`flex flex-row md:flex-col items-center gap-4 md:gap-4 transition-all ${currentStep >= 1 ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center border-4 shrink-0 transition-all duration-500 ${currentStep >= 1 ? 'bg-cyan-500 border-cyan-100 text-white shadow-lg shadow-cyan-200 scale-110' : 'bg-white border-slate-200 text-slate-300'}`}>
                                        <Clock className="w-6 h-6" />
                                    </div>
                                    <div className="text-left md:text-center">
                                        <p className="font-bold text-slate-700 text-base">Solicitado</p>
                                        <p className="text-xs text-slate-400 hidden md:block mt-1">
                                            {latestOrder.createdAt?.toDate ? format(latestOrder.createdAt.toDate(), 'HH:mm aaa', {locale: es}) : '-'}
                                        </p>
                                    </div>
                                </div>

                                {/* Paso 2: En Proceso */}
                                <div className={`flex flex-row md:flex-col items-center gap-4 md:gap-4 transition-all ${currentStep >= 2 ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center border-4 shrink-0 transition-all duration-500 ${currentStep >= 2 ? 'bg-cyan-500 border-cyan-100 text-white shadow-lg shadow-cyan-200 scale-110' : 'bg-white border-slate-200 text-slate-300'}`}>
                                        <Package className="w-6 h-6" />
                                    </div>
                                    <div className="text-left md:text-center">
                                        <p className="font-bold text-slate-700 text-base">En Proceso</p>
                                        <p className="text-xs text-slate-400 hidden md:block mt-1">Lavando y planchando</p>
                                    </div>
                                </div>

                                {/* Paso 3: Listo / Ruta */}
                                <div className={`flex flex-row md:flex-col items-center gap-4 md:gap-4 transition-all ${currentStep >= 3 ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center border-4 shrink-0 transition-all duration-500 ${currentStep >= 3 ? 'bg-cyan-500 border-cyan-100 text-white shadow-lg shadow-cyan-200 scale-110' : 'bg-white border-slate-200 text-slate-300'}`}>
                                        <Truck className="w-6 h-6" />
                                    </div>
                                    <div className="text-left md:text-center">
                                        <p className="font-bold text-slate-700 text-base">Listo</p>
                                        <p className="text-xs text-slate-400 hidden md:block mt-1">Tu ropa esta lista</p>
                                    </div>
                                </div>

                                {/* Paso 4: Entregado */}
                                <div className={`flex flex-row md:flex-col items-center gap-4 md:gap-4 transition-all ${currentStep >= 4 ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center border-4 shrink-0 transition-all duration-500 ${currentStep >= 4 ? 'bg-green-500 border-green-100 text-white shadow-lg shadow-green-200 scale-110' : 'bg-white border-slate-200 text-slate-300'}`}>
                                        <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                    <div className="text-left md:text-center">
                                        <p className="font-bold text-slate-700 text-base">Entregado</p>
                                        <p className="text-xs text-slate-400 hidden md:block mt-1">¡Gracias por tu preferencia!</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* DETALLES DE ENTREGA */}
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col md:flex-row gap-6 justify-between">
                             <div className="space-y-4">
                                 <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Datos de Entrega</h4>
                                 <div className="space-y-3">
                                      <div className="flex items-start gap-3 text-sm text-slate-700">
                                          <CalendarDays className="w-5 h-5 text-cyan-600 mt-0.5" />
                                          <div>
                                              <p className="font-medium">Fecha Programada</p>
                                              <p className="text-slate-500">
                                                  {latestOrder.deliveryDate?.toDate ? format(latestOrder.deliveryDate.toDate(), 'PPP', {locale: es}) : latestOrder.date || 'Pendiente'}
                                              </p>
                                          </div>
                                      </div>
                                      <div className="flex items-start gap-3 text-sm text-slate-700">
                                          <Clock className="w-5 h-5 text-cyan-600 mt-0.5" />
                                          <div>
                                              <p className="font-medium">Hora Estimada</p>
                                              <p className="text-slate-500">{latestOrder.deliveryTimeStr || latestOrder.time || 'Pendiente'}</p>
                                          </div>
                                      </div>
                                 </div>
                             </div>

                             {/* Resumen de Costos */}
                             <div className="md:text-right space-y-4 md:w-1/3">
                                 <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Resumen</h4>
                                 <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                      {latestOrder.estimatedTotal > 0 ? (
                                        <>
                                          <div className="flex justify-between items-center mb-1">
                                            <span className="text-sm text-slate-600">Total a Pagar</span>
                                          </div>
                                          <p className="text-3xl font-bold text-cyan-700">${Number(latestOrder.estimatedTotal).toFixed(2)}</p>
                                          {(() => {
                                            const isPayOnPickup = latestOrder.paymentMethod === 'pagar_al_retiro';
                                            const isPaid = latestOrder.paymentStatus === 'pagado' || !isPayOnPickup;
                                            return (
                                              <Badge
                                                variant="outline"
                                                className={`mt-2 ${isPaid ? 'text-green-600 border-green-200 bg-green-50' : 'text-amber-600 border-amber-200 bg-amber-50'}`}
                                              >
                                                {isPaid ? 'Pagado' : 'Pago Pendiente'}
                                              </Badge>
                                            );
                                          })()}
                                        </>
                                      ) : (
                                        <div className="text-center py-2">
                                          <p className="text-sm font-medium text-slate-600">Total por definir</p>
                                          <p className="text-xs text-slate-400 mt-1">El personal calculará el costo al recibir tus prendas.</p>
                                        </div>
                                      )}
                                 </div>
                             </div>
                        </div>

                    </CardContent>
                    
                    <CardFooter className="bg-slate-50/50 p-6 border-t border-slate-100 flex justify-center">
                        {latestOrder.status === 'entregado' ? (
                            <Button className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl shadow-lg w-full md:w-auto h-12 px-8 text-lg" asChild>
                                <Link href="/client/schedule">Solicitar Nuevo Servicio</Link>
                            </Button>
                        ) : (
                            <p className="text-sm text-slate-400 text-center">
                                Si tienes dudas sobre tu pedido, contáctanos al <a href="tel:3121061790" className="text-cyan-600 hover:underline font-medium">312 106 1790</a>.
                            </p>
                        )}
                    </CardFooter>
                </Card>
            ) : (
                // --- ESTADO SIN PEDIDOS ---
                <Card className="shadow-lg border-0 rounded-2xl p-12 text-center bg-white animate-in zoom-in-95">
                    <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Package className="w-12 h-12 text-slate-300" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">No tienes pedidos activos</h3>
                    <p className="text-slate-500 mb-8 max-w-md mx-auto">
                        Tu historial de pedidos activos está vacío. ¿Tienes ropa que necesita cuidado?
                    </p>
                    <Button asChild size="lg" className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl shadow-lg px-8 h-12 text-lg">
                        <Link href="/client/schedule">
                            Agendar Servicio
                        </Link>
                    </Button>
                </Card>
            )}

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
    </div>
  );
}