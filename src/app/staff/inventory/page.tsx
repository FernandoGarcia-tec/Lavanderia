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
import { RefreshCw, Minus, Plus, Bell, UserCheck, Search, Package, AlertTriangle, XCircle, CheckCircle2, Archive, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, onSnapshot, updateDoc, doc, addDoc, serverTimestamp } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { useFirestore, useAuth } from "@/firebase/provider";
import { writeAudit } from "@/lib/audit";
import { cn } from "@/lib/utils";

// Init Firebase (Client Side fallback)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY as string,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN as string,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID as string,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID as string,
};

export default function InventoryPage() {
  const app = useMemo(() => {
    const apps = getApps();
    return apps.length ? apps[0] : initializeApp(firebaseConfig);
  }, []);
  const db = useMemo(() => getFirestore(app), [app]);
  const providerDb = useFirestore();
  const effectiveDb = providerDb || db;
  const auth = useAuth();

  // --- States ---
  const [items, setItems] = useState<Array<{ id: string; name: string; category?: string; stock: number; minThreshold: number }>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [pendingUpdate, setPendingUpdate] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all'); // 'all', 'low', 'out'
  const timersRef = useMemo(() => ({} as Record<string, any>), []);

  // --- Effects ---

  // Load Inventory
  useEffect(() => {
    if (!effectiveDb) return;
    setLoading(true);
    const colRef = collection(effectiveDb, 'inventory');
    const unsub = onSnapshot(colRef, (snap) => {
      const arr: Array<{ id: string; name: string; category?: string; stock: number; minThreshold: number }> = [];
      snap.forEach(d => {
        const data = d.data() as any;
        const qty = Number((data.quantity !== undefined ? data.quantity : data.stock) || 0);
        arr.push({
          id: d.id,
          name: data.name || '(Sin nombre)',
          category: data.category || 'General',
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
  }, [effectiveDb]);

  // --- Logic ---

  const filteredItems = useMemo(() => {
    return items.filter(item => {
        // Status Filter
        if (filterStatus === 'low' && item.stock > item.minThreshold) return false;
        if (filterStatus === 'out' && item.stock > 0) return false;
        
        // Search Filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return item.name.toLowerCase().includes(q) || (item.category || '').toLowerCase().includes(q);
        }
        return true;
    });
  }, [items, filterStatus, searchQuery]);

  const counts = useMemo(() => ({
      total: items.length,
      low: items.filter(i => i.stock <= i.minThreshold && i.stock > 0).length,
      out: items.filter(i => i.stock === 0).length
  }), [items]);

  // --- Actions ---

  const scheduleUpdate = (id: string, value: number, prevStock: number) => {
    setPendingUpdate(prev => ({ ...prev, [id]: value }));
    if (timersRef[id]) clearTimeout(timersRef[id]);
    
    timersRef[id] = setTimeout(async () => {
      try {
        if (!effectiveDb) throw new Error("Firestore no disponible");
        const item = items.find(i => i.id === id);
        
        // Update both keys for compatibility
        await updateDoc(doc(effectiveDb, "inventory", id), { stock: value, quantity: value });
        
        // Alert logic
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
              
              if (crossedToZero) {
                toast({ title: "¡Stock Agotado!", description: `${item.name} ha llegado a 0.`, variant: "destructive" });
                writeAudit(effectiveDb, {
                  actorUid: auth?.currentUser?.uid || null,
                  actorEmail: auth?.currentUser?.email || null,
                  action: 'inventory-depletion',
                  resource: 'inventory',
                  resourceId: id,
                  before: { stock: prevStock },
                  after: { stock: value },
                });
              } else {
                 toast({ title: "Stock Bajo", description: `${item.name} está por agotarse.` });
              }
            } catch (e) {
              console.error(e);
            }
          }
        }
        
        setPendingUpdate(prev => {
          const copy = { ...prev };
          delete copy[id];
          return copy;
        });
      } catch (err: any) {
        toast({ title: "Error al guardar", description: err?.message, variant: "destructive" });
      }
    }, 800); // Increased delay slightly for better UX
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
      if (!effectiveDb) return;
      await addDoc(collection(effectiveDb, 'alerts'), {
        type: 'inventory',
        itemId: item.id,
        name: item.name,
        stock: item.stock,
        minThreshold: item.minThreshold,
        status: item.stock === 0 ? 'Agotado' : 'Manual',
        manual: true,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Notificación enviada', description: `Alerta registrada para ${item.name}` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // --- Components ---

  const FilterCard = ({ id, label, count, icon: Icon, colorClass }: any) => (
      <button 
        onClick={() => setFilterStatus(filterStatus === id ? 'all' : id)}
        className={cn(
            "flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 hover:shadow-md w-full text-left relative overflow-hidden group bg-white",
            filterStatus === id 
                ? `border-${colorClass}-200 ring-2 ring-${colorClass}-100 bg-${colorClass}-50` 
                : "border-slate-200 hover:border-cyan-200"
        )}
      >
          <div className={cn("p-3 rounded-xl transition-colors", filterStatus === id ? `bg-${colorClass}-100 text-${colorClass}-700` : `bg-slate-100 text-slate-500 group-hover:bg-${colorClass}-50 group-hover:text-${colorClass}-600`)}>
              <Icon className="w-6 h-6" />
          </div>
          <div>
             <div className="text-2xl font-bold text-slate-800">{count}</div>
             <div className="text-sm text-slate-500 font-medium">{label}</div>
          </div>
      </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden font-sans p-4 md:p-8">
      {/* Fondo */}
      <div className="absolute top-0 left-0 w-full h-[40vh] bg-gradient-to-br from-cyan-500 via-sky-500 to-blue-600 rounded-b-[50px] shadow-lg overflow-hidden z-0">
        <div className="absolute top-10 left-10 w-24 h-24 bg-white/10 rounded-full blur-xl animate-pulse" />
        <div className="absolute top-20 right-20 w-32 h-32 bg-cyan-200/20 rounded-full blur-2xl" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8 text-white">
          <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner ring-2 ring-white/10">
            <Archive className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight drop-shadow-sm">Inventario</h1>
            <p className="text-cyan-50 opacity-90">Gestión de insumos y control de stock</p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <FilterCard id="all" label="Total Ítems" count={counts.total} icon={Package} colorClass="blue" />
            <FilterCard id="low" label="Stock Bajo" count={counts.low} icon={AlertTriangle} colorClass="orange" />
            <FilterCard id="out" label="Agotados" count={counts.out} icon={XCircle} colorClass="red" />
        </div>

        {/* Tabla */}
        <Card className="shadow-xl border-0 rounded-3xl overflow-hidden">
          <CardHeader className="bg-white border-b border-slate-100 pb-4 pt-6 px-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                    <CardTitle className="font-headline text-xl text-slate-800">Listado de Insumos</CardTitle>
                    <CardDescription className="text-slate-500">Actualiza las cantidades en tiempo real.</CardDescription>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-cyan-600 transition-colors" />
                        <Input 
                            placeholder="Buscar insumo..." 
                            className="pl-9 h-10 rounded-xl border-slate-200 bg-slate-50 focus:bg-white transition-all focus-visible:ring-cyan-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    {filterStatus !== 'all' && (
                        <Button variant="ghost" size="sm" onClick={() => setFilterStatus('all')} className="text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg">
                            <X className="h-4 w-4 mr-1" /> Limpiar
                        </Button>
                    )}
                </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="hover:bg-transparent border-b border-slate-100">
                  <TableHead className="pl-6 font-semibold text-slate-600">Nombre</TableHead>
                  <TableHead className="font-semibold text-slate-600">Categoría</TableHead>
                  <TableHead className="font-semibold text-slate-600">Control de Stock</TableHead>
                  <TableHead className="font-semibold text-slate-600">Estado</TableHead>
                  <TableHead className="text-right pr-6 font-semibold text-slate-600">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">Cargando inventario...</TableCell></TableRow>
                ) : filteredItems.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No se encontraron insumos.</TableCell></TableRow>
                ) : (
                  filteredItems.map(item => {
                    const status = item.stock === 0 ? "Agotado" : (item.stock <= item.minThreshold ? "Por agotar" : "Estable");
                    const updating = pendingUpdate[item.id] !== undefined;
                    
                    return (
                      <TableRow key={item.id} className={cn("hover:bg-slate-50/50 transition-colors group", updating && "bg-cyan-50/30")}>
                        <TableCell className="pl-6 py-4">
                            <p className="font-semibold text-slate-700">{item.name}</p>
                        </TableCell>
                        <TableCell>
                            <Badge variant="outline" className="bg-white text-slate-500 font-normal border-slate-200">
                                {item.category}
                            </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg w-fit p-1 shadow-sm">
                            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-md hover:bg-slate-100 text-slate-600" onClick={() => adjustStock(item.id, -1)} disabled={item.stock <= 0}>
                              <Minus className="h-4 w-4" />
                            </Button>
                            <Input
                              value={item.stock}
                              onChange={e => manualStockChange(item.id, e.target.value)}
                              className="h-8 w-16 text-center border-0 focus-visible:ring-0 font-bold text-slate-800 p-0"
                              type="number"
                              min={0}
                            />
                            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-md hover:bg-slate-100 text-slate-600" onClick={() => adjustStock(item.id, +1)}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          {updating && <span className="text-[10px] text-cyan-600 ml-1 animate-pulse">Guardando...</span>}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                                "shadow-none border-0 px-2.5 py-0.5",
                                status === "Agotado" && "bg-red-100 text-red-700 hover:bg-red-100",
                                status === "Por agotar" && "bg-orange-100 text-orange-700 hover:bg-orange-100",
                                status === "Estable" && "bg-green-100 text-green-700 hover:bg-green-100"
                            )}
                          >
                            {status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <TooltipProvider delayDuration={0}>
                            <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              {(status === 'Por agotar' || status === 'Agotado') && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="icon" variant="ghost" className="h-9 w-9 text-amber-500 bg-amber-50 hover:bg-amber-100 hover:text-amber-700 rounded-xl" onClick={() => notifyInventory(item)}>
                                      <Bell className="h-5 w-5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Notificar alerta manualmente</TooltipContent>
                                </Tooltip>
                              )}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button size="icon" variant="ghost" className="h-9 w-9 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-xl">
                                        <CheckCircle2 className="h-5 w-5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Auditoría rápida</TooltipContent>
                              </Tooltip>
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