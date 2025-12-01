"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Minus, Plus, Bell, UserCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, onSnapshot, updateDoc, doc, addDoc, serverTimestamp } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { useFirestore, useAuth } from "@/firebase/provider";
import { writeAudit } from "@/lib/audit";

export default function InventoryPage() {
  // Firebase init
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY as string,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN as string,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID as string,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET as string,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID as string,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID as string,
  };
  const app = useMemo(() => {
    const apps = getApps();
    return apps.length ? apps[0] : initializeApp(firebaseConfig);
  }, []);
  const db = useMemo(() => getFirestore(app), [app]);
  const providerDb = useFirestore();
  const auth = useAuth();

  const [items, setItems] = useState<Array<{ id: string; name: string; category?: string; stock: number; minThreshold: number }>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [pendingUpdate, setPendingUpdate] = useState<Record<string, number>>({});
  const timersRef = useMemo(() => ({} as Record<string, any>), []);
  // Removed fixed threshold; each item can define its own minThreshold in Firestore.

  // Suscripción en tiempo real: soporta tanto 'quantity' como 'stock'
  useEffect(() => {
    const dbInst = providerDb || db;
    if (!dbInst) return;
    setLoading(true);
    const colRef = collection(dbInst, 'inventory');
    const unsub = onSnapshot(colRef, (snap) => {
      const arr: Array<{ id: string; name: string; category?: string; stock: number; minThreshold: number }> = [];
      snap.forEach(d => {
        const data = d.data() as any;
        const qty = Number((data.quantity !== undefined ? data.quantity : data.stock) || 0);
        arr.push({
          id: d.id,
          name: data.name || '(Sin nombre)',
          category: data.category || '',
          stock: qty,
          minThreshold: Number(data.minThreshold ?? 10),
        });
      });
      setItems(arr);
      setLoading(false);
    }, (err) => {
      toast({ title: 'Error en inventario', description: err?.message ?? String(err), variant: 'destructive' });
      setLoading(false);
    });
    return () => unsub();
  }, [providerDb, db]);

  const effectiveDb = providerDb || db;

  const scheduleUpdate = (id: string, value: number, prevStock: number) => {
    setPendingUpdate(prev => ({ ...prev, [id]: value }));
    if (timersRef[id]) clearTimeout(timersRef[id]);
    timersRef[id] = setTimeout(async () => {
      try {
        if (!effectiveDb) throw new Error("Firestore no disponible");
        const item = items.find(i => i.id === id);
        // Actualiza ambas llaves para compatibilidad (transición de schema)
        await updateDoc(doc(effectiveDb, "inventory", id), { stock: value, quantity: value });
        // Emit alert only when crossing threshold downward
        if (item) {
          const crossedToZero = value === 0 && prevStock > 0;
          const crossedToLow = value <= item.minThreshold && prevStock > item.minThreshold;
          if (crossedToZero || crossedToLow) {
            try {
              await addDoc(collection(effectiveDb, "alerts"), {
                type: "inventory",
                itemId: id,
                name: item.name,
                stock: value,
                minThreshold: item.minThreshold,
                status: value === 0 ? "Agotado" : "Por agotar",
                createdAt: serverTimestamp(),
              });
              toast({ title: "Alerta generada", description: `Estado: ${value === 0 ? 'Agotado' : 'Por agotar'}` });
              // Registro audit adicional solo cuando se agota
              if (crossedToZero) {
                writeAudit(effectiveDb, {
                  actorUid: auth?.currentUser?.uid || null,
                  actorEmail: auth?.currentUser?.email || null,
                  action: 'inventory-depletion',
                  resource: 'inventory',
                  resourceId: id,
                  before: { stock: prevStock },
                  after: { stock: value },
                });
              }
            } catch (e:any) {
              // Non-critical; log toast but continue
              toast({ title: "Alerta no registrada", description: e?.message ?? String(e), variant: "destructive" });
            }
          }
        }
        toast({ title: "Stock guardado", description: `Artículo actualizado a ${value}` });
        setPendingUpdate(prev => {
          const copy = { ...prev };
          delete copy[id];
          return copy;
        });
        // reflect change locally (already changed but ensure consistency)
        setItems(prev => prev.map(it => it.id === id ? { ...it, stock: value } : it));
      } catch (err: any) {
        toast({ title: "Error al guardar", description: err?.message ?? String(err), variant: "destructive" });
      }
    }, 600);
  };

  const adjustStock = (itemId: string, delta: number) => {
    let computedNew = 0;
    let prevStock = 0;
    setItems(prev => {
      return prev.map(it => {
        if (it.id === itemId) {
          prevStock = it.stock;
          const ns = Math.max(0, it.stock + delta);
          computedNew = ns;
          return { ...it, stock: ns };
        }
        return it;
      });
    });
    scheduleUpdate(itemId, computedNew, prevStock);
  };

  const manualStockChange = (itemId: string, value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0) return;
    let prevStock = 0;
    setItems(prev => prev.map(it => {
      if (it.id === itemId) {
        prevStock = it.stock;
        return { ...it, stock: num };
      }
      return it;
    }));
    scheduleUpdate(itemId, num, prevStock);
  };

  const notifyInventory = async (item: { id: string; name: string; stock: number; minThreshold: number }) => {
    try {
      if (!effectiveDb) throw new Error("Firestore no disponible");
      await addDoc(collection(effectiveDb, 'alerts'), {
        type: 'inventory',
        itemId: item.id,
        name: item.name,
        stock: item.stock,
        minThreshold: item.minThreshold,
        status: item.stock === 0 ? 'Agotado' : (item.stock <= item.minThreshold ? 'Por agotar' : 'Estable'),
        manual: true,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Notificación enviada', description: `Alerta registrada para ${item.name}` });
    } catch (err: any) {
      toast({ title: 'Error notificando', description: err?.message ?? String(err), variant: 'destructive' });
    }
  };

  const assignInventory = async (item: { id: string; name: string }) => {
    try {
      if (!effectiveDb) throw new Error("Firestore no disponible");
      await updateDoc(doc(effectiveDb, 'inventory', item.id), { assigned: true, assignedAt: serverTimestamp() });
      toast({ title: 'Asignado', description: `${item.name} marcado para reposición` });
    } catch (err: any) {
      toast({ title: 'Error asignando', description: err?.message ?? String(err), variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden font-sans p-4 md:p-8">
      <div className="absolute top-0 left-0 w-full h-[40vh] bg-gradient-to-br from-cyan-500 via-sky-500 to-blue-600 rounded-b-[50px] shadow-lg overflow-hidden z-0">
        <div className="absolute top-10 left-10 w-24 h-24 bg-white/10 rounded-full blur-xl animate-pulse" />
        <div className="absolute top-20 right-20 w-32 h-32 bg-cyan-200/20 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 left-1/3 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
      </div>
      <div className="relative z-10 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-center gap-4 mb-8 text-white">
          <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner ring-2 ring-white/10">
            <svg className="h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-8.25 4.5-8.25-4.5M12 21V12M3.75 7.5L12 3l8.25 4.5" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight drop-shadow-sm">Inventario (Personal)</h1>
            <p className="text-cyan-50 opacity-90">Supervisa, actualiza y gestiona los niveles de stock</p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Gestión de Inventario</CardTitle>
            <CardDescription>Actualiza el stock directamente desde la tabla. Guardado automático tras 0.6s.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">Cargando inventario...</TableCell></TableRow>
                ) : items.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">Sin artículos</TableCell></TableRow>
                ) : (
                  items.map(item => {
                    const status = item.stock === 0 ? "Agotado" : (item.stock <= item.minThreshold ? "Por agotar" : "Estable");
                    const updating = pendingUpdate[item.id] !== undefined;
                    return (
                      <TableRow key={item.id} className={updating ? "animate-pulse" : ""}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.category || "-"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 w-44">
                            <Button size="icon" variant="outline" onClick={() => adjustStock(item.id, -1)} disabled={item.stock <= 0}>
                              <Minus className="h-4 w-4" />
                            </Button>
                            <Input
                              value={item.stock}
                              onChange={e => manualStockChange(item.id, e.target.value)}
                              className="h-9 text-center"
                              type="number"
                              min={0}
                            />
                            <Button size="icon" variant="outline" onClick={() => adjustStock(item.id, +1)}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={status === "Agotado" ? "destructive" : (status === "Por agotar" ? "secondary" : "default")}
                          >
                            {status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <TooltipProvider delayDuration={0}>
                            <div className="flex items-center gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <RefreshCw className={`h-4 w-4 ${updating ? 'animate-spin' : ''}`} />
                                    <span className="text-xs">Auto</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>Se guarda 0.6s después de tu cambio</TooltipContent>
                              </Tooltip>
                              {(status === 'Por agotar' || status === 'Agotado') && (
                                <>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button size="icon" variant="ghost" onClick={() => notifyInventory(item)}>
                                        <Bell className="h-4 w-4 text-amber-600" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Notificar {status}</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button size="icon" variant="ghost" onClick={() => assignInventory(item)}>
                                        <UserCheck className="h-4 w-4 text-sky-600" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Asignar reposición</TooltipContent>
                                  </Tooltip>
                                </>
                              )}
                            </div>
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
