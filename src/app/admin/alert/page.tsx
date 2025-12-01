"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useFirestore } from '@/firebase/provider';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function AlertsPage() {
  const firestore = useFirestore();

  const [inventoryAlerts, setInventoryAlerts] = useState<any[]>([]);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);

  useEffect(() => {
    if (!firestore) return;

    const invCol = collection(firestore, 'inventory');
    const unsubInv = onSnapshot(invCol, (snap: any) => {
      const items: any[] = [];
      snap.forEach((d: any) => items.push({ id: d.id, ...d.data() }));
      const low = items.filter(it => {
        const qty = Number(it.quantity ?? it.stockActual ?? it.cantidad ?? it.stock ?? 0);
        const min = Number(it.minThreshold ?? it.stockCritico ?? it.stockMin ?? 0);
        return qty < min;
      });
      setInventoryAlerts(low);
    });

    const usersQ = query(collection(firestore, 'users'), where('status', '==', 'pendiente'));
    const unsubUsers = onSnapshot(usersQ, (snap: any) => {
      const items: any[] = [];
      snap.forEach((d: any) => items.push({ id: d.id, ...d.data() }));
      setPendingUsers(items);
    });

    return () => {
      unsubInv();
      unsubUsers();
    };
  }, [firestore]);

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden font-sans p-4 md:p-8">
      {/* Fondo superior */}
      <div className="absolute top-0 left-0 w-full h-[40vh] bg-gradient-to-br from-cyan-500 via-sky-500 to-blue-600 rounded-b-[50px] shadow-lg overflow-hidden z-0">
        <div className="absolute top-10 left-10 w-24 h-24 bg-white/10 rounded-full blur-xl animate-pulse" />
        <div className="absolute top-20 right-20 w-32 h-32 bg-cyan-200/20 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 left-1/3 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
      </div>

      {/* Contenido principal */}
      <div className="relative z-10 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Encabezado */}
        <div className="flex items-center gap-4 mb-8 text-white">
          <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner ring-2 ring-white/10">
            {/* Icono: campana */}
            <svg className="h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight drop-shadow-sm">Alertas</h1>
            <p className="text-cyan-50 opacity-90">Inventario, usuarios y eventos</p>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
        <CardHeader>
          <CardTitle>Alertas</CardTitle>
          <CardDescription>Gestiona alertas del sistema: inventario, usuarios y eventos importantes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Alertas de Inventario</h3>
              <div className="flex items-center gap-2">
                <Badge variant="destructive">{inventoryAlerts.length}</Badge>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/admin/inventory">Gestionar inventario</Link>
                </Button>
              </div>
            </div>

            {inventoryAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay artículos con stock bajo.</p>
            ) : (
              <div className="grid gap-2">
                {inventoryAlerts.map(it => (
                  <div key={it.id} className="flex items-center justify-between border rounded p-3">
                    <div>
                      <div className="font-medium">{it.name || it.nombreInsumo || it.nombre}</div>
                      <div className="text-sm text-muted-foreground">En stock: {it.quantity ?? it.stockActual ?? it.cantidad ?? it.stock ?? 0} — Mínimo: {it.minThreshold ?? it.stockCritico ?? 0}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" asChild>
                        <Link href={`/admin/inventory?highlight=${it.id}`}>Ver</Link>
                      </Button>
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/admin/alert/create-purchase?item=${it.id}`}>Crear solicitud</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Nuevos Usuarios Pendientes</h3>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{pendingUsers.length}</Badge>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/admin/users">Gestionar usuarios</Link>
                </Button>
              </div>
            </div>

            {pendingUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay usuarios pendientes.</p>
            ) : (
              <div className="grid gap-2">
                {pendingUsers.map(u => (
                  <div key={u.id} className="flex items-center justify-between border rounded p-3">
                    <div>
                      <div className="font-medium">{u.name || u.nombreCompleto || u.email}</div>
                      <div className="text-sm text-muted-foreground">Rol: {u.role || u.rol || 'cliente'}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" asChild>
                        <Link href={`/admin/users?highlight=${u.id}`}>Ver</Link>
                      </Button>
                      <Button size="sm" variant="destructive" asChild>
                        <Link href={`/admin/users?action=delete&uid=${u.id}`}>Eliminar</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Otros eventos recientes</h3>
              <div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/admin/report">Ver reportes</Link>
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Puedes ver registros de auditoría y otros eventos en el <Link href="/admin/report" className="underline">informe</Link>.</p>
          </section>
        </CardContent>
        <CardFooter>
          <div className="flex justify-end w-full">
            <Button asChild>
              <Link href="/admin">Volver al panel</Link>
            </Button>
          </div>
        </CardFooter>
      </Card>
        </div>
      </div>
    </div>
  );
}
