
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
import { ArrowRight, Check, X } from "lucide-react";
import { stockAlerts, servicesChartData } from "@/lib/placeholder-data";
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { PlaceHolderImages } from "@/lib/placeholder-images";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useEffect, useState } from 'react';
import { useFirestore, useAuth } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';

export default function AdminDashboard() {
  const chartConfig = {
    services: {
      label: "Servicios",
      color: "hsl(var(--primary))",
    },
  };

  const firestore = useFirestore();
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [alertCount, setAlertCount] = useState<number>(0);

  // Subscribe to inventory to compute alert count for header badge
  useEffect(() => {
    if (!firestore) return;
    const q = collection(firestore, 'inventory');
    const unsub = onSnapshot(q, (snap: any) => {
      const items: any[] = [];
      snap.forEach((d: any) => items.push({ id: d.id, ...d.data() }));
      const low = items.filter(it => {
        const qty = Number(it.quantity ?? it.stockActual ?? it.cantidad ?? it.stock ?? 0);
        const min = Number(it.minThreshold ?? it.stockCritico ?? it.stockMin ?? 0);
        return qty < min;
      });
      setAlertCount(low.length);
    });
    return () => unsub();
  }, [firestore]);

  useEffect(() => {
    let mounted = true;
    async function loadMonthly() {
      try {
        // build last 6 months keys
        const months: string[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = subMonths(new Date(), i);
          months.push(format(d, 'yyyy-MM'));
        }

        const snap = await (await import('firebase/firestore')).getDocs((0 as any).collection ? (0 as any).collection : (collection as any));
      } catch (e) {
        // fallback — will fetch below using firestore normally
      }
      try {
        if (!firestore) return;
        const { collection, getDocs } = await import('firebase/firestore');
        const snap = await getDocs(collection(firestore, 'orders'));
        const orders: any[] = [];
        snap.forEach(d => orders.push({ id: d.id, ...d.data() }));

        const map: Record<string, number> = {};
        for (let i = 5; i >= 0; i--) {
          const d = subMonths(new Date(), i);
          const key = format(d, 'yyyy-MM');
          map[key] = 0;
        }

        orders.forEach(o => {
          const dRaw = o.fechaRecepcion && o.fechaRecepcion.toDate ? o.fechaRecepcion.toDate() : (o.createdAt && o.createdAt.toDate ? o.createdAt.toDate() : null);
          if (!dRaw) return;
          const key = format(dRaw, 'yyyy-MM');
          const monto = typeof o.montoTotal === 'number' ? o.montoTotal : (Array.isArray(o.items) ? o.items.reduce((a: number, it: any) => a + (Number(it.subtotal) || 0), 0) : 0);
          if (map[key] !== undefined) map[key] += monto;
        });

        const data = Object.entries(map).map(([month, total]) => ({ month, sales: total }));
        if (mounted) setMonthlyData(data);
      } catch (err) {
        console.error('loadMonthly error', err);
      }
    }
    loadMonthly();
    return () => { mounted = false; };
  }, [firestore]);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Informe Mensual de Servicios</CardTitle>
            <CardDescription>
              Resumen de los servicios prestados en los últimos 6 meses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <ResponsiveContainer>
                <AreaChart data={monthlyData.length ? monthlyData : servicesChartData}>
                  <defs>
                    <linearGradient id="colorServices" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                  <Tooltip
                    cursor={{
                      stroke: "hsl(var(--primary))",
                      strokeWidth: 2,
                      radius: 4,
                    }}
                    content={<ChartTooltipContent />}
                  />
                  <Area
                    dataKey={monthlyData.length ? "sales" : "services"}
                    type="monotone"
                    fill="url(#colorServices)"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Aprobaciones de Nuevos Clientes</CardTitle>
            <CardDescription>
              Revisa y aprueba los registros de nuevos clientes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <PendingList />
          </CardContent>
           <CardFooter>
            <Button variant="outline" className="w-full" asChild>
                <Link href="/admin/users">
                Gestionar todos los usuarios <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
              <div className="flex items-center justify-between w-full">
                <CardTitle className="font-headline">Alertas de Stock Crítico</CardTitle>
                <div>
                  <span className="text-sm text-muted-foreground mr-2">Alertas</span>
                  <span><Badge variant="destructive">{alertCount}</Badge></span>
                </div>
              </div>
            <CardDescription>
              Artículos que han caído por debajo del umbral de stock.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <StockAlerts />
          </CardContent>
          <CardFooter>
             <Button variant="outline" className="w-full" asChild>
                <Link href="/admin/inventory">
                Gestionar Inventario <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

function PendingList() {
  const firestore = useFirestore();
  const auth = useAuth();
  const [pending, setPending] = useState<Array<any>>([]);

  useEffect(() => {
    const q = query(collection(firestore, 'users'), where('status', '==', 'pendiente'));
    const unsub = onSnapshot(q, (snap) => {
      const items: any[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      setPending(items);
    });
    return () => unsub();
  }, [firestore]);

  const { toast } = useToast();

  async function approve(uid: string) {
    try {
      await updateDoc(doc(firestore, 'users', uid), { status: 'aprobado' });
      toast({ title: 'Usuario aprobado', description: 'La cuenta ha sido activada.' });
    } catch (e: any) {
      console.error('Approve error', e);
      toast({ title: 'Error', description: e?.message || 'No se pudo aprobar al usuario.', variant: 'destructive' });
    }
  }

  async function reject(uid: string) {
    try {
      await updateDoc(doc(firestore, 'users', uid), { status: 'rechazado' });
      toast({ title: 'Usuario rechazado', description: 'La cuenta ha sido marcada como rechazada.' });
    } catch (e: any) {
      console.error('Reject error', e);
      toast({ title: 'Error', description: e?.message || 'No se pudo rechazar al usuario.', variant: 'destructive' });
    }
  }

  if (pending.length === 0) return <p className="text-sm text-muted-foreground">No hay nuevos clientes pendientes.</p>;

  return (
    <div className="space-y-4">
      {pending.map((client) => (
        <div key={client.id} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={client.avatar || ''} alt={client.name || client.email} />
              <AvatarFallback>{(client.name || client.email || '').charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{client.name || client.email}</p>
              <p className="text-sm text-muted-foreground">{client.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => approve(client.id)}>
              <Check className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => reject(client.id)}>
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
    const q = collection(firestore, 'inventory');
    const unsub = onSnapshot(q, (snap: any) => {
      const items: any[] = [];
      snap.forEach((d: any) => items.push({ id: d.id, ...d.data() }));
      // filter for stock below threshold
      const low = items.filter(it => {
        const qty = Number(it.quantity ?? it.stockActual ?? it.cantidad ?? it.stock ?? 0);
        const min = Number(it.minThreshold ?? it.stockCritico ?? it.stockMin ?? 0);
        return qty < min;
      });
      setAlerts(low);
    });
    return () => unsub();
  }, [firestore]);

  if (alerts.length === 0) return <p className="text-sm text-muted-foreground">No hay alertas de stock crítico.</p>;

  return (
    <div className="space-y-3">
      {alerts.map(item => (
        <div key={item.id} className="flex items-center justify-between">
          <div>
            <p className="font-medium">{item.name || item.nombreInsumo || item.nombre}</p>
            <p className="text-sm text-muted-foreground">En stock: {item.quantity ?? item.stockActual ?? item.cantidad ?? item.stock ?? 0} — Mínimo: {item.minThreshold ?? item.stockCritico ?? 0}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="destructive">Stock Bajo</Badge>
            <Link href="/admin/inventory" className="text-sm underline">Gestionar</Link>
          </div>
        </div>
      ))}
    </div>
  );
}
