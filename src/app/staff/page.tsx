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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  PlayCircle, 
  CheckCircle2, 
  Eye, 
  PackageCheck, 
  Search, 
  Clock, 
  CheckCircle,
  Banknote,
  X,
  AlertCircle,
  User,
  CalendarDays,
  FileText,
  Pencil
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useEffect, useState, useMemo } from 'react';
import { useFirestore, useAuth } from '@/firebase/provider';
import { collection, addDoc, query, where, getDocs, serverTimestamp, onSnapshot, orderBy, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function StaffDashboard() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  // --- Estados ---
  const [showModal, setShowModal] = useState(false);
  const [openingAmount, setOpeningAmount] = useState<string>('');
  const [checking, setChecking] = useState(true);
  
  const [orders, setOrders] = useState<Array<any>>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modales de Acción
  const [deliverModalOpen, setDeliverModalOpen] = useState(false);
  const [deliverTarget, setDeliverTarget] = useState<any | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  
  // Modal de Detalles
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsTarget, setDetailsTarget] = useState<any | null>(null);

  // Modal de Edición
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editDate, setEditDate] = useState<string>('');
  const [editTime, setEditTime] = useState<string>('');

  const [staffName, setStaffName] = useState<string>('');

  // Cálculos para el modal de entrega
  const amountDue = deliverTarget ? Number(deliverTarget?.estimatedTotal || 0) : 0;
  const changeDue = Math.max(0, (parseFloat(payAmount || '0') || 0) - amountDue);

  // --- Helpers de Fecha Local ---
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const nowTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // --- Efectos ---

  // 1. Verificar si la caja está abierta hoy
  useEffect(() => {
    async function checkOpeningStrict() {
      try {
        if (!firestore || !auth?.currentUser?.uid) {
          setChecking(false);
          return;
        }
        const uid = auth.currentUser.uid;
        const snap = await getDocs(collection(firestore, 'cash_registers'));
        const start = new Date();
        start.setHours(0,0,0,0);
        const end = new Date();
        end.setHours(23,59,59,999);
        let hasToday = false;
        
        snap.forEach((docu) => {
          const d = docu.data() as any;
          if (d?.type !== 'opening') return;
          if (String(d?.userId || '') !== uid) return;
          
          const ts = d?.createdAt;
          let dt: Date | null = null;
          if (ts?.toDate) dt = ts.toDate();
          else if (typeof ts === 'string') dt = new Date(ts);
          
          if (dt && dt >= start && dt <= end) {
            hasToday = true;
          }
        });
        
        if (!hasToday) setShowModal(true);
      } catch (e) {
        console.warn('opening strict check error', e);
        setShowModal(true); 
      } finally {
        setChecking(false);
      }
    }
    checkOpeningStrict();
  }, [firestore, auth]);

  // 2. Cargar Pedidos
  useEffect(() => {
    if (!firestore) return;
    const q = query(
      collection(firestore, 'orders'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const items: any[] = [];
      snap.forEach(docu => {
        const d = docu.data() as any;
        items.push({ id: docu.id, ...d });
      });
      setOrders(items);
    }, (err) => {
      console.error('orders subscription error', err);
    });
    return () => unsub();
  }, [firestore]);

  // 3. Cargar Nombre del Personal
  useEffect(() => {
    (async () => {
      try {
        const uid = auth?.currentUser?.uid;
        if (!uid || !firestore) return;
        
        if (auth.currentUser.displayName) {
            setStaffName(auth.currentUser.displayName);
        }

        const snapUsers = await getDocs(query(collection(firestore, 'users'), where('authUid', '==', uid)));
        if (!snapUsers.empty) {
            const data = snapUsers.docs[0].data();
            if (data?.name) setStaffName(data.name);
        }
      } catch (err) {
        console.error("Error fetching staff name", err);
      }
    })();
  }, [auth, firestore]);

  // --- Lógica ---

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
        if (statusFilter !== 'all' && o.status !== statusFilter) return false;
        if (searchQuery) {
            const lowerQ = searchQuery.toLowerCase();
            const clientName = (o.clientName || '').toLowerCase();
            const orderId = (o.id || '').toLowerCase();
            return clientName.includes(lowerQ) || orderId.includes(lowerQ);
        }
        return true;
    });
  }, [orders, statusFilter, searchQuery]);

  const counts = useMemo(() => {
      return {
          pendiente: orders.filter(o => o.status === 'pendiente').length,
          en_progreso: orders.filter(o => o.status === 'en_progreso').length,
          completado: orders.filter(o => o.status === 'completado').length,
          entregado: orders.filter(o => o.status === 'entregado').length
      };
  }, [orders]);

  // --- Acciones ---

  async function saveOpening() {
    try {
      if (!firestore) return;
      const amount = parseFloat(openingAmount);
      if (isNaN(amount) || amount < 0) {
        toast({ title: 'Monto inválido', description: 'Debe ser mayor o igual a 0.', variant: 'destructive' });
        return;
      }
      await addDoc(collection(firestore, 'cash_registers'), {
        type: 'opening',
        amount,
        userId: auth?.currentUser?.uid || null,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Caja Abierta', description: `Monto inicial: $${amount.toFixed(2)}` });
      setShowModal(false);
    } catch (err: any) {
      toast({ title: 'Error', description: 'No se pudo guardar.', variant: 'destructive' });
    }
  }

  async function setOrderStatus(orderId: string, status: string) {
    try {
      if (!firestore) return;
      await updateDoc(doc(firestore, 'orders', orderId), { status });
      toast({ title: 'Estado Actualizado', description: `Pedido movido a ${status.replace('_',' ')}.` });
    } catch (err: any) {
      toast({ title: 'Error', description: 'No se pudo cambiar el estado.', variant: 'destructive' });
    }
  }

  async function markDelivered() {
    try {
      if (!firestore || !deliverTarget?.id) return;
      
      const updates: any = { 
          status: 'entregado', 
          deliveredAt: serverTimestamp(), 
          deliveredBy: staffName || 'Personal', 
          deliveredByUid: auth?.currentUser?.uid || null, 
          paymentStatus: 'pagado' 
      };
      
      await updateDoc(doc(firestore, 'orders', deliverTarget.id), updates);
      
      toast({ title: '¡Entrega Exitosa!', description: `Entregado a ${deliverTarget.clientName || 'Cliente'}.` });
      setDeliverModalOpen(false);
      setDeliverTarget(null);
      setPayAmount('');
    } catch (err: any) {
      toast({ title: 'Error', description: 'No se pudo registrar la entrega.', variant: 'destructive' });
    }
  }

  // --- NUEVA FUNCIÓN: Guardar Edición con Validación ---
  async function saveEdit() {
    try {
        if (!firestore || !editTarget?.id) return;

        const updates: any = {};
        
        // Construir nueva fecha si se seleccionó
        if (editDate) {
             // Crear fecha a partir del string YYYY-MM-DD
             const [y, m, d] = editDate.split('-').map(Number);
             const newDate = new Date(y, m - 1, d); // Mes es 0-indexado
             
             if (editTime) {
                 const [hh, mm] = editTime.split(':').map(Number);
                 newDate.setHours(hh, mm);
             } else {
                 // Si no se pone hora, usamos hora actual si es hoy, o 9am si es futuro
                 const now = new Date();
                 if (editDate === todayStr) {
                    newDate.setHours(now.getHours(), now.getMinutes());
                 } else {
                    newDate.setHours(9, 0);
                 }
             }

             // VALIDACIÓN: No permitir pasado
             const now = new Date();
             // Damos 1 minuto de margen por delays
             if (newDate.getTime() < (now.getTime() - 60000)) {
                toast({ title: 'Fecha/Hora Inválida', description: 'No puedes programar entregas en el pasado.', variant: 'destructive' });
                return;
             }

             updates.deliveryDate = Timestamp.fromDate(newDate);
        }
        if (editTime) updates.deliveryTimeStr = editTime;

        await updateDoc(doc(firestore, 'orders', editTarget.id), updates);
        
        toast({ title: 'Pedido Actualizado', description: 'Se ha asignado la nueva fecha de entrega.' });
        setEditModalOpen(false);
    } catch (err: any) {
        toast({ title: 'Error', description: 'No se pudo actualizar el pedido.', variant: 'destructive' });
    }
  }

  const openEditModal = (order: any) => {
      setEditTarget(order);
      // Pre-llenar datos si existen
      if (order.deliveryDate?.toDate) {
          setEditDate(format(order.deliveryDate.toDate(), 'yyyy-MM-dd'));
      } else {
          setEditDate('');
      }
      setEditTime(order.deliveryTimeStr || '');
      setEditModalOpen(true);
  }

  // --- Componentes ---

  const StatusCard = ({ id, label, count, icon: Icon, colorClass }: any) => (
      <button 
        onClick={() => setStatusFilter(statusFilter === id ? 'all' : id)}
        className={cn(
            "flex flex-col items-start p-4 rounded-xl border transition-all duration-200 hover:shadow-md w-full text-left relative overflow-hidden group",
            statusFilter === id 
                ? `bg-${colorClass}-50 border-${colorClass}-200 ring-2 ring-${colorClass}-100` 
                : "bg-white border-slate-200 hover:border-cyan-200"
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
    <div className="min-h-screen font-sans p-4 md:p-8 relative">
        <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div>
                    <h1 className="text-3xl font-bold text-white drop-shadow-md">Panel del Personal</h1>
                    <p className="text-cyan-50 font-medium text-lg opacity-90">
                        Hola, {staffName || 'Colaborador'}. Aquí está el resumen de hoy.
                    </p>
                </div>
            </div>

            {/* Filtros */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatusCard id="pendiente" label="Pendientes" count={counts.pendiente} icon={Clock} colorClass="orange" />
                <StatusCard id="en_progreso" label="En Proceso" count={counts.en_progreso} icon={PlayCircle} colorClass="blue" />
                <StatusCard id="completado" label="Listos" count={counts.completado} icon={CheckCircle} colorClass="green" />
                <StatusCard id="entregado" label="Entregados" count={counts.entregado} icon={PackageCheck} colorClass="slate" />
            </div>

            {/* Tabla */}
            <Card className="border-0 shadow-xl overflow-hidden rounded-3xl">
                <CardHeader className="bg-white border-b border-slate-100 pb-4 pt-6 px-6">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div>
                            <CardTitle className="text-xl text-slate-800">Ordenes de Servicio</CardTitle>
                            <CardDescription>Gestión de flujo de trabajo</CardDescription>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="relative w-full sm:w-64 group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-cyan-600 transition-colors" />
                                <Input 
                                    placeholder="Buscar pedido..." 
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
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="pl-6 font-semibold text-slate-600">ID / Cliente</TableHead>
                                <TableHead className="font-semibold text-slate-600">Servicio</TableHead>
                                <TableHead className="font-semibold text-slate-600">Entrega Est.</TableHead>
                                <TableHead className="font-semibold text-slate-600">Estado</TableHead>
                                <TableHead className="font-semibold text-slate-600">Total</TableHead>
                                <TableHead className="text-right pr-6 font-semibold text-slate-600">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredOrders.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-40 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center">
                                            <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                                            <p>No se encontraron pedidos.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredOrders.map((order) => {
                                    const delivery = order.deliveryDate?.toDate ? order.deliveryDate.toDate() : null;
                                    const isPaid = order.paymentStatus === 'pagado' || order.paymentMethod !== 'pagar_al_retiro';
                                    
                                    return (
                                        <TableRow key={order.id} className="group hover:bg-cyan-50/30 transition-colors border-b border-slate-50">
                                            <TableCell className="pl-6 py-4">
                                                <div>
                                                    <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase">#{order.id.slice(0,5)}</span>
                                                    <p className="font-semibold text-slate-700 mt-1">{order.clientName || 'Cliente'}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-slate-700">{order.serviceName || (order.items ? 'Varios Servicios' : 'Servicio')}</span>
                                                    {order.items?.length > 0 ? (
                                                        <span className="text-xs text-slate-400">{order.items.length} ítems</span>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">{order.quantity} {order.unit}</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col text-sm">
                                                    <span className={cn("font-medium", !delivery ? "text-red-400" : "text-slate-600")}>
                                                        {delivery ? format(delivery, 'dd MMM', {locale: es}) : 'Sin Fecha'}
                                                    </span>
                                                    <span className="text-slate-400 text-xs">{order.deliveryTimeStr || ''}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={cn(
                                                    "capitalize shadow-sm border-0 px-2.5 py-0.5 rounded-md",
                                                    order.status === 'pendiente' && "bg-orange-100 text-orange-700 hover:bg-orange-200",
                                                    order.status === 'en_progreso' && "bg-blue-100 text-blue-700 hover:bg-blue-200",
                                                    order.status === 'completado' && "bg-green-100 text-green-700 hover:bg-green-200",
                                                    order.status === 'entregado' && "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                                )}>
                                                    {order.status?.replace('_', ' ') || 'Pendiente'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-bold text-slate-700">${Number(order.estimatedTotal).toFixed(2)}</div>
                                                <span className={cn("text-[10px] font-bold uppercase tracking-wide", isPaid ? "text-green-600" : "text-red-500")}>
                                                    {isPaid ? 'Pagado' : 'Pendiente'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <div className="flex items-center justify-end gap-1">
                                                    {/* BOTÓN REPROGRAMAR (Lápiz) - Solo visible si no entregado */}
                                                    {order.status !== 'entregado' && (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button size="icon" variant="ghost" className="h-9 w-9 text-orange-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl" onClick={() => openEditModal(order)}>
                                                                        <Pencil className="h-5 w-5" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Reprogramar</TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}

                                                    {/* ACCIONES DE ESTADO */}
                                                    {order.status === 'pendiente' && (
                                                        <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                                            <Button size="icon" variant="ghost" className="h-9 w-9 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 rounded-xl" onClick={() => setOrderStatus(order.id, 'en_progreso')}>
                                                                <PlayCircle className="h-5 w-5" />
                                                            </Button>
                                                        </TooltipTrigger><TooltipContent>Iniciar</TooltipContent></Tooltip></TooltipProvider>
                                                    )}
                                                    {order.status === 'en_progreso' && (
                                                        <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                                            <Button size="icon" variant="ghost" className="h-9 w-9 text-green-600 bg-green-50 hover:bg-green-100 hover:text-green-700 rounded-xl" onClick={() => setOrderStatus(order.id, 'completado')}>
                                                                <CheckCircle2 className="h-5 w-5" />
                                                            </Button>
                                                        </TooltipTrigger><TooltipContent>Terminar</TooltipContent></Tooltip></TooltipProvider>
                                                    )}
                                                    {order.status === 'completado' && (
                                                        <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                                            <Button size="icon" variant="ghost" className="h-9 w-9 text-purple-600 bg-purple-50 hover:bg-purple-100 hover:text-purple-700 rounded-xl" onClick={() => { setDeliverTarget(order); setDeliverModalOpen(true); }}>
                                                                <PackageCheck className="h-5 w-5" />
                                                            </Button>
                                                        </TooltipTrigger><TooltipContent>Entregar</TooltipContent></Tooltip></TooltipProvider>
                                                    )}
                                                    
                                                    <Button size="icon" variant="ghost" className="h-9 w-9 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-xl" onClick={() => { setDetailsTarget(order); setDetailsModalOpen(true); }}>
                                                        <Eye className="h-5 w-5" />
                                                    </Button>
                                                </div>
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

        {/* MODAL: APERTURA DE CAJA */}
        <Dialog open={showModal} onOpenChange={(open) => { if(!open) return; setShowModal(open); }}>
            <DialogContent className="rounded-2xl sm:max-w-sm [&>button]:hidden" onPointerDownOutside={e => e.preventDefault()} onEscapeKeyDown={e => e.preventDefault()}>
                <DialogHeader>
                    <div className="mx-auto w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center mb-2 text-cyan-600"><Banknote className="h-6 w-6" /></div>
                    <DialogTitle className="text-center text-xl text-slate-800">Apertura de Caja</DialogTitle>
                    <DialogDescription className="text-center">Ingresa el monto inicial para comenzar.</DialogDescription>
                </DialogHeader>
                <div className="py-4 flex justify-center">
                    <div className="relative w-full max-w-[200px]">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                        <Input type="number" step="0.01" className="pl-7 text-center text-2xl font-bold h-14 rounded-xl border-slate-200 focus-visible:ring-cyan-500" value={openingAmount} onChange={(e) => setOpeningAmount(e.target.value)} placeholder="0.00" />
                    </div>
                </div>
                <DialogFooter className="sm:justify-center"><Button onClick={saveOpening} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl h-11">Confirmar Apertura</Button></DialogFooter>
            </DialogContent>
        </Dialog>

        {/* MODAL: ENTREGAR PEDIDO */}
        <Dialog open={deliverModalOpen} onOpenChange={setDeliverModalOpen}>
            <DialogContent className="rounded-2xl sm:max-w-md">
                <DialogHeader>
                    <div className="mx-auto bg-green-100 p-3 rounded-full w-fit mb-2 text-green-600"><PackageCheck className="h-7 w-7" /></div>
                    <DialogTitle className="text-center text-xl text-slate-800">Entregar Pedido</DialogTitle>
                    <DialogDescription className="text-center">Cliente: <span className="font-semibold text-slate-900">{deliverTarget?.clientName}</span></DialogDescription>
                </DialogHeader>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 my-2 space-y-5">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                        <span className="text-slate-500 font-medium">Total a cobrar</span>
                        <span className="text-3xl font-bold text-slate-800">${amountDue.toFixed(2)}</span>
                    </div>
                    {deliverTarget?.paymentMethod === 'pagar_al_retiro' ? (
                        <div className="space-y-3">
                            <Label className="text-slate-700 font-medium">Pago recibido (Efectivo)</Label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                                <Input type="number" className="pl-8 h-12 rounded-xl text-lg font-medium border-slate-200" placeholder="0.00" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
                            </div>
                            <div className={`flex justify-between items-center text-sm p-3 rounded-lg ${parseFloat(payAmount) >= amountDue ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'}`}>
                                <span className="font-medium">Cambio:</span>
                                <span className="font-bold text-xl">${changeDue.toFixed(2)}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-blue-50 text-blue-700 p-4 rounded-xl text-sm text-center flex flex-col items-center gap-1 border border-blue-100">
                            <CheckCircle2 className="h-6 w-6 mb-1" />
                            <span className="font-semibold">¡Todo listo!</span>
                            <span>Pagado con <strong>{deliverTarget?.paymentMethod}</strong>.</span>
                        </div>
                    )}
                </div>
                <DialogFooter className="sm:justify-center gap-3">
                    <Button variant="outline" onClick={() => { setDeliverModalOpen(false); setDeliverTarget(null); setPayAmount(''); }} className="rounded-xl px-6 border-slate-200">Cancelar</Button>
                    <Button onClick={markDelivered} className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-8 shadow-lg shadow-green-200" disabled={deliverTarget?.paymentMethod === 'pagar_al_retiro' && parseFloat(payAmount || '0') < amountDue}>Confirmar Entrega</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* MODAL: DETALLES COMPLETOS */}
        <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
            <DialogContent className="rounded-2xl sm:max-w-md overflow-hidden">
                <DialogHeader className="bg-slate-50 p-6 border-b border-slate-100">
                    <div className="flex items-center justify-between"><DialogTitle className="text-xl text-slate-800">Detalles</DialogTitle><Badge variant="outline" className="bg-white">{detailsTarget?.id.slice(0,5).toUpperCase()}</Badge></div>
                </DialogHeader>
                <div className="p-6 space-y-4 text-sm">
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                        <div className="h-10 w-10 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600"><User className="h-5 w-5" /></div>
                        <div><p className="font-semibold text-slate-700">{detailsTarget?.clientName}</p><p className="text-xs text-slate-500">{detailsTarget?.clientEmail || 'Sin correo'}</p></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><span className="text-xs text-slate-400 uppercase font-semibold">Atendido Por</span><p className="text-slate-700 font-medium flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-cyan-500" />{detailsTarget?.attendedBy || detailsTarget?.staffName || 'Sistema'}</p></div>
                        <div><span className="text-xs text-slate-400 uppercase font-semibold">Total</span><p className="text-slate-700 font-bold text-lg">${Number(detailsTarget?.estimatedTotal).toFixed(2)}</p></div>
                        <div><span className="text-xs text-slate-400 uppercase font-semibold">Recepción</span><div className="flex items-center gap-1.5 text-slate-600"><CalendarDays className="w-3.5 h-3.5" />{detailsTarget?.receivedAt?.toDate ? format(detailsTarget.receivedAt.toDate(), 'dd MMM HH:mm', {locale: es}) : '-'}</div></div>
                        <div><span className="text-xs text-slate-400 uppercase font-semibold">Entrega Est.</span><div className="flex items-center gap-1.5 text-slate-600"><Clock className="w-3.5 h-3.5" />{detailsTarget?.deliveryDate?.toDate ? format(detailsTarget.deliveryDate.toDate(), 'dd MMM', {locale: es}) : '-'} {detailsTarget?.deliveryTimeStr}</div></div>
                    </div>
                    {detailsTarget?.notes && <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mt-2"><div className="flex items-start gap-2"><FileText className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" /><div><span className="text-xs font-bold text-amber-700 block mb-0.5">Notas:</span><p className="text-amber-800 italic">{detailsTarget.notes}</p></div></div></div>}
                </div>
                <DialogFooter className="bg-slate-50 p-4 border-t border-slate-100"><Button variant="outline" className="w-full rounded-xl" onClick={() => setDetailsModalOpen(false)}>Cerrar</Button></DialogFooter>
            </DialogContent>
        </Dialog>

        {/* MODAL: EDITAR FECHA/HORA (NUEVO) */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
             <DialogContent className="rounded-2xl sm:max-w-sm">
                 <DialogHeader>
                     <DialogTitle>Asignar Fecha de Entrega</DialogTitle>
                     <DialogDescription>Actualiza la logística para este pedido.</DialogDescription>
                 </DialogHeader>
                 <div className="grid gap-4 py-4">
                     <div className="space-y-2">
                         <Label>Nueva Fecha</Label>
                         <Input 
                            type="date" 
                            value={editDate} 
                            onChange={(e) => setEditDate(e.target.value)} 
                            className="rounded-xl" 
                            min={todayStr} // Restricción visual de fecha
                         />
                     </div>
                     <div className="space-y-2">
                         <Label>Nueva Hora</Label>
                         <Input 
                            type="time" 
                            value={editTime} 
                            onChange={(e) => setEditTime(e.target.value)} 
                            className="rounded-xl" 
                            min={editDate === todayStr ? nowTimeStr : undefined} // Restricción visual de hora si es hoy
                         />
                     </div>
                 </div>
                 <DialogFooter>
                     <Button variant="outline" onClick={() => setEditModalOpen(false)} className="rounded-xl">Cancelar</Button>
                     <Button onClick={saveEdit} className="bg-cyan-600 hover:bg-cyan-700 rounded-xl text-white">Guardar Cambios</Button>
                 </DialogFooter>
             </DialogContent>
        </Dialog>

    </div>
  );
}