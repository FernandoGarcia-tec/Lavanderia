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
  Tooltip as RechartsTooltip, // Renombrado para evitar conflicto
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
  Check,
  FileSpreadsheet,
  ArrowRight,
  Info // Icono para indicar ayuda visual
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"; // Importación del Tooltip de UI

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


  // --- Exportación CSV Profesional ---
  
  function downloadCSV(filename: string, csvContent: string) {
    // Agregar BOM para que Excel reconozca UTF-8 (acentos y ñ)
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportFullReport() {
    // A. PREPARAR DATOS
    
    // 1. Logs de Agotamiento de Inventario
    const depletionLogs = auditData.filter(log => log.action === 'inventory-depletion' || log.action === 'update' && log.after?.stock === 0);
    
    // 2. Mapeo de última fecha de agotamiento por producto
    const lastDepletionMap: Record<string, string> = {};
    depletionLogs.forEach(log => {
        if (log.resourceId) {
            const date = log.createdAt?.toDate ? format(log.createdAt.toDate(), 'dd/MM/yyyy HH:mm') : '-';
            lastDepletionMap[log.resourceId] = date;
        }
    });

    // 3. Filas de Inventario con fechas
    const inventoryRows = inventoryList.map(item => {
        const qty = Number(item.quantity ?? item.stock ?? 0);
        const min = Number(item.minThreshold ?? 0);
        let status = 'OK';
        if (qty === 0) status = 'AGOTADO';
        else if (qty <= min) status = 'BAJO';

        const lastDepletion = lastDepletionMap[item.id] || 'N/A';
        
        return [
            clean(item.name),
            clean(item.category || 'General'),
            qty,
            min,
            clean(item.unit || 'kg'),
            clean(status),
            clean(lastDepletion)
        ];
    });

    // 4. Filas de Órdenes
    const orderRows = filteredOrders.map(o => {
        const dateStr = parseOrderDate(o) ? format(parseOrderDate(o) as Date, 'yyyy-MM-dd HH:mm') : '-';
        const amount = Number(o.estimatedTotal || o.montoTotal || 0).toFixed(2);
        
        const details = o.items && o.items.length > 0 
            ? o.items.map((i: any) => `${i.serviceName} (x${i.quantity})`).join('; ')
            : `${o.quantity || 1} ${o.unit || ''}`;

        return [
            clean(o.id.slice(0, 8).toUpperCase()),
            clean(o.clientName || 'Anónimo'),
            clean(dateStr),
            clean(o.serviceName || 'Varios'),
            clean(details),
            amount,
            clean((o.status || '').toUpperCase()),
            clean((o.paymentStatus || 'pendiente').toUpperCase())
        ];
    });

    // B. CONSTRUCCIÓN DEL CSV UNIFICADO

    const csvLines = [];

    csvLines.push(["LAVANDERÍA ANGY - REPORTE GERENCIAL INTEGRAL"]);
    csvLines.push([`Generado el: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`]);
    csvLines.push([`Periodo analizado: ${format(new Date(startDate), 'dd/MM/yyyy')} al ${format(new Date(endDate), 'dd/MM/yyyy')}`]);
    csvLines.push([]); 

    csvLines.push(["--- RESUMEN EJECUTIVO ---"]);
    csvLines.push(["Indicador", "Valor"]);
    csvLines.push([`Ventas Totales`, `$${kpis.totalSales.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`]);
    csvLines.push([`Total Pedidos`, `${kpis.totalOrders}`]);
    csvLines.push([`Ticket Promedio`, `$${kpis.avgTicket.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`]);
    csvLines.push([`Alertas de Inventario`, `${lowStockCount}`]);
    csvLines.push([]);
    csvLines.push([]);

    csvLines.push(["--- DETALLE DE VENTAS (ORDENES) ---"]);
    csvLines.push(['ID PEDIDO', 'CLIENTE', 'FECHA CONSUMO', 'SERVICIO', 'DETALLE', 'MONTO', 'ESTADO', 'PAGO']);
    orderRows.forEach(row => csvLines.push(row));
    csvLines.push([]);
    csvLines.push([]);

    csvLines.push(["--- ESTADO DE INVENTARIO Y FECHAS CRÍTICAS ---"]);
    csvLines.push(['PRODUCTO', 'CATEGORÍA', 'STOCK ACTUAL', 'STOCK MÍNIMO', 'UNIDAD', 'ESTADO', 'ÚLTIMO AGOTAMIENTO']);
    inventoryRows.forEach(row => csvLines.push(row));
    csvLines.push([]);
    csvLines.push([]);

    // Historial de Agotamientos (simplificado) - si se necesita más detalle de usuarios, se requeriría cargar la colección de users como en el otro archivo, pero para mantenerlo simple usamos el email del log.
    csvLines.push(["--- HISTORIAL DE AGOTAMIENTOS (AUDITORÍA) ---"]);
    csvLines.push(['FECHA Y HORA', 'PRODUCTO (ID)', 'ACCIÓN', 'USUARIO RESPONSABLE']);
    if (depletionLogs.length === 0) {
        csvLines.push(["Sin registros de agotamiento en este periodo."]);
    } else {
        depletionLogs.forEach(log => {
            const date = log.createdAt?.toDate ? format(log.createdAt.toDate(), 'yyyy-MM-dd HH:mm') : '-';
            const prodName = inventoryList.find(i => i.id === log.resourceId)?.name || log.resourceId;
            csvLines.push([
                clean(date),
                clean(prodName),
                "AGOTADO (Stock llegó a 0)",
                clean(log.actorEmail || 'Sistema')
            ]);
        });
    }

    const csvContent = csvLines.map(row => row.join(',')).join('\n');
    downloadCSV(`Reporte_Integral_${format(new Date(), 'yyyyMMdd')}.csv`, csvContent);
  }

  // Helper para limpiar strings en CSV
  const clean = (val: any) => {
    const str = String(val || '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // --- Componentes UI ---

  const StatCard = ({ title, value, icon: Icon, colorClass, description }: any) => (
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Card className="border-0 shadow-md hover:shadow-lg transition-all cursor-help hover:-translate-y-1">
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
          </TooltipTrigger>
          <TooltipContent className="bg-slate-800 text-white border-0 shadow-xl rounded-xl p-3 max-w-xs">
            <p className="text-sm leading-relaxed">{description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
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
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8 text-white">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner ring-2 ring-white/10">
                    <BarChartIcon className="h-8 w-8 text-white" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight drop-shadow-sm">Reportes y Análisis</h1>
                    <p className="text-cyan-50 opacity-90 font-medium">Métricas clave y exportación de datos</p>
                </div>
            </div>
            
            {/* Filtros de Fecha */}
            <div className="bg-white/95 backdrop-blur-sm p-1.5 rounded-2xl shadow-lg border border-white/20 flex flex-col sm:flex-row items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl">
                    <CalendarIcon className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Rango</span>
                </div>
                <div className="flex items-center gap-2 px-2">
                    <div className="relative">
                        <Input 
                            type="date" 
                            value={startDate} 
                            onChange={(e) => setStartDate(e.target.value)} 
                            className="h-9 w-36 bg-transparent border-slate-200 rounded-lg text-sm focus:bg-white transition-colors text-black"
                        />
                    </div>
                    <span className="text-slate-400 font-medium">➔</span>
                    <div className="relative">
                        <Input 
                            type="date" 
                            value={endDate} 
                            onChange={(e) => setEndDate(e.target.value)} 
                            className="h-9 w-36 bg-transparent border-slate-200 rounded-lg text-sm focus:bg-white transition-colors text-black"
                        />
                    </div>
                    <Button 
                        size="sm" 
                        onClick={() => fetchAuditRange(startDate, endDate)}
                        className="h-9 w-9 p-0 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white border-0"
                    >
                        <Search className="w-3 h-3" />
                    </Button>
                </div>
            </div>
        </div>

        {/* KPIs con Tooltips */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard 
                title="Ventas Totales" 
                value={`$${kpis.totalSales.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`} 
                icon={DollarSign} 
                colorClass="bg-green-100 text-green-600" 
                description="Suma total de los ingresos generados por pedidos en el periodo seleccionado (incluye pedidos pagados y pendientes)."
            />
            <StatCard 
                title="Pedidos Registrados" 
                value={kpis.totalOrders} 
                icon={Package} 
                colorClass="bg-blue-100 text-blue-600" 
                description="Número total de órdenes recibidas en el sistema durante el rango de fechas, sin importar su estado actual."
            />
            <StatCard 
                title="Ticket Promedio" 
                value={`$${kpis.avgTicket.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`} 
                icon={TrendingUp} 
                colorClass="bg-purple-100 text-purple-600" 
                description="Valor promedio de venta por cliente. Se calcula dividiendo las Ventas Totales entre el número de Pedidos Registrados."
            />
            <StatCard 
                title="Pedidos Completados" 
                value={kpis.completedOrders} 
                icon={Check} 
                colorClass="bg-orange-100 text-orange-600" 
                description="Cantidad de órdenes que han sido marcadas como 'Listas para entrega' o 'Entregadas' exitosamente en este periodo."
            />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            
            {/* Gráfico de Ventas */}
            <Card className="lg:col-span-2 shadow-lg border-0 rounded-3xl overflow-hidden bg-white/90 backdrop-blur-sm">
                <CardHeader className="border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-cyan-50 rounded-lg">
                            <TrendingUp className="h-5 w-5 text-cyan-600" />
                        </div>
                        <div>
                            <CardTitle className="text-lg text-slate-800">Evolución de Ingresos</CardTitle>
                            <CardDescription>Tendencia diaria de ventas en el periodo seleccionado.</CardDescription>
                        </div>
                    </div>
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
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="displayDate" 
                                    tickLine={false} 
                                    axisLine={false} 
                                    tick={{fill: '#64748b', fontSize: 12, fontWeight: 500}} 
                                    minTickGap={30}
                                    dy={10}
                                />
                                <YAxis 
                                    tickLine={false} 
                                    axisLine={false} 
                                    tick={{fill: '#64748b', fontSize: 12, fontWeight: 500}}
                                    tickFormatter={(val) => `$${val}`}
                                    dx={-10}
                                />
                                <RechartsTooltip 
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Venta']}
                                    labelStyle={{ color: '#64748b', marginBottom: '4px' }}
                                    cursor={{ stroke: '#0891b2', strokeWidth: 1, strokeDasharray: '4 4' }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="total" 
                                    stroke="#0891b2" 
                                    strokeWidth={3}
                                    fillOpacity={1} 
                                    fill="url(#colorSales)" 
                                    animationDuration={1500}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Gráfico de Distribución */}
            <Card className="shadow-lg border-0 rounded-3xl overflow-hidden bg-white/90 backdrop-blur-sm">
                <CardHeader className="border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-50 rounded-lg">
                            <PieChartIcon className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <CardTitle className="text-lg text-slate-800">Top Servicios</CardTitle>
                            <CardDescription>Lo más solicitado por tus clientes.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6 flex flex-col items-center justify-center">
                    <div className="h-[250px] w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={servicesDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={85}
                                    paddingAngle={5}
                                    dataKey="value"
                                    cornerRadius={6}
                                >
                                    {servicesDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                    ))}
                                </Pie>
                                <RechartsTooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ fontWeight: 'bold' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-3xl font-bold text-slate-800">{servicesDistribution.reduce((a,b)=>a+b.value,0)}</span>
                            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total</span>
                        </div>
                    </div>
                    <div className="w-full mt-4 space-y-2">
                        {servicesDistribution.slice(0, 3).map((entry, index) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                    <span className="text-slate-600 font-medium truncate max-w-[120px]">{entry.name}</span>
                                </div>
                                <span className="font-bold text-slate-800">{entry.value}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Sección Inferior */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Insights */}
            <Card className="lg:col-span-2 shadow-md border-0 rounded-3xl bg-white">
                <CardHeader className="pb-3 border-b border-slate-50">
                    <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                        <FileText className="h-5 w-5 text-amber-500" />
                        Resumen Inteligente
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                    <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100/50 space-y-3">
                        {insights.length > 0 ? (
                            insights.map((insight, idx) => (
                                <div key={idx} className="flex items-start gap-3 text-sm text-slate-700">
                                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                                    <p className="leading-relaxed">{insight}</p>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                                <Search className="h-8 w-8 mb-2 opacity-20" />
                                <p className="text-sm">No hay suficientes datos para generar insights en este periodo.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Exportar */}
            <Card className="shadow-lg border-0 rounded-3xl bg-slate-900 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />
                
                <CardHeader className="pb-2 relative z-10">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Download className="h-5 w-5 text-cyan-400" />
                        Exportar Datos
                    </CardTitle>
                    <CardDescription className="text-slate-400">Descarga el reporte unificado en formato CSV para Excel.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-4 relative z-10">
                    <Button 
                        variant="secondary" 
                        className="w-full justify-start bg-white/10 hover:bg-white/20 text-white border-0 h-14 rounded-xl transition-all group"
                        onClick={exportFullReport}
                    >
                        <div className="bg-cyan-500/20 p-2 rounded-lg mr-3 group-hover:bg-cyan-500/30 transition-colors">
                            <FileSpreadsheet className="h-5 w-5 text-cyan-300" /> 
                        </div>
                        <div className="flex flex-col items-start text-left">
                            <span className="text-sm font-bold text-white">Reporte Gerencial Completo</span>
                            <span className="text-[10px] text-slate-300 opacity-80">Incluye ventas, inventario y alertas</span>
                        </div>
                        <ArrowRight className="ml-auto h-4 w-4 text-slate-500 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </Button>
                </CardContent>
            </Card>
        </div>

      </div>
    </div>
  );
}