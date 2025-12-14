"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { 
  ArrowRight, 
  Check, 
  X, 
  DollarSign, 
  Users, 
  Package, 
  AlertTriangle,
  TrendingUp,
  Activity
} from "lucide-react";
import { format, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useEffect, useState, useMemo } from 'react';
import { useFirestore, useAuth } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { collection, query, where, onSnapshot, updateDoc, doc, getDocs, orderBy, limit } from 'firebase/firestore';
import { Progress } from "@/components/ui/progress";

export default function AdminDashboard() {
  const firestore = useFirestore();
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    income: 0,
    pendingUsers: 0,
    lowStock: 0,
    activeOrders: 0
  });

  // 1. Cargar Métricas y Gráfico
  useEffect(() => {
    if (!firestore) return;

    const loadDashboardData = async () => {
      try {
        // A. Calcular Ingresos Mensuales (Últimos 6 meses)
        const ordersRef = collection(firestore, 'orders');
        const ordersSnap = await getDocs(ordersRef); // En prod: usar query por fecha
        
        const map: Record<string, number> = {};
        const today = new Date();
        
        // Inicializar últimos 6 meses
        for (let i = 5; i >= 0; i--) {
          const d = subMonths(today, i);
          const key = format(d, 'yyyy-MM');
          map[key] = 0;
        }

        let totalIncomeMonth = 0;
        let activeOrdersCount = 0;
        const currentMonthKey = format(today, 'yyyy-MM');

        ordersSnap.forEach(doc => {
          const o = doc.data();
          // Fecha: Priorizar fecha de recepción, luego creación
          const dRaw = o.receivedAt?.toDate ? o.receivedAt.toDate() : (o.createdAt?.toDate ? o.createdAt.toDate() : null);
          
          if (o.status !== 'entregado' && o.status !== 'cancelado') {
             activeOrdersCount++;
          }

          if (!dRaw) return;
          const key = format(dRaw, 'yyyy-MM');
          const amount = Number(o.estimatedTotal || 0);

          if (map[key] !== undefined) {
            map[key] += amount;
          }
          
          if (key === currentMonthKey) {
            totalIncomeMonth += amount;
          }
        });

        const chartData = Object.entries(map).map(([month, total]) => {
           // Convertir '2023-10' a 'Oct'
           const [y, m] = month.split('-');
           const dateObj = new Date(parseInt(y), parseInt(m) - 1);
           return {
             name: format(dateObj, 'MMM', { locale: es }), // Ene, Feb...
             fullDate: month,
             total: total
           };
        });

        setMonthlyData(chartData);
        setStats(prev => ({ ...prev, income: totalIncomeMonth, activeOrders: activeOrdersCount }));

      } catch (err) {
        console.error("Error loading dashboard data", err);
      }
    };

    loadDashboardData();
  }, [firestore]);

  // 2. Suscripción en tiempo real a Inventario (Alertas)
  useEffect(() => {
    if (!firestore) return;
    const q = query(collection(firestore, 'inventory')); // Optimizar en prod: where('stock', '<=', 'minThreshold') no es directo sin guardar minThreshold
    const unsub = onSnapshot(q, (snap) => {
      let count = 0;
      snap.forEach(doc => {
        const d = doc.data();
        const qty = Number(d.quantity ?? d.stock ?? 0);
        const min = Number(d.minThreshold ?? 10);
        if (qty <= min) count++;
      });
      setStats(prev => ({ ...prev, lowStock: count }));
    });
    return () => unsub();
  }, [firestore]);

  // 3. Suscripción a Usuarios Pendientes
  useEffect(() => {
    if (!firestore) return;
    const q = query(collection(firestore, 'users'), where('status', '==', 'pendiente'));
    const unsub = onSnapshot(q, (snap) => {
      setStats(prev => ({ ...prev, pendingUsers: snap.size }));
    });
    return () => unsub();
  }, [firestore]);

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden font-sans p-4 md:p-8">
      {/* Fondo Decorativo */}
      <div className="absolute top-0 left-0 w-full h-[40vh] bg-gradient-to-br from-cyan-600 via-sky-500 to-blue-600 rounded-b-[50px] shadow-lg overflow-hidden z-0">
        <div className="absolute top-10 left-10 w-24 h-24 bg-white/10 rounded-full blur-xl animate-pulse" />
        <div className="absolute top-20 right-20 w-32 h-32 bg-cyan-200/20 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 left-1/3 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 text-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner ring-2 ring-white/10">
                <Activity className="h-8 w-8 text-white" />
            </div>
            <div>
                <h1 className="text-3xl font-bold tracking-tight drop-shadow-sm">Panel de Administración</h1>
                <p className="text-cyan-50 opacity-90">Resumen general y métricas clave.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm" asChild>
                <Link href="/admin/report">Ver Reportes Completos</Link>
            </Button>
          </div>
        </div>

        {/* Métricas Principales (KPIs) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard 
                title="Ingresos (Mes)" 
                value={`$${stats.income.toLocaleString()}`} 
                icon={DollarSign} 
                color="green" 
                trend="+12% vs mes anterior"
            />
            <StatCard 
                title="Pedidos Activos" 
                value={stats.activeOrders} 
                icon={Package} 
                color="blue" 
                trend="En proceso"
            />
            <StatCard 
                title="Usuarios Pendientes" 
                value={stats.pendingUsers} 
                icon={Users} 
                color="orange" 
                trend="Requieren aprobación"
            />
            <StatCard 
                title="Alertas de Stock" 
                value={stats.lowStock} 
                icon={AlertTriangle} 
                color="red" 
                trend="Insumos bajos"
            />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          
          {/* Gráfico Principal */}
          <div className="space-y-6 lg:col-span-2">
            <Card className="shadow-xl border-0 rounded-3xl overflow-hidden">
              <CardHeader className="bg-white border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl text-slate-800">Tendencia de Ingresos</CardTitle>
                        <CardDescription>Comportamiento de ventas de los últimos 6 meses</CardDescription>
                    </div>
                    <div className="p-2 bg-cyan-50 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-cyan-600" />
                    </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData}>
                      <defs>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0891b2" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#0891b2" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="name" 
                        tickLine={false} 
                        axisLine={false} 
                        tickMargin={10} 
                        tick={{fill: '#64748b', fontSize: 12}}
                      />
                      <YAxis 
                        tickLine={false} 
                        axisLine={false} 
                        tickMargin={10} 
                        tick={{fill: '#64748b', fontSize: 12}}
                        tickFormatter={(value) => `$${value}`}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ color: '#0e7490', fontWeight: 'bold' }}
                        formatter={(value: number) => [`$${value.toLocaleString()}`, "Ingresos"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="total"
                        stroke="#0891b2"
                        strokeWidth={3}
                        fill="url(#colorIncome)"
                        animationDuration={1500}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Aprobaciones Pendientes */}
            <Card className="shadow-lg border-0 rounded-3xl overflow-hidden">
                <CardHeader className="bg-white border-b border-slate-100">
                    <CardTitle className="text-lg text-slate-800">Solicitudes de Registro</CardTitle>
                    <CardDescription>Clientes nuevos esperando aprobación.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <PendingList />
                </CardContent>
                <CardFooter className="bg-slate-50 border-t border-slate-100 p-4">
                    <Button variant="ghost" className="w-full text-cyan-700 hover:text-cyan-800 hover:bg-cyan-50" asChild>
                        <Link href="/admin/users">Ver todos los usuarios <ArrowRight className="ml-2 h-4 w-4" /></Link>
                    </Button>
                </CardFooter>
            </Card>
          </div>

          {/* Columna Derecha: Alertas */}
          <div className="space-y-6">
            <Card className="shadow-lg border-0 rounded-3xl overflow-hidden h-full flex flex-col">
              <CardHeader className="bg-white border-b border-slate-100">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-slate-800">Inventario Crítico</CardTitle>
                    <Badge variant="destructive" className="px-2 py-0.5">{stats.lowStock}</Badge>
                </div>
                <CardDescription>Insumos que requieren reposición inmediata.</CardDescription>
              </CardHeader>
              <CardContent className="p-0 flex-1">
                <StockAlerts />
              </CardContent>
              <CardFooter className="bg-slate-50 border-t border-slate-100 p-4">
                <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-md" asChild>
                    <Link href="/admin/inventory">Gestionar Inventario</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Componentes Auxiliares ---

function StatCard({ title, value, icon: Icon, color, trend }: any) {
    const colorClasses: Record<string, string> = {
        green: "bg-green-100 text-green-600",
        blue: "bg-blue-100 text-blue-600",
        orange: "bg-orange-100 text-orange-600",
        red: "bg-red-100 text-red-600"
    };

    return (
        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow rounded-2xl overflow-hidden">
            <CardContent className="p-5">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
                        <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
                    </div>
                    <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
                        <Icon className="w-5 h-5" />
                    </div>
                </div>
                <div className="mt-4 flex items-center text-xs">
                    <span className="text-slate-400 font-medium">{trend}</span>
                </div>
            </CardContent>
        </Card>
    );
}

function PendingList() {
  const firestore = useFirestore();
  const [pending, setPending] = useState<Array<any>>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (!firestore) return;
    const q = query(collection(firestore, 'users'), where('status', '==', 'pendiente'), limit(5));
    const unsub = onSnapshot(q, (snap) => {
      const items: any[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      setPending(items);
    });
    return () => unsub();
  }, [firestore]);

  const handleAction = async (uid: string, newStatus: string) => {
      try {
          await updateDoc(doc(firestore, 'users', uid), { status: newStatus });
          toast({ title: newStatus === 'aprobado' ? "Usuario Aprobado" : "Usuario Rechazado", description: "Se ha actualizado el estado." });
      } catch (e) {
          toast({ title: "Error", description: "No se pudo actualizar.", variant: "destructive" });
      }
  };

  if (pending.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <Check className="w-10 h-10 mb-2 opacity-20" />
              <p className="text-sm">Todo al día. No hay solicitudes pendientes.</p>
          </div>
      );
  }

  return (
    <div className="divide-y divide-slate-50">
      {pending.map((client) => (
        <div key={client.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-slate-100">
              <AvatarImage src={client.avatar || ''} />
              <AvatarFallback className="bg-orange-100 text-orange-700 font-bold">
                  {(client.name || client.email || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-slate-800 text-sm">{client.name || 'Sin nombre'}</p>
              <p className="text-xs text-slate-500">{client.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => handleAction(client.id, 'aprobado')} className="h-8 px-3 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm">
              Aprobar
            </Button>
            <Button size="icon" variant="ghost" onClick={() => handleAction(client.id, 'rechazado')} className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function StockAlerts() {
  const firestore = useFirestore();
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    if (!firestore) return;
    const q = collection(firestore, 'inventory');
    const unsub = onSnapshot(q, (snap) => {
      const items: any[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      const low = items.filter(it => {
        const qty = Number(it.quantity ?? it.stock ?? 0);
        const min = Number(it.minThreshold ?? 10);
        return qty <= min;
      });
      setAlerts(low.slice(0, 6)); // Mostrar solo los primeros 6
    });
    return () => unsub();
  }, [firestore]);

  if (alerts.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <Package className="w-10 h-10 mb-2 opacity-20" />
              <p className="text-sm">Inventario en buen estado.</p>
          </div>
      );
  }

  return (
    <div className="divide-y divide-slate-50">
      {alerts.map(item => {
          const qty = Number(item.quantity ?? item.stock ?? 0);
          const min = Number(item.minThreshold ?? 10);
          const percent = Math.min(100, (qty / (min * 2)) * 100); // Visual bar logic
          const isCritical = qty === 0;

          return (
            <div key={item.id} className="p-4 hover:bg-red-50/30 transition-colors">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    {isCritical ? <AlertTriangle className="h-4 w-4 text-red-500" /> : <Package className="h-4 w-4 text-orange-400" />}
                    <p className="font-medium text-slate-800 text-sm">{item.name}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isCritical ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                    {qty} / {min}
                </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div 
                    className={`h-full rounded-full ${isCritical ? 'bg-red-500' : 'bg-orange-400'}`} 
                    style={{ width: `${percent}%` }} 
                />
            </div>
            </div>
          );
      })}
    </div>
  );
}