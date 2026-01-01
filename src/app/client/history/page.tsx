"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Search, 
  Calendar, 
  Package, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Filter,
  Shirt
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth, useFirestore } from '@/firebase/provider';
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

// --- COMPONENTES UI AUXILIARES ---

const AnimatedBubbles = () => (
    <div className="bubbles absolute inset-0 pointer-events-none overflow-hidden select-none">
      {Array.from({ length: 10 }).map((_, i) => {
        const hash = (i * 2654435761) % 4294967296;
        const randomX = (hash % 80) + 10;
        const randomDelay = -((hash % 200) / 10);
        const randomDuration = 20 + (hash % 15);
        return (
          <span
            key={i}
            className="absolute bg-white/10 rounded-full animate-float bottom-[-50px]"
            style={{
              left: `${randomX}%`,
              animationDelay: `${randomDelay}s`,
              animationDuration: `${randomDuration}s`,
              width: `${15 + (hash % 15)}px`,
              height: `${15 + (hash % 15)}px`,
              animation: `float ${randomDuration}s linear infinite`,
            }}
          />
        );
      })}
      <style jsx>{`
        @keyframes float {
            0% { transform: translateY(0) rotate(0deg); opacity: 0; }
            10% { opacity: 0.3; }
            90% { opacity: 0.1; }
            100% { transform: translateY(-40vh) rotate(360deg); opacity: 0; }
        }
      `}</style>
    </div>
);

