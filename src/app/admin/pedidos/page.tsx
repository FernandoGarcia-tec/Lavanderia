"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useFirestore } from "@/firebase/provider";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Eye, 
  Search, 
  ClipboardList, 
  Clock, 
  PlayCircle, 
  CheckCircle, 
  PackageCheck, 
  X,
  User,
  CalendarDays,
  CreditCard,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Order = {
    id: string;
    clientName?: string;
    clientEmail?: string;
    serviceName?: string;
    unit?: "kg" | "pieces";
    quantity?: number;
    estimatedTotal?: number;
    deliveryDate?: any; // Firestore Timestamp
    deliveryTimeStr?: string; // deliveryTime in your previous code
    status?: "pendiente" | "en_progreso" | "completado" | "entregado";
    attendedBy?: string;
    staffName?: string;
    deliveredBy?: string;
    deliveredByUid?: string;
    deliveredAt?: any; // Firestore Timestamp
    paymentMethod?: string;
    paymentStatus?: "pagado" | "sin_pagar";
    createdAt?: any;
    notes?: string;
    items?: any[]; // Array of items if multiple
};

export default function AdminOrdersPage() {
    const db = useFirestore();
    const [orders, setOrders] = useState<Order[]>([]);
    
    // Filtros y Búsqueda
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Modal
    const [detailOpen, setDetailOpen] = useState(false);
    const [selected, setSelected] = useState<Order | null>(null);

    // Carga de datos
    useEffect(() => {
        if (!db) return;
        const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(q, (snap) => {
            const list: Order[] = [];
            snap.forEach((doc) => {
                const d = doc.data() as any;
                list.push({ id: doc.id, ...d });
            });
            setOrders(list);
        });
        return () => unsub();
    }, [db]);

    // Lógica de Filtrado
    const filteredOrders = useMemo(() => {
        return orders.filter(o => {
            // Filtro por Estado (Cards)
            if (statusFilter !== 'all' && o.status !== statusFilter) return false;
            
            // Filtro por Búsqueda
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const client = (o.clientName || '').toLowerCase();
                const id = (o.id || '').toLowerCase();
                const service = (o.serviceName || '').toLowerCase();
                return client.includes(q) || id.includes(q) || service.includes(q);
            }
            return true;
        });
    }, [orders, statusFilter, searchQuery]);

    // Contadores para las tarjetas
    const counts = useMemo(() => ({
        total: orders.length,
        pendiente: orders.filter(o => o.status === 'pendiente').length,
        en_progreso: orders.filter(o => o.status === 'en_progreso').length,
        completado: orders.filter(o => o.status === 'completado').length,
        entregado: orders.filter(o => o.status === 'entregado').length
    }), [orders]);

    // Componente auxiliar para las tarjetas de filtro
    const FilterCard = ({ id, label, count, icon: Icon, colorClass }: any) => (
        <button 
            onClick={() => setStatusFilter(statusFilter === id ? 'all' : id)}
            className={cn(
                "flex flex-col items-start p-4 rounded-xl border transition-all duration-200 hover:shadow-md w-full text-left relative overflow-hidden group bg-white",
                statusFilter === id 
                    ? `border-${colorClass}-200 ring-2 ring-${colorClass}-100 bg-${colorClass}-50` 
                    : "border-slate-200 hover:border-cyan-200"
            )}
        >
            <div className={cn("p-2 rounded-lg mb-3 transition-colors", statusFilter === id ? `bg-${colorClass}-100 text-${colorClass}-700` : `bg-slate-100 text-slate-500 group-hover:bg-${colorClass}-50 group-hover:text-${colorClass}-600`)}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-slate-800">{count}</div>
            <div className="text-sm text-slate-500 font-medium">{label}</div>
            {statusFilter === id && (
                <div className={`absolute bottom-0 left-0 w-full h-1 bg-${colorClass}-500`} />
            )}
        </button>
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
                <div className="flex items-center gap-4 mb-8 text-white">
                    <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner ring-2 ring-white/10">
                        <ClipboardList className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight drop-shadow-sm">Gestión de Pedidos</h1>
                        <p className="text-cyan-50 opacity-90">Supervisa el flujo de trabajo y entregas</p>
                    </div>
                </div>

                {/* Filtros Rápidos (KPIs) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <FilterCard id="pendiente" label="Pendientes" count={counts.pendiente} icon={Clock} colorClass="orange" />
                    <FilterCard id="en_progreso" label="En Proceso" count={counts.en_progreso} icon={PlayCircle} colorClass="blue" />
                    <FilterCard id="completado" label="Listos" count={counts.completado} icon={CheckCircle} colorClass="green" />
                    <FilterCard id="entregado" label="Entregados" count={counts.entregado} icon={PackageCheck} colorClass="slate" />
                </div>

                {/* Tabla de Pedidos */}
                <Card className="shadow-xl border-0 rounded-3xl overflow-hidden backdrop-blur-sm bg-white/95">
                    <CardHeader className="bg-white border-b border-slate-100 pb-4 pt-6 px-6">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div>
                                <CardTitle className="font-headline text-xl text-slate-800">Listado de Órdenes</CardTitle>
                                <CardDescription className="text-slate-500">Total de pedidos registrados: {counts.total}</CardDescription>
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <div className="relative w-full sm:w-64 group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-cyan-600 transition-colors" />
                                    <Input 
                                        placeholder="Buscar cliente, servicio..." 
                                        className="pl-9 h-10 rounded-xl border-slate-200 bg-slate-50 focus:bg-white transition-all focus-visible:ring-cyan-500"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                {statusFilter !== 'all' && (
                                    <Button variant="ghost" size="sm" onClick={() => setStatusFilter('all')} className="text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg">
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
                                    <TableHead className="pl-6 font-semibold text-slate-600">ID / Cliente</TableHead>
                                    <TableHead className="font-semibold text-slate-600">Servicio</TableHead>
                                    <TableHead className="font-semibold text-slate-600">Recepción</TableHead>
                                    <TableHead className="font-semibold text-slate-600">Estado</TableHead>
                                    <TableHead className="font-semibold text-slate-600">Total</TableHead>
                                    <TableHead className="font-semibold text-slate-600">Pago</TableHead>
                                    <TableHead className="text-right pr-6 font-semibold text-slate-600">Acción</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredOrders.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-40 text-center text-slate-400">
                                            <div className="flex flex-col items-center justify-center">
                                                <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                                                <p>No se encontraron pedidos con los filtros actuales.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredOrders.map((o) => {
                                        const received = o.createdAt?.toDate ? o.createdAt.toDate() : null;
                                        const isPaid = o.paymentStatus === 'pagado' || (o.paymentMethod && o.paymentMethod !== 'pagar_al_retiro');

                                        return (
                                            <TableRow key={o.id} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                                                <TableCell className="pl-6 py-4">
                                                    <div>
                                                        <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase">#{o.id.slice(0,5)}</span>
                                                        <p className="font-semibold text-slate-700 mt-1">{o.clientName || 'Cliente'}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-slate-700">{o.serviceName || 'Varios'}</span>
                                                        {o.items && o.items.length > 0 ? (
                                                            <span className="text-xs text-slate-400">{o.items.length} ítems</span>
                                                        ) : (
                                                            <span className="text-xs text-slate-400">{o.quantity} {o.unit}</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm text-slate-600">{received ? format(received, 'dd MMM', {locale: es}) : '-'}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={cn(
                                                        "capitalize shadow-sm border-0 px-2.5 py-0.5 rounded-md",
                                                        o.status === 'pendiente' && "bg-orange-100 text-orange-700 hover:bg-orange-200",
                                                        o.status === 'en_progreso' && "bg-blue-100 text-blue-700 hover:bg-blue-200",
                                                        o.status === 'completado' && "bg-green-100 text-green-700 hover:bg-green-200",
                                                        o.status === 'entregado' && "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                                    )}>
                                                        {o.status?.replace('_', ' ') || 'Pendiente'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="font-bold text-slate-700">${Number(o.estimatedTotal || 0).toFixed(2)}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={isPaid ? "default" : "destructive"} className={cn("shadow-none", isPaid ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-red-100 text-red-700 hover:bg-red-200")}>
                                                        {isPaid ? "Pagado" : "Pendiente"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg" onClick={() => { setSelected(o); setDetailOpen(true); }}>
                                                        <Eye className="h-5 w-5" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* MODAL DETALLES */}
                <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                    <DialogContent className="rounded-2xl sm:max-w-md overflow-hidden">
                        <DialogHeader className="bg-slate-50 p-6 border-b border-slate-100">
                            <div className="flex items-center justify-between">
                                <DialogTitle className="text-xl text-slate-800">Detalles del Pedido</DialogTitle>
                                <Badge variant="outline" className="bg-white">{selected?.id.slice(0,5).toUpperCase()}</Badge>
                            </div>
                            <DialogDescription>Resumen completo de la orden.</DialogDescription>
                        </DialogHeader>
                        
                        {selected && (
                            <div className="p-6 space-y-4 text-sm">
                                {/* Cliente */}
                                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                                    <div className="h-10 w-10 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600">
                                        <User className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-700">{selected.clientName}</p>
                                        <p className="text-xs text-slate-500">{selected.clientEmail || 'Sin correo registrado'}</p>
                                    </div>
                                </div>

                                {/* Grilla Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div><span className="text-xs text-slate-400 uppercase font-semibold">Atendido Por</span><p className="text-slate-700 font-medium">{selected.attendedBy || selected.staffName || 'Sistema'}</p></div>
                                    <div><span className="text-xs text-slate-400 uppercase font-semibold">Total</span><p className="text-slate-700 font-bold text-lg">${Number(selected.estimatedTotal).toFixed(2)}</p></div>
                                    
                                    <div>
                                        <span className="text-xs text-slate-400 uppercase font-semibold">Recepción</span>
                                        <div className="flex items-center gap-1 text-slate-600">
                                            <CalendarDays className="w-3.5 h-3.5" />
                                            {selected.createdAt?.toDate ? format(selected.createdAt.toDate(), 'dd MMM HH:mm', {locale: es}) : '-'}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-xs text-slate-400 uppercase font-semibold">Entrega Est.</span>
                                        <div className="flex items-center gap-1 text-slate-600">
                                            <Clock className="w-3.5 h-3.5" />
                                            {selected.deliveryDate?.toDate ? format(selected.deliveryDate.toDate(), 'dd MMM', {locale: es}) : '-'} {selected.deliveryTimeStr}
                                        </div>
                                    </div>
                                </div>

                                {/* Items (Si hay múltiples) */}
                                {selected.items && selected.items.length > 0 && (
                                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mt-2">
                                        <span className="text-xs text-slate-400 uppercase font-bold tracking-wider block mb-2">Desglose</span>
                                        <div className="space-y-1">
                                            {selected.items.map((item: any, idx: number) => (
                                                <div key={idx} className="flex justify-between text-xs">
                                                    <span className="text-slate-700">{item.serviceName} x{item.quantity}</span>
                                                    <span className="font-medium">${Number(item.subtotal).toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Pago */}
                                <div className="pt-2 flex justify-between items-center border-t border-slate-100 mt-2">
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <CreditCard className="w-4 h-4" />
                                        <span className="capitalize">{selected.paymentMethod?.replace('_', ' ') || 'Efectivo'}</span>
                                    </div>
                                    <Badge variant={selected.paymentStatus === 'pagado' || selected.paymentMethod !== 'pagar_al_retiro' ? 'default' : 'destructive'}>
                                        {selected.paymentStatus === 'pagado' || selected.paymentMethod !== 'pagar_al_retiro' ? 'Pagado' : 'Pendiente'}
                                    </Badge>
                                </div>
                            </div>
                        )}
                        <DialogFooter className="bg-slate-50 p-4 border-t border-slate-100">
                            <Button variant="outline" className="w-full rounded-xl" onClick={() => setDetailOpen(false)}>Cerrar</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

            </div>
        </div>
    );
}