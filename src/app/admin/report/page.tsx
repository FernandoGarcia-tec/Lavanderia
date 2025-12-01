"use client";

import { useEffect, useMemo, useState } from "react";
import { useFirestore } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { format, subDays } from 'date-fns';
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
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

const COLORS = ['#4F46E5', '#06B6D4', '#F97316', '#EF4444', '#10B981'];

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

  const [startDate, setStartDate] = useState<string>(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  const [auditData, setAuditData] = useState<any[]>([]);
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [servicesList, setServicesList] = useState<any[]>([]);
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [insights, setInsights] = useState<string[]>([]);

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchAll() {
    try {
      if (!firestore) return;
      // fetch current inventory and services (no date filter)
      const invSnap = await getDocs(collection(firestore, 'inventory'));
      const invItems: any[] = [];
      invSnap.forEach(d => invItems.push({ id: d.id, ...d.data() }));
      setInventoryList(invItems);

      const svcSnap = await getDocs(collection(firestore, 'services'));
      const svcs: any[] = [];
      svcSnap.forEach(d => svcs.push({ id: d.id, ...d.data() }));
      setServicesList(svcs);

      const ordSnap = await getDocs(collection(firestore, 'orders'));
      const ords: any[] = [];
      ordSnap.forEach(d => ords.push({ id: d.id, ...d.data() }));
      setOrdersList(ords);

      // fetch audit logs in date range
      await fetchAuditRange(startDate, endDate);
    } catch (e: any) {
      console.error('fetchAll error', e);
      toast({ title: 'Error', description: 'No se pudieron cargar los datos del reporte.' });
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
      toast({ title: 'Error', description: 'No se pudieron cargar los logs.' });
    }
  }

  function parseOrderDate(order: any) {
    if (!order) return null;
    if (order.fechaRecepcion && typeof order.fechaRecepcion.toDate === 'function') return order.fechaRecepcion.toDate();
    if (order.receivedAt && typeof order.receivedAt.toDate === 'function') return order.receivedAt.toDate();
    if (order.createdAt && typeof order.createdAt.toDate === 'function') return order.createdAt.toDate();
    if (order.fechaRecepcion instanceof Date) return order.fechaRecepcion;
    if (order.receivedAt instanceof Date) return order.receivedAt;
    if (order.createdAt instanceof Date) return order.createdAt;
    return null;
  }

  // Aggregations
  const actionsByDay = useMemo(() => {
    // produce array of { date: 'YYYY-MM-DD', creates: n, updates: n, deletes: n }
    const map: Record<string, any> = {};
    const s = new Date(startDate);
    const e = new Date(endDate);
    for (let d = toDateStart(s); d <= e; d.setDate(d.getDate()+1)) {
      const key = format(new Date(d), 'yyyy-MM-dd');
      map[key] = { date: key, create: 0, update: 0, delete: 0 };
    }
    auditData.forEach((a) => {
      const ts = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate() : (a.createdAt instanceof Date ? a.createdAt : null);
      const key = ts ? format(ts, 'yyyy-MM-dd') : 'unknown';
      if (!map[key]) map[key] = { date: key, create: 0, update: 0, delete: 0 };
      if (a.action && a.action.startsWith('create')) map[key].create += 1;
      else if (a.action && a.action.startsWith('update')) map[key].update += 1;
      else if (a.action && a.action.startsWith('delete')) map[key].delete += 1;
      else map[key].update += 1;
    });
    return Object.values(map);
  }, [auditData, startDate, endDate]);

  const actionsByResource = useMemo(() => {
    const counts: Record<string, number> = {};
    auditData.forEach(a => {
      const r = a.resource || 'unknown';
      counts[r] = (counts[r] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [auditData]);

  const servicesAddedByDay = useMemo(() => {
    const map: Record<string, number> = {};
    servicesList.forEach(svc => {
      const ts = svc.createdAt && svc.createdAt.toDate ? svc.createdAt.toDate() : null;
      const key = ts ? format(ts, 'yyyy-MM-dd') : 'unknown';
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).map(([date, count]) => ({ date, count }));
  }, [servicesList]);

  // New: ventas (ingresos) por día — usa campo montoTotal o suma de items.subtotal
  const salesByDay = useMemo(() => {
    const map: Record<string, number> = {};
    const s = new Date(startDate);
    const e = new Date(endDate);
    for (let d = toDateStart(s); d <= e; d.setDate(d.getDate()+1)) {
      const key = format(new Date(d), 'yyyy-MM-dd');
      map[key] = 0;
    }
    ordersList.forEach(order => {
      // try fechaRecepcion, createdAt or fallback to now
      const ts = order.fechaRecepcion && order.fechaRecepcion.toDate ? order.fechaRecepcion.toDate() : (order.createdAt && order.createdAt.toDate ? order.createdAt.toDate() : (order.fechaRecepcion instanceof Date ? order.fechaRecepcion : null));
      const key = ts ? format(ts, 'yyyy-MM-dd') : 'unknown';
      let total = 0;
      if (typeof order.montoTotal === 'number') total = order.montoTotal;
      else if (Array.isArray(order.items)) total = order.items.reduce((a: number, it: any) => a + (Number(it.subtotal) || (Number(it.cantidad || 0) * Number(it.precioUnitario || 0))), 0);
      map[key] = (map[key] || 0) + (total || 0);
    });
    return Object.entries(map).map(([date, total]) => ({ date, total }));
  }, [ordersList, startDate, endDate]);

  // New: distribución de servicios (más solicitados) — cuenta cantidad por servicio id/nombre
  const servicesDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    ordersList.forEach(order => {
      if (Array.isArray(order.items)) {
        order.items.forEach((it: any) => {
          const name = it.nombreServicio || it.idServicio || it.serviceName || 'unknown';
          const qty = Number(it.cantidad || it.quantity || 1) || 1;
          counts[name] = (counts[name] || 0) + qty;
        });
      }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [ordersList]);

  // New: tendencia de pedidos procesados por día (estatus 'listo' o 'entregado')
  const processedOrdersByDay = useMemo(() => {
    const map: Record<string, number> = {};
    const s = new Date(startDate);
    const e = new Date(endDate);
    for (let d = toDateStart(s); d <= e; d.setDate(d.getDate()+1)) {
      const key = format(new Date(d), 'yyyy-MM-dd');
      map[key] = 0;
    }
    const processedStatuses = ['listo', 'entregado'];
    ordersList.forEach(order => {
      if (!order.estatus) return;
      if (!processedStatuses.includes(order.estatus)) return;
      const ts = order.fechaRecepcion && order.fechaRecepcion.toDate ? order.fechaRecepcion.toDate() : (order.createdAt && order.createdAt.toDate ? order.createdAt.toDate() : (order.fechaRecepcion instanceof Date ? order.fechaRecepcion : null));
      const key = ts ? format(ts, 'yyyy-MM-dd') : 'unknown';
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).map(([date, count]) => ({ date, count }));
  }, [ordersList, startDate, endDate]);

  // Insights generation
  useEffect(() => {
    try {
      const s = toDateStart(new Date(startDate));
      const e = toDateEnd(new Date(endDate));
      const days = Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      const prevEnd = new Date(s.getTime() - 1);
      const prevStart = new Date(prevEnd.getTime() - (days - 1) * 24 * 60 * 60 * 1000);

      const filterOrdersInRange = (orders: any[], start: Date, end: Date) => orders.filter(o => {
        const d = parseOrderDate(o);
        if (!d) return false;
        return d >= start && d <= end;
      });

      const curOrders = filterOrdersInRange(ordersList, s, e);
      const prevOrders = filterOrdersInRange(ordersList, prevStart, prevEnd);

      const sumOrders = (orders: any[]) => orders.reduce((acc, o) => {
        if (typeof o.montoTotal === 'number') return acc + o.montoTotal;
        if (Array.isArray(o.items)) return acc + o.items.reduce((a: number, it: any) => a + (Number(it.subtotal) || (Number(it.cantidad || 0) * Number(it.precioUnitario || 0))), 0);
        return acc;
      }, 0);

      const totalCur = sumOrders(curOrders);
      const totalPrev = sumOrders(prevOrders);
      const pctChange = totalPrev === 0 ? (totalCur === 0 ? 0 : 100) : ((totalCur - totalPrev) / Math.abs(totalPrev)) * 100;

      // Top services current and previous
      const countServices = (orders: any[]) => {
        const m: Record<string, number> = {};
        orders.forEach(o => {
          if (!Array.isArray(o.items)) return;
          o.items.forEach((it: any) => {
            const name = it.nombreServicio || it.idServicio || it.serviceName || 'unknown';
            const qty = Number(it.cantidad || it.quantity || 1) || 1;
            m[name] = (m[name] || 0) + qty;
          });
        });
        return m;
      };

      const curSvc = countServices(curOrders);
      const prevSvc = countServices(prevOrders);

      const topCur = Object.entries(curSvc).sort((a, b) => b[1] - a[1])[0];
      const topPrev = Object.entries(prevSvc).sort((a, b) => b[1] - a[1])[0];

      const insightsArr: string[] = [];
      insightsArr.push(`Ventas totales en periodo: ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(totalCur)}`);
      insightsArr.push(`Cambio respecto al periodo anterior: ${pctChange.toFixed(1)}% (${totalPrev === 0 ? 'sin ventas previas' : (new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(totalPrev))})`);
      if (topCur) insightsArr.push(`Servicio más solicitado en el periodo: ${topCur[0]} (${topCur[1]} veces)`);
      if (topPrev) {
        const prevQty = prevSvc[topCur ? topCur[0] : topPrev[0]] || 0;
        const diff = (topCur ? topCur[1] - prevQty : 0);
        if (diff > 0) insightsArr.push(`El servicio ${topCur ? topCur[0] : topPrev[0]} aumentó su demanda en ${diff} respecto al periodo anterior.`);
      }

      setInsights(insightsArr);
    } catch (err) {
      console.error('insights error', err);
    }
  }, [ordersList, startDate, endDate]);

  // CSV export helpers
  function toCSV(rows: any[], columns: string[]) {
    const esc = (v: any) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      if (s.includes(',') || s.includes('\n') || s.includes('"')) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    const header = columns.join(',');
    const lines = rows.map(r => columns.map(c => esc(r[c])).join(','));
    return [header, ...lines].join('\n');
  }

  function downloadCSV(filename: string, csv: string) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportOrdersCSV() {
    const rows = ordersList.map(o => ({
      id: o.id || '',
      cliente: o.idCliente || o.clientId || '',
      fecha: parseOrderDate(o) ? format(parseOrderDate(o) as Date, 'yyyy-MM-dd HH:mm') : '',
      estatus: o.estatus || o.status || '',
      montoTotal: typeof o.montoTotal === 'number' ? o.montoTotal : (Array.isArray(o.items) ? o.items.reduce((a: number, it: any) => a + (Number(it.subtotal) || 0), 0) : 0),
      atendio: o.staffName || o.attendedBy || o.atendidoPor || '',
      atendioUid: o.staffUid || '',
      entrego: o.deliveredBy || '',
      entregoUid: o.deliveredByUid || '',
      entregadoEn: o.deliveredAt && typeof o.deliveredAt.toDate === 'function' ? format(o.deliveredAt.toDate(), 'yyyy-MM-dd HH:mm') : '',
      metodoPago: o.paymentMethod || '',
      items: JSON.stringify(o.items || []),
    }));
    const csv = toCSV(rows, ['id','cliente','fecha','estatus','montoTotal','metodoPago','atendio','atendioUid','entrego','entregoUid','entregadoEn','items']);
    downloadCSV(`ordenes_${startDate}_a_${endDate}.csv`, csv);
  }

  function exportInventoryCSV() {
    const rows = inventoryList.map(it => ({
      id: it.id || it.idInsumo || '',
      nombre: it.name || it.nombreInsumo || it.nombre || '',
      cantidad: it.quantity ?? it.stockActual ?? it.cantidad ?? 0,
      minimo: it.minThreshold ?? it.stockCritico ?? 0,
      unidad: it.unit || it.unidad || '',
      otros: JSON.stringify(it)
    }));
    const csv = toCSV(rows, ['id','nombre','cantidad','minimo','unidad','otros']);
    downloadCSV(`inventario_${startDate}_a_${endDate}.csv`, csv);
  }

  // Generate insights text with simple predictions
  function generateInsightsText() {
    try {
      const s = toDateStart(new Date(startDate));
      const e = toDateEnd(new Date(endDate));
      const days = Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);

      const filterOrdersInRange = (orders: any[], start: Date, end: Date) => orders.filter(o => {
        const d = parseOrderDate(o);
        if (!d) return false;
        return d >= start && d <= end;
      });

      const curOrders = filterOrdersInRange(ordersList, s, e);

      const sumOrders = (orders: any[]) => orders.reduce((acc, o) => {
        if (typeof o.montoTotal === 'number') return acc + o.montoTotal;
        if (Array.isArray(o.items)) return acc + o.items.reduce((a: number, it: any) => a + (Number(it.subtotal) || (Number(it.cantidad || 0) * Number(it.precioUnitario || 0))), 0);
        return acc;
      }, 0);

      const totalCur = sumOrders(curOrders);
      const avgPerDay = totalCur / days;
      const forecastNextPeriod = avgPerDay * days; // naive: assume same length

      const svcCounts: Record<string, number> = {};
      curOrders.forEach(o => {
        if (!Array.isArray(o.items)) return;
        o.items.forEach((it: any) => {
          const name = it.nombreServicio || it.idServicio || it.serviceName || 'unknown';
          const qty = Number(it.cantidad || it.quantity || 1) || 1;
          svcCounts[name] = (svcCounts[name] || 0) + qty;
        });
      });
      const topSvc = Object.entries(svcCounts).sort((a, b) => b[1] - a[1])[0];

      const lines: string[] = [];
      lines.push(`Reporte: ${startDate} a ${endDate}`);
      lines.push(`Ventas totales en el periodo: ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(totalCur)}`);
      lines.push(`Promedio diario estimado en el periodo: ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(avgPerDay)}`);
      lines.push(`Pronóstico (mismo número de días): ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(forecastNextPeriod)}`);
      if (topSvc) lines.push(`Producto/servicio más consumido en el periodo: ${topSvc[0]} (${topSvc[1]} unidades)`);

      const mostConsumed = topSvc ? `${topSvc[0]} (${topSvc[1]} unidades)` : 'N/A';
      lines.push(`Predicción: En base al promedio, se espera similar nivel de ventas; si la tendencia crece, el siguiente periodo podría superar ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(forecastNextPeriod)}.`);
      lines.push(`Producto con mayor consumo en el periodo: ${mostConsumed}`);

      if (insights && insights.length) {
        lines.push('Observaciones generadas:');
        insights.forEach(i => lines.push(`- ${i}`));
      }

      return lines.join('\n');
    } catch (err) {
      console.error('generateInsightsText error', err);
      return 'No se pudieron generar insights.';
    }
  }

  function exportInsightsTxt() {
    const text = generateInsightsText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `insights_${startDate}_a_${endDate}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportFullReport() {
    exportInsightsTxt();
    exportOrdersCSV();
    exportInventoryCSV();
  }

  const lowStockCount = useMemo(() => {
    return inventoryList.reduce((acc, it) => {
      const min = typeof it.minThreshold === 'number' ? it.minThreshold : parseFloat(it.minThreshold || '0');
      if ((Number(it.quantity) || 0) < (min || 0)) return acc + 1;
      return acc;
    }, 0);
  }, [inventoryList]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Reportes & Análisis</CardTitle>
          <CardDescription>Analiza actividad, servicios y estado de inventario.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 items-end">
            <div>
              <label className="text-sm">Desde</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm">Hasta</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <Button onClick={() => { fetchAuditRange(startDate, endDate); setInsights([]); }}>Aplicar</Button>
            <Button variant="secondary" onClick={() => exportOrdersCSV()} className="ml-2"><Download className="mr-2" />Exportar órdenes</Button>
            <Button variant="secondary" onClick={() => exportInventoryCSV()} className="ml-2"><Download className="mr-2" />Exportar inventario</Button>
            <Button variant="secondary" onClick={() => exportInsightsTxt()} className="ml-2"><Download className="mr-2" />Exportar insights</Button>
            <Button variant="ghost" onClick={() => exportFullReport()} className="ml-2">Exportar reporte completo</Button>
            <div className="ml-auto">Low stock: <strong>{lowStockCount}</strong></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Ventas (ingresos) por día</CardTitle>
              </CardHeader>
              <CardContent style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={salesByDay}>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(value))} />
                    <Bar dataKey="total" fill="#4F46E5" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribución de servicios (más solicitados)</CardTitle>
              </CardHeader>
              <CardContent style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={servicesDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {servicesDistribution.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Insights</CardTitle>
              <CardDescription>Observaciones automáticas basadas en el periodo seleccionado.</CardDescription>
            </CardHeader>
            <CardContent>
              {insights.length === 0 ? (
                <div className="text-sm text-muted-foreground">No hay insights aún. Ajusta el rango y haz clic en Aplicar.</div>
              ) : (
                <ul className="list-disc pl-5">
                  {insights.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Tendencia de pedidos procesados (por día)</CardTitle>
              </CardHeader>
              <CardContent style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={processedOrdersByDay}>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#06B6D4" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inventario — resumen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-2">Total artículos: <strong>{inventoryList.length}</strong> — Artículos bajo stock: <strong>{lowStockCount}</strong></div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm table-auto border-collapse">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2 pr-4">ID</th>
                        <th className="py-2 pr-4">Nombre</th>
                        <th className="py-2 pr-4">Cantidad</th>
                        <th className="py-2 pr-4">Mínimo</th>
                        <th className="py-2 pr-4">Unidad</th>
                        <th className="py-2 pr-4">Otros (JSON)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryList.map((it) => {
                        const id = it.id || it.idInsumo || it._id || '';
                        const name = it.name || it.nombreInsumo || it.nombre || it.nombreInsumo || it.nombreArticulo || '';
                        const quantity = it.quantity ?? it.stockActual ?? it.cantidad ?? it.stock ?? 0;
                        const min = it.minThreshold ?? it.stockCritico ?? it.stockMin ?? it.stockCritico ?? 0;
                        const unit = it.unit || it.unidad || it.unidadMedida || '';
                        const other = { ...it };
                        // remove displayed keys
                        delete other.id; delete other.idInsumo; delete other._id; delete other.name; delete other.nombreInsumo; delete other.nombre; delete other.quantity; delete other.stockActual; delete other.cantidad; delete other.minThreshold; delete other.stockCritico; delete other.unit; delete other.unidad; delete other.unidadMedida;
                        return (
                          <tr key={id || Math.random()} className="border-b">
                            <td className="py-2 pr-4 align-top">{id}</td>
                            <td className="py-2 pr-4 align-top">{name}</td>
                            <td className="py-2 pr-4 align-top">{quantity}</td>
                            <td className="py-2 pr-4 align-top">{min}</td>
                            <td className="py-2 pr-4 align-top">{unit}</td>
                            <td className="py-2 pr-4 align-top"><pre className="text-xs max-h-24 overflow-auto">{JSON.stringify(other, null, 2)}</pre></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