export default function HistoryPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, completed, pending

  // Cargar historial
  useEffect(() => {
    if (!firestore || !auth?.currentUser) return;

    const q = query(
        collection(firestore, 'orders'),
        where('userId', '==', auth.currentUser.uid),
        orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
        const items: any[] = [];
        snap.forEach(doc => {
            items.push({ id: doc.id, ...doc.data() });
        });
        setOrders(items);
        setLoading(false);
    }, (err) => {
        console.error("Error fetching history:", err);
        setLoading(false);
    });

    return () => unsub();
  }, [firestore, auth]);

  // Filtrado
  const filteredOrders = useMemo(() => {
      return orders.filter(order => {
          const matchesSearch = (order.serviceName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                (order.id || '').toLowerCase().includes(searchQuery.toLowerCase());
          
          if (statusFilter === 'all') return matchesSearch;
          if (statusFilter === 'completed') return matchesSearch && (order.status === 'entregado' || order.status === 'completado');
          if (statusFilter === 'pending') return matchesSearch && (order.status !== 'entregado' && order.status !== 'completado' && order.status !== 'cancelado');
          
          return matchesSearch;
      });
  }, [orders, searchQuery, statusFilter]);

  // Helpers de formato
  const formatOrderDate = (date: any) => {
      if (!date) return '-';
      try {
          return format(date.toDate(), "d 'de' MMM, yyyy", { locale: es });
      } catch (e) {
          return '-';
      }
  };

  const getStatusColor = (status: string) => {
      switch (status) {
          case 'entregado': return 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200';
          case 'completado': return 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200';
          case 'en_progreso': return 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200 border-cyan-200';
          case 'pendiente': return 'bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200';
          case 'cancelado': return 'bg-red-100 text-red-700 hover:bg-red-200 border-red-200';
          default: return 'bg-slate-100 text-slate-700 border-slate-200';
      }
  };

  const getStatusLabel = (status: string) => {
      return (status || 'Desconocido').replace(/_/g, ' ');
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-body">
      
      {/* HEADER SIMPLE */}
      <header className="sticky top-0 z-50 w-full bg-white/80 shadow-sm backdrop-blur-sm border-b border-white/20">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Button variant="ghost" onClick={() => router.push('/client')} className="text-slate-600 hover:text-cyan-700 hover:bg-cyan-50 -ml-2">
            <ArrowLeft className="mr-2 h-5 w-5" /> Volver al Inicio
          </Button>
          <span className="font-headline font-bold text-slate-800">Historial</span>
          <div className="w-10"></div> {/* Spacer */}
        </div>
      </header>

      <main className="flex-1 pb-20">
        
        {/* HERO PEQUEÑO */}
        <section className="relative pt-6 pb-16 px-4 overflow-hidden bg-gradient-to-br from-cyan-600 via-sky-500 to-blue-600 rounded-b-[40px] shadow-lg mb-8">
            <AnimatedBubbles />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
            
            <div className="relative z-10 container mx-auto max-w-2xl text-center text-white space-y-2">
                <h1 className="font-headline text-3xl font-bold drop-shadow-md">Tus Servicios</h1>
                <p className="text-cyan-50 text-sm">Consulta el registro de todas tus órdenes pasadas y actuales.</p>
            </div>
        </section>

        {/* CONTENIDO PRINCIPAL */}
        <section className="container mx-auto px-4 -mt-10 relative z-20 max-w-3xl space-y-6">
            
            {/* BARRA DE FILTROS */}
            <div className="bg-white p-3 rounded-2xl shadow-md border border-slate-100 flex flex-col sm:flex-row gap-3 items-center">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                        placeholder="Buscar por servicio o ID..." 
                        className="pl-9 h-10 rounded-xl border-slate-200 bg-slate-50 focus:bg-white"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                     <Button 
                        variant={statusFilter === 'all' ? 'default' : 'outline'} 
                        size="sm" 
                        onClick={() => setStatusFilter('all')}
                        className={cn("rounded-lg", statusFilter === 'all' ? "bg-cyan-600 hover:bg-cyan-700" : "text-slate-500")}
                     >
                        Todos
                     </Button>
                     <Button 
                        variant={statusFilter === 'pending' ? 'default' : 'outline'} 
                        size="sm" 
                        onClick={() => setStatusFilter('pending')}
                        className={cn("rounded-lg", statusFilter === 'pending' ? "bg-orange-500 hover:bg-orange-600" : "text-slate-500")}
                     >
                        Activos
                     </Button>
                     <Button 
                        variant={statusFilter === 'completed' ? 'default' : 'outline'} 
                        size="sm" 
                        onClick={() => setStatusFilter('completed')}
                        className={cn("rounded-lg", statusFilter === 'completed' ? "bg-green-600 hover:bg-green-700" : "text-slate-500")}
                     >
                        Históricos
                     </Button>
                </div>
            </div>

            {/* LISTA DE PEDIDOS */}
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-12 text-slate-400 bg-white rounded-2xl shadow-sm border border-slate-100">
                        <div className="animate-pulse space-y-3">
                            <div className="h-4 bg-slate-200 rounded w-1/3 mx-auto"></div>
                            <div className="h-4 bg-slate-200 rounded w-1/4 mx-auto"></div>
                        </div>
                        <p className="mt-4 text-xs">Cargando historial...</p>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="text-center py-16 px-4 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
                        <div className="bg-slate-50 p-4 rounded-full mb-4">
                            <Package className="h-8 w-8 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700">No se encontraron pedidos</h3>
                        <p className="text-slate-400 text-sm mt-1 max-w-xs">No tienes registros que coincidan con tu búsqueda o filtros.</p>
                        {statusFilter !== 'all' && (
                            <Button variant="link" onClick={() => setStatusFilter('all')} className="text-cyan-600 mt-2">
                                Ver todos
                            </Button>
                        )}
                    </div>
                ) : (
                    filteredOrders.map((order) => (
                        <Card key={order.id} className="shadow-sm border-slate-200 hover:shadow-md transition-shadow rounded-2xl overflow-hidden group">
                            <div className="flex flex-col sm:flex-row">
                                {/* Estado y Fecha (Izquierda/Arriba) */}
                                <div className="bg-slate-50 p-4 sm:w-40 flex flex-row sm:flex-col items-center sm:items-start justify-between sm:justify-center gap-2 border-b sm:border-b-0 sm:border-r border-slate-100">
                                    <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                                        <Calendar className="h-3.5 w-3.5" />
                                        <span>{formatOrderDate(order.createdAt)}</span>
                                    </div>
                                    <Badge variant="outline" className={cn("capitalize border", getStatusColor(order.status))}>
                                        {getStatusLabel(order.status)}
                                    </Badge>
                                </div>

                                {/* Detalles (Centro/Derecha) */}
                                <div className="p-4 flex-1 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-slate-800 text-base">
                                                {order.serviceName || 'Varios Servicios'}
                                            </h4>
                                            {/* Si hay items detallados, mostrar cuántos */}
                                            {order.items?.length > 1 && (
                                                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-slate-100 text-slate-500">
                                                    +{order.items.length - 1} más
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 font-mono">ID: #{order.id.slice(0,8).toUpperCase()}</p>
                                        
                                        {/* Detalle rápido de items si existen */}
                                        {order.items && order.items.length > 0 && (
                                            <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                                                {order.items.map((i:any) => i.serviceName).join(', ')}
                                            </p>
                                        )}
                                    </div>

                                    <div className="text-left sm:text-right w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 flex flex-row sm:flex-col justify-between items-center sm:items-end">
                                        <div>
                                            <p className="text-xs text-slate-400 mb-0.5">Total</p>
                                            {order.estimatedTotal > 0 ? (
                                                <p className="text-lg font-bold text-cyan-700">${Number(order.estimatedTotal).toFixed(2)}</p>
                                            ) : (
                                                <p className="text-sm font-medium text-slate-400 italic">Por definir</p>
                                            )}
                                        </div>
                                        {order.paymentStatus === 'pagado' && (
                                            <div className="flex items-center gap-1 text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full mt-1">
                                                <CheckCircle2 className="h-3 w-3" /> Pagado
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

        </section>
      </main>
    </div>
  );
}