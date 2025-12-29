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
  Pencil,
  Plus,
  Trash2,
  Save,
  ChevronRight,
  Sparkles,
  Zap,
  RefreshCw
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useFirestore, useAuth } from '@/firebase/provider';
import { collection, addDoc, query, where, getDocs, serverTimestamp, onSnapshot, orderBy, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Configuración de estados con colores y acciones
const STATUS_CONFIG = {
  pendiente: { label: 'Pendiente', color: 'orange', icon: Clock, next: 'en_progreso', nextLabel: 'Iniciar', nextIcon: PlayCircle },
  en_progreso: { label: 'En Proceso', color: 'blue', icon: PlayCircle, next: 'completado', nextLabel: 'Terminar', nextIcon: CheckCircle2 },
  completado: { label: 'Listo', color: 'green', icon: CheckCircle, next: 'entregado', nextLabel: 'Entregar', nextIcon: PackageCheck },
  entregado: { label: 'Entregado', color: 'slate', icon: PackageCheck, next: null, nextLabel: null, nextIcon: null }
} as const;

export default function StaffDashboard() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  // --- Estados ---
  const [showModal, setShowModal] = useState(false);
  const [openingAmount, setOpeningAmount] = useState<string>('');
  const [checking, setChecking] = useState(true);
  const [isLoading, setIsLoading] = useState<string | null>(null); // ID del pedido en proceso
  
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
  const [editItems, setEditItems] = useState<any[]>([]);
  const [editPaymentMethod, setEditPaymentMethod] = useState<string>('');

  const [staffName, setStaffName] = useState<string>('');
  
  // Lista de servicios disponibles
  const [servicesList, setServicesList] = useState<Array<{ id: string; name: string; price: number; unit: string }>>([]);
  const [showServicePicker, setShowServicePicker] = useState(false);
  
  // Vista expandida para móvil
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

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

  // 4. Cargar Lista de Servicios
  useEffect(() => {
    if (!firestore) return;
    const unsub = onSnapshot(collection(firestore, 'services'), (snap) => {
      const items: Array<{ id: string; name: string; price: number; unit: string }> = [];
      snap.forEach(docu => {
        const d = docu.data() as any;
        items.push({ id: docu.id, name: d.name || '', price: Number(d.price || 0), unit: d.unit || 'pza' });
      });
      setServicesList(items);
    }, (err) => console.error('services error', err));
    return () => unsub();
  }, [firestore]);

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

  // Cambio de estado rápido con feedback visual
  const handleQuickStatusChange = useCallback(async (order: any) => {
    const config = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG];
    if (!config?.next || !firestore) return;
    
    // Si es completado, abrir modal de entrega
    if (order.status === 'completado') {
      setDeliverTarget(order);
      setDeliverModalOpen(true);
      return;
    }
    
    setIsLoading(order.id);
    try {
      await updateDoc(doc(firestore, 'orders', order.id), { 
        status: config.next,
        [`${config.next}At`]: serverTimestamp(),
        [`${config.next}By`]: staffName || 'Personal'
      });
      toast({ 
        title: '✓ Actualizado', 
        description: `${order.clientName} → ${STATUS_CONFIG[config.next as keyof typeof STATUS_CONFIG]?.label}`,
      });
    } catch (err) {
      toast({ title: 'Error', description: 'No se pudo actualizar.', variant: 'destructive' });
    } finally {
      setIsLoading(null);
    }
  }, [firestore, staffName, toast]);

  async function setOrderStatus(orderId: string, status: string) {
    try {
      if (!firestore) return;
      setIsLoading(orderId);
      await updateDoc(doc(firestore, 'orders', orderId), { status });
      toast({ title: '✓ Estado Actualizado', description: `Pedido → ${status.replace('_',' ')}.` });
    } catch (err: any) {
      toast({ title: 'Error', description: 'No se pudo cambiar el estado.', variant: 'destructive' });
    } finally {
      setIsLoading(null);
    }
  }

  async function markDelivered() {
    try {
      if (!firestore || !deliverTarget?.id) return;
      setIsLoading(deliverTarget.id);
      
      const updates: any = { 
          status: 'entregado', 
          deliveredAt: serverTimestamp(), 
          deliveredBy: staffName || 'Personal', 
          deliveredByUid: auth?.currentUser?.uid || null, 
          paymentStatus: 'pagado' 
      };
      
      await updateDoc(doc(firestore, 'orders', deliverTarget.id), updates);
      
      toast({ title: '🎉 ¡Entrega Exitosa!', description: `Entregado a ${deliverTarget.clientName || 'Cliente'}.` });
      setDeliverModalOpen(false);
      setDeliverTarget(null);
      setPayAmount('');
    } catch (err: any) {
      toast({ title: 'Error', description: 'No se pudo registrar la entrega.', variant: 'destructive' });
    } finally {
      setIsLoading(null);
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

        // Guardar items y total
        updates.items = editItems;
        updates.estimatedTotal = editTotal;
        updates.serviceName = editItems.map(i => `${i.serviceName} (x${i.quantity})`).join(', ');
        
        // Guardar método de pago
        if (editPaymentMethod) {
            updates.paymentMethod = editPaymentMethod;
            // Si cambia a un método pagado, actualizar paymentStatus
            if (editPaymentMethod !== 'pagar_al_retiro') {
                updates.paymentStatus = 'pagado';
            }
        }

        await updateDoc(doc(firestore, 'orders', editTarget.id), updates);
        
        toast({ title: 'Pedido Actualizado', description: `Nuevo total: $${editTotal.toFixed(2)}` });
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
      setEditPaymentMethod(order.paymentMethod || 'pagar_al_retiro');
      
      // Cargar items para editar cantidad y precio
      if (order.items && Array.isArray(order.items) && order.items.length > 0) {
          setEditItems(order.items.map((i: any) => ({
              ...i,
              quantity: Number(i.quantity || 0),
              priceUnit: Number(i.priceUnit || 0),
              subtotal: Number(i.quantity || 0) * Number(i.priceUnit || 0)
          })));
      } else {
          // Retrocompatibilidad para órdenes sin array de items
          setEditItems([{
              serviceName: order.serviceName || 'Servicio General',
              quantity: order.quantity || 0,
              unit: order.unit || 'pza',
              priceUnit: 0,
              subtotal: 0
          }]);
      }
      
      setEditModalOpen(true);
  }

  // Manejar cambios en items
  const handleItemChange = (index: number, field: string, value: string) => {
      const newItems = [...editItems];
      const item = newItems[index];
      
      if (field === 'quantity') {
          item.quantity = parseFloat(value) || 0;
          item.subtotal = item.quantity * (item.priceUnit || 0);
      } else if (field === 'priceUnit') {
          item.priceUnit = parseFloat(value) || 0;
          item.subtotal = (item.quantity || 0) * item.priceUnit;
      } else if (field === 'serviceName') {
          item.serviceName = value;
      }
      
      setEditItems(newItems);
  };

  const handleAddItem = () => {
      setShowServicePicker(true);
  };

  const handleSelectService = (service: { id: string; name: string; price: number; unit: string }) => {
      setEditItems([...editItems, {
          serviceId: service.id,
          serviceName: service.name,
          quantity: 1,
          unit: service.unit,
          priceUnit: service.price,
          subtotal: service.price
      }]);
      setShowServicePicker(false);
  };

  const handleAddCustomItem = () => {
      setEditItems([...editItems, {
          serviceName: 'Servicio Personalizado',
          quantity: 1,
          unit: 'pza',
          priceUnit: 0,
          subtotal: 0,
          isCustom: true
      }]);
      setShowServicePicker(false);
  };

  const handleRemoveItem = (index: number) => {
      const newItems = [...editItems];
      newItems.splice(index, 1);
      setEditItems(newItems);
  };

  // Calcular total de edición
  const editTotal = useMemo(() => {
      return editItems.reduce((acc, item) => acc + (Number(item.subtotal) || 0), 0);
  }, [editItems]);

  // --- Componentes ---

  // Tarjeta de estado mejorada con animaciones
  const StatusCard = ({ id, label, count, icon: Icon, colorClass }: any) => {
      const isActive = statusFilter === id;
      const colorMap: Record<string, string> = {
          orange: isActive ? 'bg-orange-50 border-orange-300 ring-2 ring-orange-100' : 'hover:border-orange-200',
          blue: isActive ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-100' : 'hover:border-blue-200',
          green: isActive ? 'bg-green-50 border-green-300 ring-2 ring-green-100' : 'hover:border-green-200',
          slate: isActive ? 'bg-slate-100 border-slate-300 ring-2 ring-slate-200' : 'hover:border-slate-300',
      };
      const iconBgMap: Record<string, string> = {
          orange: isActive ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500 group-hover:bg-orange-50 group-hover:text-orange-500',
          blue: isActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-500',
          green: isActive ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500 group-hover:bg-green-50 group-hover:text-green-500',
          slate: isActive ? 'bg-slate-200 text-slate-600' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200',
      };
      const barColorMap: Record<string, string> = {
          orange: 'bg-orange-500',
          blue: 'bg-blue-500',
          green: 'bg-green-500',
          slate: 'bg-slate-400',
      };
      
      return (
          <button 
            onClick={() => setStatusFilter(statusFilter === id ? 'all' : id)}
            className={cn(
                "flex flex-col items-start p-4 rounded-2xl border-2 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] w-full text-left relative overflow-hidden group",
                "bg-white border-slate-200",
                colorMap[colorClass]
            )}
          >
              <div className={cn("p-2.5 rounded-xl mb-3 transition-all duration-300", iconBgMap[colorClass])}>
                  <Icon className="w-5 h-5" />
              </div>
              <div className={cn("text-3xl font-black transition-colors", isActive ? 'text-slate-900' : 'text-slate-700')}>{count}</div>
              <div className={cn("text-sm font-semibold transition-colors", isActive ? 'text-slate-700' : 'text-slate-500')}>{label}</div>
              {isActive && (
                <div className={cn("absolute bottom-0 left-0 w-full h-1.5 transition-all", barColorMap[colorClass])} />
              )}
              {count > 0 && !isActive && (
                <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              )}
          </button>
      );
  };

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
                                <TableHead className="pl-6 font-semibold text-slate-600">Cliente</TableHead>
                                <TableHead className="font-semibold text-slate-600 hidden md:table-cell">Servicio</TableHead>
                                <TableHead className="font-semibold text-slate-600 hidden sm:table-cell">Entrega</TableHead>
                                <TableHead className="font-semibold text-slate-600">Total</TableHead>
                                <TableHead className="text-right pr-6 font-semibold text-slate-600">Acción Rápida</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredOrders.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-40 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                                                <Sparkles className="h-8 w-8 text-slate-300" />
                                            </div>
                                            <p className="font-medium">No hay pedidos {statusFilter !== 'all' ? `"${STATUS_CONFIG[statusFilter as keyof typeof STATUS_CONFIG]?.label}"` : ''}</p>
                                            <p className="text-xs">Los nuevos pedidos aparecerán aquí</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredOrders.map((order) => {
                                    const delivery = order.deliveryDate?.toDate ? order.deliveryDate.toDate() : null;
                                    const isPaid = order.paymentStatus === 'pagado' || order.paymentMethod !== 'pagar_al_retiro';
                                    const statusConfig = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG];
                                    const StatusIcon = statusConfig?.icon || Clock;
                                    const NextIcon = statusConfig?.nextIcon;
                                    const isProcessing = isLoading === order.id;
                                    
                                    return (
                                        <TableRow 
                                            key={order.id} 
                                            className={cn(
                                                "group transition-all duration-200 border-b border-slate-100",
                                                isProcessing ? "bg-cyan-50/50" : "hover:bg-gradient-to-r hover:from-cyan-50/40 hover:to-transparent",
                                                expandedOrder === order.id && "bg-slate-50"
                                            )}
                                        >
                                            <TableCell className="pl-6 py-3">
                                                <div className="flex items-center gap-3">
                                                    {/* Indicador de estado con color */}
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all",
                                                        order.status === 'pendiente' && "bg-orange-100 text-orange-600",
                                                        order.status === 'en_progreso' && "bg-blue-100 text-blue-600",
                                                        order.status === 'completado' && "bg-green-100 text-green-600",
                                                        order.status === 'entregado' && "bg-slate-100 text-slate-500"
                                                    )}>
                                                        <StatusIcon className="w-5 h-5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-slate-800 truncate">{order.clientName || 'Cliente'}</p>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">#{order.id.slice(0,5)}</span>
                                                            <Badge className={cn(
                                                                "text-[10px] px-1.5 py-0 h-4 font-bold",
                                                                order.status === 'pendiente' && "bg-orange-100 text-orange-600",
                                                                order.status === 'en_progreso' && "bg-blue-100 text-blue-600",
                                                                order.status === 'completado' && "bg-green-100 text-green-600",
                                                                order.status === 'entregado' && "bg-slate-100 text-slate-500"
                                                            )}>
                                                                {statusConfig?.label}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">
                                                <div className="flex flex-col max-w-[200px]">
                                                    <span className="font-medium text-slate-700 truncate">{order.serviceName || (order.items ? 'Varios Servicios' : 'Servicio')}</span>
                                                    <span className="text-xs text-slate-400">
                                                        {order.items?.length > 0 ? `${order.items.length} ítems` : `${order.quantity} ${order.unit}`}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell">
                                                <div className="flex flex-col text-sm">
                                                    <span className={cn("font-semibold", !delivery ? "text-red-400" : "text-slate-700")}>
                                                        {delivery ? format(delivery, 'dd MMM', {locale: es}) : 'Sin fecha'}
                                                    </span>
                                                    <span className="text-slate-400 text-xs">{order.deliveryTimeStr || ''}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <div className="font-bold text-lg text-slate-800">${Number(order.estimatedTotal || 0).toFixed(2)}</div>
                                                    <span className={cn(
                                                        "text-[10px] font-bold uppercase tracking-wide inline-flex items-center gap-1",
                                                        isPaid ? "text-green-600" : "text-amber-500"
                                                    )}>
                                                        {isPaid ? <><CheckCircle className="w-3 h-3" /> Pagado</> : <><Clock className="w-3 h-3" /> Pendiente</>}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right pr-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    {/* Botón de acción principal grande */}
                                                    {order.status !== 'entregado' && NextIcon && (
                                                        <Button 
                                                            onClick={() => handleQuickStatusChange(order)}
                                                            disabled={isProcessing}
                                                            className={cn(
                                                                "h-10 px-4 rounded-xl font-bold text-sm gap-2 transition-all shadow-md hover:shadow-lg active:scale-95",
                                                                order.status === 'pendiente' && "bg-blue-500 hover:bg-blue-600 text-white",
                                                                order.status === 'en_progreso' && "bg-green-500 hover:bg-green-600 text-white",
                                                                order.status === 'completado' && "bg-purple-500 hover:bg-purple-600 text-white",
                                                            )}
                                                        >
                                                            {isProcessing ? (
                                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <>
                                                                    <NextIcon className="w-4 h-4" />
                                                                    <span className="hidden sm:inline">{statusConfig?.nextLabel}</span>
                                                                </>
                                                            )}
                                                        </Button>
                                                    )}
                                                    
                                                    {order.status === 'entregado' && (
                                                        <Badge className="bg-slate-100 text-slate-500 px-3 py-1.5 text-xs">
                                                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Completado
                                                        </Badge>
                                                    )}
                                                    
                                                    {/* Botones secundarios */}
                                                    <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                                        {order.status !== 'entregado' && (
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button size="icon" variant="ghost" className="h-9 w-9 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg" onClick={() => openEditModal(order)}>
                                                                            <Pencil className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent side="bottom">Editar</TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        )}
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button size="icon" variant="ghost" className="h-9 w-9 text-slate-400 hover:text-cyan-500 hover:bg-cyan-50 rounded-lg" onClick={() => { setDetailsTarget(order); setDetailsModalOpen(true); }}>
                                                                        <Eye className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="bottom">Ver detalles</TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </div>
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

        {/* MODAL: ENTREGAR PEDIDO - Versión Rápida */}
        <Dialog open={deliverModalOpen} onOpenChange={setDeliverModalOpen}>
            <DialogContent className="rounded-3xl sm:max-w-md overflow-hidden p-0">
                {/* Header con gradiente */}
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 text-white text-center">
                    <div className="mx-auto bg-white/20 backdrop-blur p-3 rounded-2xl w-fit mb-3">
                        <PackageCheck className="h-8 w-8" />
                    </div>
                    <DialogTitle className="text-2xl font-bold">Entregar Pedido</DialogTitle>
                    <p className="text-green-100 mt-1">{deliverTarget?.clientName}</p>
                </div>
                
                <div className="p-6 space-y-4">
                    {/* Total prominente */}
                    <div className="bg-slate-50 rounded-2xl p-4 text-center border-2 border-slate-100">
                        <span className="text-sm text-slate-500 font-medium block mb-1">Total a Cobrar</span>
                        <span className="text-4xl font-black text-slate-800">${amountDue.toFixed(2)}</span>
                    </div>
                    
                    {deliverTarget?.paymentMethod === 'pagar_al_retiro' ? (
                        <div className="space-y-4">
                            {/* Botones de monto rápido */}
                            <div className="grid grid-cols-4 gap-2">
                                {[20, 50, 100, 200].map(amount => (
                                    <button
                                        key={amount}
                                        onClick={() => setPayAmount(String(amount))}
                                        className={cn(
                                            "py-3 rounded-xl font-bold text-sm transition-all active:scale-95",
                                            parseFloat(payAmount) === amount 
                                                ? "bg-cyan-500 text-white shadow-lg" 
                                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                        )}
                                    >
                                        ${amount}
                                    </button>
                                ))}
                            </div>
                            
                            {/* Input de pago */}
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">$</span>
                                <Input 
                                    type="number" 
                                    className="pl-9 h-14 rounded-xl text-2xl font-bold border-2 border-slate-200 text-center focus:border-cyan-400" 
                                    placeholder="0.00" 
                                    value={payAmount} 
                                    onChange={(e) => setPayAmount(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            
                            {/* Cambio */}
                            {parseFloat(payAmount) >= amountDue && (
                                <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 flex justify-between items-center animate-in fade-in duration-200">
                                    <span className="text-green-700 font-semibold flex items-center gap-2">
                                        <Banknote className="w-5 h-5" /> Cambio:
                                    </span>
                                    <span className="text-3xl font-black text-green-600">${changeDue.toFixed(2)}</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 text-center">
                            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                            <p className="font-bold text-green-700 text-lg">¡Ya está pagado!</p>
                            <p className="text-green-600 text-sm capitalize">{deliverTarget?.paymentMethod?.replace(/_/g, ' ')}</p>
                        </div>
                    )}
                </div>
                
                {/* Footer con botones */}
                <div className="p-4 bg-slate-50 border-t flex gap-3">
                    <Button 
                        variant="outline" 
                        onClick={() => { setDeliverModalOpen(false); setDeliverTarget(null); setPayAmount(''); }} 
                        className="flex-1 h-12 rounded-xl font-semibold"
                    >
                        Cancelar
                    </Button>
                    <Button 
                        onClick={markDelivered} 
                        disabled={(deliverTarget?.paymentMethod === 'pagar_al_retiro' && parseFloat(payAmount || '0') < amountDue) || isLoading === deliverTarget?.id}
                        className="flex-1 h-12 rounded-xl font-bold bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-200 gap-2"
                    >
                        {isLoading === deliverTarget?.id ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <PackageCheck className="w-5 h-5" />
                                Confirmar
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>

        {/* MODAL: DETALLES COMPLETOS */}
        <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
            <DialogContent className="rounded-2xl sm:max-w-md overflow-hidden">
                <DialogHeader className="bg-slate-50 p-6 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-xl text-slate-800">Detalles del Pedido</DialogTitle>
                        <Badge variant="outline" className="bg-white font-mono">#{detailsTarget?.id.slice(0,5).toUpperCase()}</Badge>
                    </div>
                </DialogHeader>
                <div className="p-6 space-y-4 text-sm max-h-[60vh] overflow-y-auto">
                    {/* Cliente */}
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                        <div className="h-10 w-10 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600"><User className="h-5 w-5" /></div>
                        <div className="flex-1">
                            <p className="font-semibold text-slate-700">{detailsTarget?.clientName || detailsTarget?.userName || 'Cliente'}</p>
                            <p className="text-xs text-slate-500">{detailsTarget?.clientEmail || detailsTarget?.userEmail || 'Sin correo'}</p>
                        </div>
                        {detailsTarget?.phone && (
                            <a href={`tel:${detailsTarget.phone}`} className="text-cyan-600 hover:text-cyan-700 text-xs font-medium bg-cyan-50 px-2 py-1 rounded-lg">
                                📞 {detailsTarget.phone}
                            </a>
                        )}
                    </div>
                    
                    {/* Servicios */}
                    {detailsTarget?.items && detailsTarget.items.length > 0 && (
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                            <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 pb-1">
                                <span>Servicio</span>
                                <span>Subtotal</span>
                            </div>
                            {detailsTarget.items.map((it: any, i: number) => (
                                <div key={i} className="flex justify-between text-sm">
                                    <span className="text-slate-700">
                                        {it.serviceName} 
                                        <span className="text-slate-400 text-xs"> x{it.quantity} {it.unit || ''}</span>
                                    </span>
                                    <span className="font-medium text-slate-900">${Number(it.subtotal || 0).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Info importante */}
                    {(() => {
                        const isPaidDetail = detailsTarget?.paymentStatus === 'pagado' || detailsTarget?.paymentMethod !== 'pagar_al_retiro';
                        return (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-green-50 p-3 rounded-xl border border-green-100">
                                    <span className="text-xs text-green-600 uppercase font-semibold">Total</span>
                                    <p className="text-green-700 font-bold text-xl">${Number(detailsTarget?.estimatedTotal || 0).toFixed(2)}</p>
                                </div>
                                <div className={cn("p-3 rounded-xl border", isPaidDetail ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100")}>
                                    <span className={cn("text-xs uppercase font-semibold", isPaidDetail ? "text-green-600" : "text-red-600")}>Estado Pago</span>
                                    <p className={cn("font-bold text-lg", isPaidDetail ? 'text-green-600' : 'text-red-500')}>
                                        {isPaidDetail ? '✓ Pagado' : '⏳ Pendiente'}
                                    </p>
                                    <p className={cn("text-xs capitalize mt-1", isPaidDetail ? "text-green-600" : "text-red-400")}>
                                        {detailsTarget?.paymentMethod?.replace(/_/g, ' ') || 'Por definir'}
                                    </p>
                                </div>
                            </div>
                        );
                    })()}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="text-xs text-slate-400 uppercase font-semibold">Fecha Pedido</span>
                            <div className="flex items-center gap-1.5 text-slate-600">
                                <CalendarDays className="w-3.5 h-3.5" />
                                {detailsTarget?.createdAt?.toDate ? format(detailsTarget.createdAt.toDate(), 'dd MMM HH:mm', {locale: es}) : '-'}
                            </div>
                        </div>
                        <div>
                            <span className="text-xs text-slate-400 uppercase font-semibold">Entrega Programada</span>
                            <div className="flex items-center gap-1.5 text-slate-600">
                                <Clock className="w-3.5 h-3.5" />
                                {detailsTarget?.deliveryDate?.toDate ? format(detailsTarget.deliveryDate.toDate(), 'dd MMM', {locale: es}) : detailsTarget?.date || '-'} {detailsTarget?.deliveryTimeStr || detailsTarget?.time || ''}
                            </div>
                        </div>
                        <div>
                            <span className="text-xs text-slate-400 uppercase font-semibold">Método Pago</span>
                            <p className="text-slate-700 font-medium capitalize">{detailsTarget?.paymentMethod?.replace('_', ' ') || 'Por definir'}</p>
                        </div>
                        <div>
                            <span className="text-xs text-slate-400 uppercase font-semibold">Atendido Por</span>
                            <p className="text-slate-700 font-medium flex items-center gap-1.5">
                                <CheckCircle className="w-3.5 h-3.5 text-cyan-500" />
                                {detailsTarget?.attendedBy || detailsTarget?.staffName || 'Sistema'}
                            </p>
                        </div>
                    </div>
                    
                    {/* Notas */}
                    {detailsTarget?.notes && (
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                            <div className="flex items-start gap-2">
                                <FileText className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                                <div>
                                    <span className="text-xs font-bold text-amber-700 block mb-0.5">Notas del Cliente:</span>
                                    <p className="text-amber-800 italic">{detailsTarget.notes}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Info de entrega si ya fue entregado */}
                    {detailsTarget?.status === 'entregado' && detailsTarget?.deliveredAt && (
                        <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
                            <div className="flex items-start gap-2">
                                <PackageCheck className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                                <div>
                                    <span className="text-xs font-bold text-purple-700 block mb-0.5">Entregado</span>
                                    <p className="text-purple-800 text-xs">
                                        Por: {detailsTarget.deliveredBy || 'Personal'} • 
                                        {detailsTarget.deliveredAt?.toDate ? format(detailsTarget.deliveredAt.toDate(), ' dd MMM HH:mm', {locale: es}) : ''}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <DialogFooter className="bg-slate-50 p-4 border-t border-slate-100">
                    <Button variant="outline" className="w-full rounded-xl" onClick={() => setDetailsModalOpen(false)}>Cerrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* MODAL: SELECTOR DE SERVICIOS */}
        <Dialog open={showServicePicker} onOpenChange={setShowServicePicker}>
            <DialogContent className="rounded-2xl sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Agregar Servicio</DialogTitle>
                    <DialogDescription>Selecciona un servicio existente o crea uno personalizado.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2 max-h-[300px] overflow-y-auto">
                    {servicesList.map((service) => {
                        const alreadyAdded = editItems.some(i => i.serviceId === service.id);
                        return (
                            <button
                                key={service.id}
                                onClick={() => !alreadyAdded && handleSelectService(service)}
                                disabled={alreadyAdded}
                                className={cn(
                                    "w-full p-3 rounded-xl border text-left flex justify-between items-center transition-all",
                                    alreadyAdded 
                                        ? "bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed"
                                        : "bg-white border-slate-200 hover:border-cyan-400 hover:bg-cyan-50"
                                )}
                            >
                                <div>
                                    <p className="font-medium text-slate-700">{service.name}</p>
                                    <p className="text-xs text-slate-400">${service.price.toFixed(2)} / {service.unit}</p>
                                </div>
                                {alreadyAdded ? (
                                    <Badge variant="secondary" className="text-xs">Ya agregado</Badge>
                                ) : (
                                    <Plus className="w-4 h-4 text-cyan-600" />
                                )}
                            </button>
                        );
                    })}
                </div>
                <div className="border-t pt-4">
                    <Button 
                        variant="outline" 
                        onClick={handleAddCustomItem}
                        className="w-full rounded-xl border-dashed border-slate-300 text-slate-600 hover:text-cyan-700 hover:border-cyan-300"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Servicio Personalizado
                    </Button>
                </div>
            </DialogContent>
        </Dialog>

        {/* MODAL: EDITAR FECHA/HORA Y CANTIDADES */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
             <DialogContent className="rounded-2xl sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                 <DialogHeader className="border-b pb-4">
                     <DialogTitle>Editar Pedido</DialogTitle>
                     <DialogDescription>Ajusta cantidades, precios y fecha de entrega.</DialogDescription>
                 </DialogHeader>
                 
                 <div className="flex-1 overflow-y-auto py-4 space-y-6">
                     {/* Sección de Items */}
                     <div className="space-y-4">
                         <div className="flex justify-between items-center">
                             <Label className="text-cyan-700 font-bold">Detalle de Servicios</Label>
                             <Button size="sm" variant="outline" onClick={handleAddItem} className="h-8 text-xs gap-1 border-cyan-200 text-cyan-700 hover:bg-cyan-50">
                                 <Plus className="w-3 h-3" /> Agregar
                             </Button>
                         </div>
                         
                         <div className="space-y-3">
                             {editItems.map((item, idx) => (
                                 <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3 relative group">
                                     <div className="pr-8">
                                         {item.isCustom ? (
                                             <Input 
                                                 value={item.serviceName}
                                                 onChange={(e) => handleItemChange(idx, 'serviceName', e.target.value)}
                                                 className="font-medium border-slate-200 bg-white h-9 text-sm"
                                                 placeholder="Nombre del servicio"
                                             />
                                         ) : (
                                             <div className="font-medium text-slate-700 text-sm bg-white h-9 flex items-center px-3 rounded-md border border-slate-200">
                                                 {item.serviceName}
                                             </div>
                                         )}
                                     </div>
                                     
                                     <button 
                                         onClick={() => handleRemoveItem(idx)}
                                         className="absolute top-3 right-3 text-slate-400 hover:text-red-500 transition-colors p-1"
                                     >
                                         <Trash2 className="w-4 h-4" />
                                     </button>
                                     
                                     <div className="flex gap-3 items-end">
                                         <div className="flex-1 space-y-1">
                                             <Label className="text-[10px] text-slate-500 uppercase font-bold">Cant.</Label>
                                             <Input 
                                                 type="number"
                                                 value={item.quantity}
                                                 onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                                                 className="h-9 bg-white text-center"
                                             />
                                         </div>
                                         {/* Solo mostrar campo de precio si NO tiene precio (isCustom o priceUnit === 0) */}
                                         {(item.isCustom || item.priceUnit === 0) && (
                                             <div className="flex-1 space-y-1">
                                                 <Label className="text-[10px] text-slate-500 uppercase font-bold">Precio Unit.</Label>
                                                 <div className="relative">
                                                     <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                                                     <Input 
                                                         type="number"
                                                         value={item.priceUnit}
                                                         onChange={(e) => handleItemChange(idx, 'priceUnit', e.target.value)}
                                                         className="h-9 pl-5 bg-white"
                                                         placeholder="0.00"
                                                     />
                                                 </div>
                                             </div>
                                         )}
                                         <div className="flex-1 space-y-1">
                                             <Label className="text-[10px] text-slate-500 uppercase font-bold">Subtotal</Label>
                                             <div className="h-9 flex items-center font-bold text-slate-700 text-sm px-2 bg-slate-100 rounded-md border border-slate-200">
                                                 ${(Number(item.subtotal) || 0).toFixed(2)}
                                             </div>
                                         </div>
                                     </div>
                                 </div>
                             ))}
                         </div>
                         
                         {/* Total */}
                         <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                             <span className="font-bold text-slate-600">Total a Pagar:</span>
                             <span className="font-bold text-2xl text-cyan-600">${editTotal.toFixed(2)}</span>
                         </div>
                     </div>
                     
                     {/* Sección de Método de Pago */}
                     <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                         <Label className="text-slate-700 font-bold text-xs uppercase">Método de Pago</Label>
                         <select 
                             value={editPaymentMethod} 
                             onChange={(e) => setEditPaymentMethod(e.target.value)}
                             className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                         >
                             <option value="pagar_al_retiro">Pagar al Retiro (Pendiente)</option>
                             <option value="efectivo">Efectivo</option>
                             <option value="transferencia">Transferencia</option>
                             <option value="tarjeta">Tarjeta</option>
                         </select>
                     </div>

                     {/* Sección de Fecha */}
                     <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                         <Label className="text-slate-700 font-bold text-xs uppercase">Fecha de Entrega</Label>
                         <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1">
                                 <Label className="text-xs text-slate-500">Fecha</Label>
                                 <Input 
                                     type="date" 
                                     value={editDate} 
                                     onChange={(e) => setEditDate(e.target.value)} 
                                     className="h-9 bg-white rounded-lg" 
                                     min={todayStr}
                                 />
                             </div>
                             <div className="space-y-1">
                                 <Label className="text-xs text-slate-500">Hora</Label>
                                 <Input 
                                     type="time" 
                                     value={editTime} 
                                     onChange={(e) => setEditTime(e.target.value)} 
                                     className="h-9 bg-white rounded-lg" 
                                     min={editDate === todayStr ? nowTimeStr : undefined}
                                 />
                             </div>
                         </div>
                     </div>
                 </div>
                 
                 <DialogFooter className="border-t pt-4">
                     <Button variant="outline" onClick={() => setEditModalOpen(false)} className="rounded-xl">Cancelar</Button>
                     <Button onClick={saveEdit} className="bg-cyan-600 hover:bg-cyan-700 rounded-xl text-white gap-2">
                         <Save className="w-4 h-4" /> Guardar Cambios
                     </Button>
                 </DialogFooter>
             </DialogContent>
        </Dialog>

    </div>
  );
}