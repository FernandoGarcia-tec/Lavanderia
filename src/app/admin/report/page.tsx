"use client";

import { useEffect, useMemo, useState } from "react";
import { useFirestore } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  AreaChart
} from 'recharts';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardDescription, 
  CardFooter 
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  Download, 
  BarChart as BarChartIcon, 
  PieChart as PieChartIcon, 
  TrendingUp, 
  Calendar as CalendarIcon,
  Search,
  DollarSign,
  Package,
  FileText,
  Check
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Colores para gráficos
const COLORS = ['#0891b2', '#0ea5e9', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#ec4899'];

// Funciones de ayuda para fechas
function toDateStart(d: Date) {
  const t = new Date(d);
  t.setHours(0,0,0,0);
  return t;
}

function toDateEnd(d: Date) {
  const t = new Date(d);
  t.setHours(23,59,59,999);
  return t;
}

export default function ReportsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  // Estado de fechas (últimos 30 días por defecto)
  const [startDate, setStartDate] = useState<string>(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  // Estado de datos
  const [loading, setLoading] = useState(true);
  const [auditData, setAuditData] = useState<any[]>([]);
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [servicesList, setServicesList] = useState<any[]>([]);
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [insights, setInsights] = useState<string[]>([]);

  // Carga inicial
  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      if (!firestore) return;
      
      // 1. Inventario actual
      const invSnap = await getDocs(collection(firestore, 'inventory'));
      const invItems: any[] = [];
      invSnap.forEach(d => invItems.push({ id: d.id, ...d.data() }));
      setInventoryList(invItems);

      // 2. Servicios
      const svcSnap = await getDocs(collection(firestore, 'services'));
      const svcs: any[] = [];
      svcSnap.forEach(d => svcs.push({ id: d.id, ...d.data() }));
      setServicesList(svcs);

      // 3. Órdenes (Todas - filtrar luego en memoria para flexibilidad)
      // En producción con muchos datos, esto debería ser una query con rango de fechas
      const ordSnap = await getDocs(collection(firestore, 'orders'));
      const ords: any[] = [];
      ordSnap.forEach(d => ords.push({ id: d.id, ...d.data() }));
      setOrdersList(ords);

      // 4. Logs de auditoría (Rango de fechas seleccionado)
      await fetchAuditRange(startDate, endDate);
      
    } catch (e: any) {
      console.error('fetchAll error', e);
      toast({ title: 'Error', description: 'No se pudieron cargar los datos.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function fetchAuditRange(start: string, end: string) {
    try {
      const s = toDateStart(new Date(start));
      const e = toDateEnd(new Date(end));
      const q = query(
        collection(firestore, 'audit_logs'),
        where('createdAt', '>=', Timestamp.fromDate(s)),
        where('createdAt', '<=', Timestamp.fromDate(e)),
        orderBy('createdAt', 'asc')
      );
      const snap = await getDocs(q);
      const items: any[] = [];
      snap.forEach(d => items.push({ id: d.id, ...d.data() }));
      setAuditData(items);
    } catch (e: any) {
      console.error('fetchAuditRange error', e);
      // Fallback silencioso si falla por índices faltantes en dev
    }
  }

  // --- Helpers de Procesamiento ---

  function parseOrderDate(order: any) {
    if (!order) return null;
    // Prioridad: Fecha de recepción -> Fecha de creación
    if (order.receivedAt?.toDate) return order.receivedAt.toDate();
    if (order.createdAt?.toDate) return order.createdAt.toDate();
    if (order.fechaRecepcion?.toDate) return order.fechaRecepcion.toDate();
    
    // Fallback para fechas string o Date directo
    if (order.receivedAt instanceof Date) return order.receivedAt;
    if (order.createdAt instanceof Date) return order.createdAt;
    
    return null;
  }

  // Filtrar órdenes por el rango de fechas seleccionado
  const filteredOrders = useMemo(() => {
    const s = toDateStart(new Date(startDate));
    const e = toDateEnd(new Date(endDate));
    return ordersList.filter(o => {
        const d = parseOrderDate(o);
        return d && d >= s && d <= e;
    });
  }, [ordersList, startDate, endDate]);

  // --- Métricas Calculadas ---

  // 1. Ventas por Día (Gráfico de Barras/Área)
  const salesByDay = useMemo(() => {
    const map: Record<string, number> = {};
    const s = new Date(startDate);
    const e = new Date(endDate);
    
    // Inicializar días con 0
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        map[format(d, 'yyyy-MM-dd')] = 0;
    }

    filteredOrders.forEach(order => {
        const d = parseOrderDate(order);
        if (!d) return;
        const key = format(d, 'yyyy-MM-dd');
        
        let total = 0;
        if (typeof order.estimatedTotal === 'number') total = order.estimatedTotal;
        else if (typeof order.montoTotal === 'number') total = order.montoTotal;
        
        if (map[key] !== undefined) {
            map[key] += total;
        }
    });

    return Object.entries(map).map(([date, total]) => ({ 
        date, 
        displayDate: format(new Date(date + 'T00:00:00'), 'dd MMM', { locale: es }),
        total 
    }));
  }, [filteredOrders, startDate, endDate]);

  // 2. Distribución de Servicios (Gráfico de Pastel)
  const servicesDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    
    filteredOrders.forEach(order => {
      // Si tiene items desglosados
      if (Array.isArray(order.items) && order.items.length > 0) {
        order.items.forEach((it: any) => {
          const name = it.serviceName || it.nombreServicio || 'Otros';
          const qty = Number(it.quantity || it.cantidad || 1);
          counts[name] = (counts[name] || 0) + qty;
        });
      } else {
        // Si es un pedido simple sin items
        const name = order.serviceName || 'Servicio General';
        const qty = Number(order.quantity || 1);
        counts[name] = (counts[name] || 0) + qty;
      }
    });

    return Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6); // Top 6
  }, [filteredOrders]);

  // 3. KPIs Generales
  const kpis = useMemo(() => {
      const totalSales = filteredOrders.reduce((acc, o) => acc + (Number(o.estimatedTotal || o.montoTotal || 0)), 0);
      const totalOrders = filteredOrders.length;
      const avgTicket = totalOrders > 0 ? totalSales / totalOrders : 0;
      const completedOrders = filteredOrders.filter(o => o.status === 'entregado' || o.status === 'completado').length;
      
      return { totalSales, totalOrders, avgTicket, completedOrders };
  }, [filteredOrders]);

  // 4. Inventario Bajo (Para alerta visual)
  const lowStockCount = useMemo(() => {
    return inventoryList.reduce((acc, it) => {
      const min = Number(it.minThreshold || 10);
      const qty = Number(it.quantity ?? it.stock ?? 0);
      return qty <= min ? acc + 1 : acc;
    }, 0);
  }, [inventoryList]);

  // 5. Generar Insights (Texto)
  useEffect(() => {
    const lines = [];
    lines.push(`En el periodo seleccionado (${startDate} a ${endDate}), se registraron ${kpis.totalOrders} pedidos.`);
    lines.push(`Los ingresos totales ascienden a ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(kpis.totalSales)}.`);
    
    if (servicesDistribution.length > 0) {
        const topService = servicesDistribution[0];
        lines.push(`El servicio más solicitado fue "${topService.name}" con ${topService.value} unidades/kg.`);
    }

    if (lowStockCount > 0) {
        lines.push(`Atención: Hay ${lowStockCount} artículos de inventario con stock bajo o agotado.`);
    }

    setInsights(lines);
  }, [kpis, servicesDistribution, lowStockCount, startDate, endDate]);


  // --- Exportación CSV ---
  function toCSV(rows: any[], columns: string[]) {
    const header = columns.join(',');
    const lines = rows.map(r => columns.map(c => {
        const val = String(r[c] ?? '').replace(/"/g, '""');
        return `"${val}"`;
    }).join(','));
    return [header, ...lines].join('\n');
  }

  function downloadCSV(filename: string, csv: string) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  }

  function exportOrders() {
    const rows = filteredOrders.map(o => ({
        ID: o.id,
        Cliente: o.clientName || 'Anónimo',
        Fecha: o.createdAt?.toDate ? format(o.createdAt.toDate(), 'yyyy-MM-dd HH:mm') : '',
        Servicio: o.serviceName || 'Varios',
        Total: o.estimatedTotal || 0,
        Estado: o.status,
        Pago: o.paymentStatus || 'pendiente'
    }));
    const csv = toCSV(rows, ['ID', 'Cliente', 'Fecha', 'Servicio', 'Total', 'Estado', 'Pago']);
    downloadCSV(`Reporte_Ventas_${startDate}_${endDate}.csv`, csv);
  }

  // --- Componentes UI ---

  const StatCard = ({ title, value, icon: Icon, colorClass }: any) => (
      <Card className="border-0 shadow-md">
          <CardContent className="p-6 flex items-center justify-between">
              <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
                  <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
              </div>
              <div className={`p-3 rounded-xl ${colorClass}`}>
                  <Icon className="w-6 h-6" />
              </div>
          </CardContent>
      </Card>
  );

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden font-sans p-4 md:p-8">
      
      {/* Fondo superior */}
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
                    <BarChartIcon className="h-8 w-8 text-white" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight drop-shadow-sm">Reportes y Análisis</h1>
                    <p className="text-cyan-50 opacity-90">Métricas de rendimiento y exportación de datos</p>
                </div>
            </div>
            
            {/* Filtros de Fecha */}
            <Card className="border-0 bg-white/10 backdrop-blur-md text-white p-1.5 flex flex-col sm:flex-row gap-2 rounded-xl shadow-inner">
                <div className="flex items-center gap-2 px-2">
                    <CalendarIcon className="w-4 h-4 text-cyan-200" />
                    <span className="text-sm font-medium">Periodo:</span>
                </div>
                <div className="flex items-center gap-2">
                    <Input 
                        type="date" 
                        value={startDate} 
                        onChange={(e) => setStartDate(e.target.value)} 
                        className="h-8 w-36 bg-white/90 text-slate-800 border-0 rounded-lg text-xs"
                    />
                    <span className="text-xs">a</span>
                    <Input 
                        type="date" 
                        value={endDate} 
                        onChange={(e) => setEndDate(e.target.value)} 
                        className="h-8 w-36 bg-white/90 text-slate-800 border-0 rounded-lg text-xs"
                    />
                    <Button 
                        size="sm" 
                        onClick={() => fetchAuditRange(startDate, endDate)}
                        className="h-8 bg-cyan-600 hover:bg-cyan-500 text-white border-0"
                    >
                        <Search className="w-3 h-3" />
                    </Button>
                </div>
            </Card>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard 
                title="Ventas Totales" 
                value={`$${kpis.totalSales.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`} 
                icon={DollarSign} 
                colorClass="bg-green-100 text-green-600" 
            />
            <StatCard 
                title="Pedidos Registrados" 
                value={kpis.totalOrders} 
                icon={Package} 
                colorClass="bg-blue-100 text-blue-600" 
            />
            <StatCard 
                title="Ticket Promedio" 
                value={`$${kpis.avgTicket.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`} 
                icon={TrendingUp} 
                colorClass="bg-purple-100 text-purple-600" 
            />
            <StatCard 
                title="Pedidos Completados" 
                value={kpis.completedOrders} 
                icon={Check} 
                colorClass="bg-orange-100 text-orange-600" 
            />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            
            {/* Gráfico de Ventas (Area Chart) */}
            <Card className="lg:col-span-2 shadow-lg border-0 rounded-3xl overflow-hidden">
                <CardHeader className="bg-white border-b border-slate-100 pb-4">
                    <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-cyan-600" />
                        Ingresos por Día
                    </CardTitle>
                    <CardDescription>Comportamiento de ventas en el periodo seleccionado.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={salesByDay}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0891b2" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#0891b2" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis 
                                    dataKey="displayDate" 
                                    tickLine={false} 
                                    axisLine={false} 
                                    tick={{fill: '#64748b', fontSize: 12}} 
                                    minTickGap={30}
                                />
                                <YAxis 
                                    tickLine={false} 
                                    axisLine={false} 
                                    tick={{fill: '#64748b', fontSize: 12}}
                                    tickFormatter={(val) => `$${val}`}
                                />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Venta']}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="total" 
                                    stroke="#0891b2" 
                                    fillOpacity={1} 
                                    fill="url(#colorSales)" 
                                    strokeWidth={3}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Gráfico de Distribución (Pie Chart) */}
            <Card className="shadow-lg border-0 rounded-3xl overflow-hidden">
                <CardHeader className="bg-white border-b border-slate-100 pb-4">
                    <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                        <PieChartIcon className="h-5 w-5 text-cyan-600" />
                        Top Servicios
                    </CardTitle>
                    <CardDescription>Distribución de los servicios más solicitados.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={servicesDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {servicesDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend layout="horizontal" verticalAlign="bottom" align="center" iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Sección Inferior: Insights y Exportación */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Insights Automáticos */}
            <Card className="lg:col-span-2 shadow-md border-0 rounded-3xl">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-amber-500" />
                        Insights del Periodo
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                        {insights.length > 0 ? (
                            insights.map((insight, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                                    <span className="text-cyan-500 mt-1">•</span>
                                    <p>{insight}</p>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-slate-400 italic">No hay datos suficientes para generar insights.</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Acciones de Exportación */}
            <Card className="shadow-md border-0 rounded-3xl bg-slate-900 text-white">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Exportar Datos</CardTitle>
                    <CardDescription className="text-slate-400">Descarga reportes en formato CSV.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                    <Button 
                        variant="secondary" 
                        className="w-full justify-start bg-white/10 hover:bg-white/20 text-white border-0 h-12"
                        onClick={exportOrders}
                    >
                        <Download className="mr-3 h-5 w-5" /> Reporte de Ventas
                    </Button>
                    {/* Botones adicionales pueden ir aquí */}
                </CardContent>
            </Card>
        </div>

      </div>
    </div>
  );
}