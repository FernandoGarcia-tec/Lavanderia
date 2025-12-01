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
  );
}
