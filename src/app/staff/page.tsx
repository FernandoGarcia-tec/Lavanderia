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
  RefreshCw,
  Printer,
  Maximize2,
  Minimize2,
  Usb,
  Loader2
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScaleInput } from '@/components/scale-input';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useFirestore, useAuth } from '@/firebase/provider';
import { collection, addDoc, query, where, getDocs, serverTimestamp, onSnapshot, orderBy, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useThermalPrinter } from '@/hooks/use-thermal-printer';
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Mensajes de notificación por estado
const STATUS_NOTIFICATION_MESSAGES: Record<string, { title: string; message: string }> = {
  en_progreso: { title: '🔄 Pedido en Proceso', message: 'Tu ropa está siendo lavada' },
  completado: { title: '✅ ¡Pedido Listo!', message: 'Tu ropa está lista para recoger' },
  entregado: { title: '📦 Pedido Entregado', message: '¡Gracias por tu preferencia!' },
};

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
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
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
  
  // Hook de impresora térmica USB
  const thermalPrinter = useThermalPrinter();
  
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
      
      // Crear notificación para el cliente
      const notifConfig = STATUS_NOTIFICATION_MESSAGES[config.next];
      if (notifConfig && order.userId) {
        await addDoc(collection(firestore, 'notifications'), {
          userId: order.userId,
          orderId: order.id,
          type: 'status_change',
          title: notifConfig.title,
          message: notifConfig.message,
          status: config.next,
          read: false,
          createdAt: serverTimestamp(),
        });
      }
      
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
      
      // Crear notificación de entrega para el cliente
      const notifConfig = STATUS_NOTIFICATION_MESSAGES['entregado'];
      if (notifConfig && deliverTarget.userId) {
        await addDoc(collection(firestore, 'notifications'), {
          userId: deliverTarget.userId,
          orderId: deliverTarget.id,
          type: 'status_change',
          title: notifConfig.title,
          message: notifConfig.message,
          status: 'entregado',
          read: false,
          createdAt: serverTimestamp(),
        });
      }
      
      toast({ title: '🎉 ¡Entrega Exitosa!', description: `Entregado a ${deliverTarget.clientName || 'Cliente'}.` });
      
      // Imprimir recibo automáticamente al completar - con estado actualizado
      const orderForPrint = {
        ...deliverTarget,
        paymentStatus: 'pagado',
        paymentMethod: deliverTarget.paymentMethod === 'pagar_al_retiro' 
          ? (parseFloat(payAmount) > 0 ? 'efectivo' : 'efectivo') 
          : deliverTarget.paymentMethod,
        status: 'entregado'
      };
      handlePrintReceipt(orderForPrint);
      
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
        updates.estimatedTotal = editItems.map(i => (i.subtotal || 0)).reduce((a,b) => a + b, 0);
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

  // Guardar configuración de impresora
  const savePrinterConfig = (config: { showDialog: boolean; printerName: string }) => {
    setPrinterConfig(config);
    localStorage.setItem('printerConfig', JSON.stringify(config));
  };

  // Estado para el modal de vista previa de recibo
  const [receiptPreviewOpen, setReceiptPreviewOpen] = useState(false);
  const [receiptPreviewData, setReceiptPreviewData] = useState<any>(null);

  // Componente de vista previa de recibo para imprimir
  function ReceiptPreviewModal() {
    const data = receiptPreviewData;
    if (!data) return null;
    const paymentLabels: Record<string, string> = {
      'efectivo': 'Efectivo',
      'terminal': 'Tarjeta',
      'transferencia': 'Transferencia',
      'pagar_al_retiro': 'Pago Pendiente'
    };
    return (
      <Dialog open={receiptPreviewOpen} onOpenChange={setReceiptPreviewOpen}>
        <DialogContent className="max-w-xs p-0">
          <div className="p-4 print:p-0 bg-white">
            <div className="text-center font-bold text-base">LAVANDERÍA Y PLANCHADURIA ANGY</div>
            <div className="text-center text-xs">Servicio de Calidad</div>
            <hr className="my-2 border-dashed border-gray-400" />
            <div className="text-center font-bold">Folio: {(data.id || '').slice(0,6).toUpperCase()}</div>
            <div className="text-center text-xs">{data.createdAt ? (typeof data.createdAt === 'string' ? data.createdAt : (data.createdAt.toLocaleString ? data.createdAt.toLocaleString('es-MX') : '')) : ''}</div>
            <hr className="my-2 border-dashed border-gray-400" />
            <div>Cliente: <span className="font-bold">{data.clientName || ''}</span></div>
            {data.clientPhone && <div>Tel: {data.clientPhone}</div>}
            <div>Atendió: {data.staffName || ''}</div>
            <hr className="my-2 border-dashed border-gray-400" />
            <div className="font-bold">SERVICIOS:</div>
            {(data.items || []).map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between text-xs">
                <span>{item.serviceName} x{item.quantity}{item.unit === 'kg' ? 'kg' : 'pz'}</span>
                <span>${Number(item.subtotal).toFixed(2)}</span>
              </div>
            ))}
            <hr className="my-2 border-dashed border-gray-400" />
            <div className="font-bold">TOTAL: ${Number(data.estimatedTotal || data.total || 0).toFixed(2)}</div>
            <div>Pago: {paymentLabels[data.paymentMethod] || data.paymentMethod || ''}</div>
            <hr className="my-2 border-dashed border-gray-400" />
            <div>ENTREGA: <span className="font-bold">{data.deliveryDate ? (typeof data.deliveryDate === 'string' ? data.deliveryDate : (data.deliveryDate.toLocaleDateString ? data.deliveryDate.toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: '2-digit' }) : '')) : ''}</span></div>
            {data.notes && <div className="text-xs">Notas: {data.notes}</div>}
            <hr className="my-2 border-dashed border-gray-400" />
            <div className="text-center text-xs">¡Gracias por su preferencia!</div>
            <div className="text-center text-xs">lavanderiaangy.vercel.app</div>
            <div className="text-center text-xs">Conserve este ticket</div>
          </div>
          <DialogFooter className="mt-2 flex gap-2">
            <Button onClick={() => window.print()} className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white">Imprimir</Button>
            <Button variant="outline" onClick={() => setReceiptPreviewOpen(false)} className="flex-1">Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Abrir modal de impresión
  const openPrintModal = (order: any) => {
    setPrintTarget(order);
    setPrintModalOpen(true);
  };

  // Función para imprimir recibo - Con soporte USB directo para tablets
  const handlePrintReceipt = async (order: any, showDialogOverride?: boolean) => {
    if (!order) return;
    const items = order.items || [{ 
      serviceName: order.serviceName || 'Servicio', 
      quantity: order.quantity || 1, 
      unit: order.unit || 'pza', 
      subtotal: order.estimatedTotal || 0 
    }];
    const receiptData = {
      id: order.id || 'NUEVO',
      clientName: order.clientName || order.userName || 'Cliente',
      clientPhone: order.clientPhone || order.phone,
      staffName: order.staffName || order.attendedBy || staffName || 'Personal',
      items,
      estimatedTotal: Number(order.estimatedTotal || 0),
      paymentMethod: order.paymentMethod || 'efectivo',
      deliveryDate: order.deliveryDate?.toDate ? order.deliveryDate.toDate() : new Date(),
      createdAt: order.createdAt?.toDate ? order.createdAt.toDate() : new Date(),
      notes: order.notes,
      amountPaid: order.amountPaid,
      change: order.change,
    };
    try {
      const success = await thermalPrinter.printReceipt(receiptData);
      if (success) {
        toast({ title: "✅ Impreso", description: "Recibo enviado a la impresora" });
        setPrintModalOpen(false);
        setPrintTarget(null);
      } else {
        setReceiptPreviewData(receiptData);
        setReceiptPreviewOpen(true);
        toast({ 
          title: "Error de impresión USB", 
          description: thermalPrinter.error || "No se pudo imprimir por USB. Usando impresión estándar.", 
          variant: "destructive" 
        });
      }
    } catch (err) {
      setReceiptPreviewData(receiptData);
      setReceiptPreviewOpen(true);
      toast({ 
        title: "Error de impresión", 
        description: (err && (err as any).message) || "No se pudo imprimir. Usando impresión estándar.", 
        variant: "destructive" 
      });
    }
    // Abrir ventana de impresión estándar
    const data = receiptData;
    const paymentLabels: Record<string, string> = {
      'efectivo': 'Efectivo',
      'terminal': 'Tarjeta',
      'transferencia': 'Transferencia',
      'pagar_al_retiro': 'Pago Pendiente'
    };
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (!printWindow) {
      toast({ title: "Error", description: "No se pudo abrir la ventana de impresión. Verifica los bloqueadores de pop-ups.", variant: "destructive" });
      return;
    }
    // HTML optimizado y simple
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <title>Recibo #${data.id}</title>
          <style>
              body { font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #000; margin: 0; padding: 0; }
              .r { text-align: right; }
              .c { text-align: center; }
              .b { font-weight: bold; }
              .s { font-size: 10px; }
              .box { border-top:1px dashed #000; margin:6px 0; }
          </style>
      </head>
      <body>
          <div class="c b">LAVANDERÍA Y PLANCHADURIA ANGY</div>
          <div class="c s">Servicio de Calidad</div>
          <div class="box"></div>
          <div class="c b">Folio: ${(data.id || '').slice(0,6).toUpperCase()}</div>
          <div class="c s">${data.createdAt ? (typeof data.createdAt === 'string' ? data.createdAt : (data.createdAt.toLocaleString ? data.createdAt.toLocaleString('es-MX') : '')) : ''}</div>
          <div class="box"></div>
          <div>Cliente: <span class="b">${data.clientName || ''}</span></div>
          ${data.clientPhone ? `<div>Tel: ${data.clientPhone}</div>` : ''}
          <div>Atendió: ${data.staffName || ''}</div>
          <div class="box"></div>
          <div class="b">SERVICIOS:</div>
          ${(data.items || []).map((item: any) => `
              <div><span>${item.serviceName} x${item.quantity}${item.unit === 'kg' ? 'kg' : 'pz'}</span><span class="r">$${Number(item.subtotal).toFixed(2)}</span></div>
          `).join('')}
          <div class="box"></div>
          <div class="b">TOTAL: $${Number(data.estimatedTotal || 0).toFixed(2)}</div>
          <div>Pago: ${paymentLabels[data.paymentMethod] || data.paymentMethod || ''}</div>
          <div class="box"></div>
          <div>ENTREGA: <span class="b">${data.deliveryDate ? (typeof data.deliveryDate === 'string' ? data.deliveryDate : (data.deliveryDate.toLocaleDateString ? data.deliveryDate.toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: '2-digit' }) : '')) : ''}</span></div>
          ${data.notes ? `<div class="s">Notas: ${data.notes}</div>` : ''}
          <div class="box"></div>
          <div class="c s">¡Gracias por su preferencia!</div>
          <div class="c s">lavanderiaangy.vercel.app</div>
          <div class="c s">Conserve este ticket</div>
          <script>
              document.addEventListener('DOMContentLoaded', function() {
                  window.print();
              });
          </script>
      </body>
      </html>
    `;
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
  };

  // --- Componentes ---

  // Tarjeta de estado mejorada con animaciones - Optimizada para táctil
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
                "flex flex-col items-start p-4 lg:p-5 rounded-xl lg:rounded-2xl border-2 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] w-full text-left relative overflow-hidden group min-h-[100px] lg:min-h-[120px]",
                "bg-white border-slate-200",
                colorMap[colorClass]
            )}
          >
              <div className={cn("p-2 lg:p-2.5 rounded-lg lg:rounded-xl mb-2 lg:mb-3 transition-all duration-300", iconBgMap[colorClass])}>
                  <Icon className="w-5 h-5 lg:w-6 lg:h-6" />
              </div>
              <div className={cn("text-2xl lg:text-3xl xl:text-4xl font-black transition-colors", isActive ? 'text-slate-900' : 'text-slate-700')}>{count}</div>
              <div className={cn("text-sm lg:text-base font-semibold transition-colors", isActive ? 'text-slate-700' : 'text-slate-500')}>{label}</div>
              {isActive && (
                <div className={cn("absolute bottom-0 left-0 w-full h-1 lg:h-1.5 transition-all", barColorMap[colorClass])} />
              )}
              {count > 0 && !isActive && (
                <div className="absolute top-3 right-3 w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-cyan-400 animate-pulse" />
              )}
          </button>
      );
  };

  // --- Funciones de Pantalla Completa ---
  const enterFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if ((elem as any).webkitRequestFullscreen) {
      (elem as any).webkitRequestFullscreen();
    } else if ((elem as any).msRequestFullscreen) {
      (elem as any).msRequestFullscreen();
    }
  };

  const exitFullscreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) {
      (document as any).webkitExitFullscreen();
    } else if ((document as any).msExitFullscreen) {
      (document as any).msExitFullscreen();
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      enterFullscreen();
    } else {
      exitFullscreen();
    }
  };

  // Detectar cambios en el estado de pantalla completa
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Estado para configuración de impresora
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printTarget, setPrintTarget] = useState<any | null>(null);
  const [printerConfig, setPrinterConfig] = useState<{
    showDialog: boolean;
    printerName: string;
  }>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('printerConfig');
      return saved ? JSON.parse(saved) : { showDialog: true, printerName: '' };
    }
    return { showDialog: true, printerName: '' };
  });

  return (
    <div className="min-h-screen font-sans p-3 md:p-6 lg:p-8 relative pos-mode">
        <div className="max-w-[1800px] mx-auto space-y-4 lg:space-y-6">
            
            {/* Header - Compacto en pantallas grandes */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-2">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl lg:text-3xl font-bold text-white drop-shadow-md flex items-center gap-3">
                      Panel del Personal
                      {/* Botón de impresora USB */}
                      
                    </h1>
                    <p className="text-cyan-50 font-medium text-base lg:text-lg opacity-90">
                        Hola, {staffName || 'Colaborador'}. Aquí está el resumen de hoy
                    </p>
                </div>
                {/* Botón de Pantalla Completa */}
                <Button 
                  onClick={toggleFullscreen} 
                  variant="outline" 
                  size="sm"
                  className="bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30 hover:text-white rounded-xl shadow-md"
                >
                  {isFullscreen ? (
                    <>
                      <Minimize2 className="h-4 w-4 mr-2" />
                      Salir Pantalla Completa
                    </>
                  ) : (
                    <>
                      <Maximize2 className="h-4 w-4 mr-2" />
                      Pantalla Completa
                    </>
                  )}
                </Button>
            </div>

            {/* Filtros - Grid optimizado para 1920px */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                <StatusCard id="pendiente" label="Pendientes" count={counts.pendiente} icon={Clock} colorClass="orange" />
                <StatusCard id="en_progreso" label="En Proceso" count={counts.en_progreso} icon={PlayCircle} colorClass="blue" />
                <StatusCard id="completado" label="Listos" count={counts.completado} icon={CheckCircle} colorClass="green" />
                <StatusCard id="entregado" label="Entregados" count={counts.entregado} icon={PackageCheck} colorClass="slate" />
            </div>

            {/* Tabla - Optimizada para táctil */}
            <Card className="border-0 shadow-xl overflow-hidden rounded-2xl lg:rounded-3xl">
                <CardHeader className="bg-white border-b border-slate-100 pb-3 pt-4 lg:pb-4 lg:pt-6 px-4 lg:px-6">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-3 lg:gap-4">
                        <div>
                            <CardTitle className="text-lg lg:text-xl text-slate-800">Ordenes de Servicio</CardTitle>
                            <CardDescription className="text-sm">Gestión de flujo de trabajo</CardDescription>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="relative w-full sm:w-72 lg:w-80 group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-cyan-600 transition-colors" />
                                <Input 
                                    placeholder="Buscar pedido..." 
                                    className="pl-10 h-12 text-base rounded-xl border-slate-200 bg-slate-50 focus:bg-white transition-all focus-visible:ring-cyan-500"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            {statusFilter !== 'all' && (
                                <Button variant="ghost" size="sm" onClick={() => setStatusFilter('all')} className="h-12 px-4 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-xl">
                                    <X className="h-5 w-5 mr-1" /> Limpiar
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50/80">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="pl-4 lg:pl-6 font-semibold text-slate-600 text-sm lg:text-base">Cliente</TableHead>
                                <TableHead className="font-semibold text-slate-600 hidden lg:table-cell text-sm lg:text-base">Servicio</TableHead>
                                <TableHead className="font-semibold text-slate-600 hidden md:table-cell text-sm lg:text-base">Entrega</TableHead>
                                <TableHead className="font-semibold text-slate-600 text-sm lg:text-base">Total</TableHead>
                                <TableHead className="text-right pr-4 lg:pr-6 font-semibold text-slate-600 text-sm lg:text-base">Acción</TableHead>
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
                                    const isPaid = order.paymentStatus === 'pagado' || (order.paymentMethod && order.paymentMethod !== 'pagar_al_retiro');
                                    const statusConfig = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG];
                                    const StatusIcon = statusConfig?.icon || Clock;
                                    const NextIcon = statusConfig?.nextIcon;
                                    const isProcessing = isLoading === order.id;
                                    
                                    return (
                                        <TableRow 
                                            key={order.id} 
                                            className={cn(
                                                "group transition-all duration-200 border-b border-slate-100 min-h-[60px] lg:min-h-[72px]",
                                                isProcessing ? "bg-cyan-50/50" : "hover:bg-gradient-to-r hover:from-cyan-50/40 hover:to-transparent",
                                                expandedOrder === order.id && "bg-slate-50"
                                            )}
                                        >
                                            <TableCell className="pl-4 lg:pl-6 py-3 lg:py-4">
                                                <div className="flex items-center gap-2 lg:gap-3">
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
                                                <div className="flex items-center justify-end gap-2 lg:gap-3">
                                                    {/* Botón de acción principal grande - Optimizado para táctil */}
                                                    {order.status !== 'entregado' && NextIcon && (
                                                        <Button 
                                                            onClick={() => handleQuickStatusChange(order)}
                                                            disabled={isProcessing}
                                                            className={cn(
                                                                "h-11 lg:h-12 px-4 lg:px-5 rounded-xl lg:rounded-2xl font-bold text-sm lg:text-base gap-2 transition-all shadow-md hover:shadow-lg active:scale-95",
                                                                order.status === 'pendiente' && "bg-blue-500 hover:bg-blue-600 text-white",
                                                                order.status === 'en_progreso' && "bg-green-500 hover:bg-green-600 text-white",
                                                                order.status === 'completado' && "bg-purple-500 hover:bg-purple-600 text-white",
                                                            )}
                                                        >
                                                            {isProcessing ? (
                                                                <RefreshCw className="w-5 h-5 animate-spin" />
                                                            ) : (
                                                                <>
                                                                    <NextIcon className="w-5 h-5" />
                                                                    <span className="hidden sm:inline">{statusConfig?.nextLabel}</span>
                                                                </>
                                                            )}
                                                        </Button>
                                                    )}
                                                    
                                                    {order.status === 'entregado' && (
                                                        <Badge className="bg-slate-100 text-slate-500 px-4 py-2 text-sm lg:text-base">
                                                            <CheckCircle className="w-4 h-4 mr-1" /> Completado
                                                        </Badge>
                                                    )}
                                                    
                                                    {/* Botones secundarios - Más grandes para táctil */}
                                                    <div className="flex gap-1 lg:gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                        {order.status !== 'entregado' && (
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button size="icon" variant="ghost" className="h-10 w-10 lg:h-11 lg:w-11 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-xl" onClick={() => openEditModal(order)}>
                                                                            <Pencil className="h-5 w-5" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent side="bottom">Editar</TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        )}
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button size="icon" variant="ghost" className="h-10 w-10 lg:h-11 lg:w-11 text-slate-400 hover:text-cyan-500 hover:bg-cyan-50 rounded-xl" onClick={() => { setDetailsTarget(order); setDetailsModalOpen(true); }}>
                                                                        <Eye className="h-5 w-5" />
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

        {/* MODAL: APERTURA DE CAJA - Optimizado para táctil */}
        <Dialog open={showModal} onOpenChange={(open) => { if(!open) return; setShowModal(open); }}>
            <DialogContent className="rounded-2xl sm:max-w-md [&>button]:hidden" onPointerDownOutside={e => e.preventDefault()} onEscapeKeyDown={e => e.preventDefault()}>
                <DialogHeader>
                    <div className="mx-auto w-14 h-14 bg-cyan-100 rounded-full flex items-center justify-center mb-2 text-cyan-600"><Banknote className="h-7 w-7" /></div>
                    <DialogTitle className="text-center text-xl lg:text-2xl text-slate-800">Apertura de Caja</DialogTitle>
                    <DialogDescription className="text-center text-base">Ingresa el monto inicial para comenzar.</DialogDescription>
                </DialogHeader>
                <div className="py-6 flex justify-center">
                    <div className="relative w-full max-w-[220px]">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-lg">$</span>
                        <Input type="number" step="0.01" className="pl-9 text-center text-3xl font-bold h-16 rounded-xl border-slate-200 focus-visible:ring-cyan-500" value={openingAmount} onChange={(e) => setOpeningAmount(e.target.value)} placeholder="0.00" />
                    </div>
                </div>
                <DialogFooter className="sm:justify-center"><Button onClick={saveOpening} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl h-14 text-lg font-bold">Confirmar Apertura</Button></DialogFooter>
            </DialogContent>
        </Dialog>

        {/* MODAL: ENTREGAR PEDIDO - Optimizado para táctil POS */}
        <Dialog open={deliverModalOpen} onOpenChange={setDeliverModalOpen}>
            <DialogContent className="rounded-3xl sm:max-w-lg overflow-hidden p-0">
                {/* Header con gradiente */}
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 lg:p-8 text-white text-center">
                    <div className="mx-auto bg-white/20 backdrop-blur p-4 rounded-2xl w-fit mb-3">
                        <PackageCheck className="h-10 w-10" />
                    </div>
                    <DialogTitle className="text-2xl lg:text-3xl font-bold">Entregar Pedido</DialogTitle>
                    <p className="text-green-100 mt-1 text-lg">{deliverTarget?.clientName}</p>
                </div>
                
                <div className="p-6 lg:p-8 space-y-5">
                    {/* Total prominente */}
                    <div className="bg-slate-50 rounded-2xl p-5 text-center border-2 border-slate-100">
                        <span className="text-sm lg:text-base text-slate-500 font-medium block mb-1">Total a Cobrar</span>
                        <span className="text-4xl lg:text-5xl font-black text-slate-800">${amountDue.toFixed(2)}</span>
                    </div>
                    
                    {deliverTarget?.paymentMethod === 'pagar_al_retiro' ? (
                        <div className="space-y-5">
                            {/* Botones de monto rápido - Más grandes para táctil */}
                            <div className="grid grid-cols-4 gap-3">
                                {[20, 50, 100, 200].map(amount => (
                                    <button
                                        key={amount}
                                        onClick={() => setPayAmount(String(amount))}
                                        className={cn(
                                            "py-4 rounded-xl font-bold text-base lg:text-lg transition-all active:scale-95",
                                            parseFloat(payAmount) === amount 
                                                ? "bg-cyan-500 text-white shadow-lg" 
                                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                        )}
                                    >
                                        ${amount}
                                    </button>
                                ))}
                            </div>
                            
                            {/* Input de pago - Más grande */}
                            <div className="relative">
                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl">$</span>
                                <Input 
                                    type="number" 
                                    className="pl-11 h-16 rounded-xl text-3xl font-bold border-2 border-slate-200 text-center focus:border-cyan-400" 
                                    placeholder="0.00" 
                                    value={payAmount} 
                                    onChange={(e) => setPayAmount(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            
                            {/* Cambio */}
                            {parseFloat(payAmount) >= amountDue && (
                                <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5 flex justify-between items-center animate-in fade-in duration-200">
                                    <span className="text-green-700 font-semibold flex items-center gap-2 text-lg">
                                        <Banknote className="w-6 h-6" /> Cambio:
                                    </span>
                                    <span className="text-4xl font-black text-green-600">${changeDue.toFixed(2)}</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-8 text-center">
                            <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto mb-3" />
                            <p className="font-bold text-green-700 text-xl">¡Ya está pagado!</p>
                            <p className="text-green-600 text-base capitalize">{deliverTarget?.paymentMethod?.replace(/_/g, ' ')}</p>
                        </div>
                    )}
                </div>
                
                {/* Footer con botones - Más grandes */}
                <div className="p-5 lg:p-6 bg-slate-50 border-t flex gap-4">
                    <Button 
                        variant="outline" 
                        onClick={() => { setDeliverModalOpen(false); setDeliverTarget(null); setPayAmount(''); }} 
                        className="flex-1 h-14 rounded-xl font-semibold text-base"
                    >
                        Cancelar
                    </Button>
                    <Button 
                        onClick={markDelivered} 
                        disabled={(deliverTarget?.paymentMethod === 'pagar_al_retiro' && parseFloat(payAmount || '0') < amountDue) || isLoading === deliverTarget?.id}
                        className="flex-1 h-14 rounded-xl font-bold text-base bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-200 gap-2"
                    >
                        {isLoading === deliverTarget?.id ? (
                            <RefreshCw className="w-6 h-6 animate-spin" />
                        ) : (
                            <>
                                <PackageCheck className="w-6 h-6" />
                                Confirmar
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>

        {/* MODAL: DETALLES COMPLETOS - Optimizado para POS */}
        <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
            <DialogContent className="rounded-2xl sm:max-w-lg overflow-hidden">
                <DialogHeader className="bg-slate-50 p-6 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-xl lg:text-2xl text-slate-800">Detalles del Pedido</DialogTitle>
                        <Badge variant="outline" className="bg-white font-mono text-base px-3 py-1">#{detailsTarget?.id.slice(0,5).toUpperCase()}</Badge>
                    </div>
                </DialogHeader>
                <div className="p-6 space-y-5 text-sm lg:text-base max-h-[60vh] overflow-y-auto">
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
                        const isPaidDetail = detailsTarget?.paymentStatus === 'pagado' || (detailsTarget?.paymentMethod && detailsTarget?.paymentMethod !== 'pagar_al_retiro');
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
                <DialogFooter className="bg-slate-50 p-5 border-t border-slate-100">
                    <Button variant="outline" className="w-full rounded-xl h-12 text-base" onClick={() => setDetailsModalOpen(false)}>Cerrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* MODAL: SELECTOR DE SERVICIOS - Optimizado para táctil */}
        <Dialog open={showServicePicker} onOpenChange={setShowServicePicker}>
            <DialogContent className="rounded-2xl sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-xl">Agregar Servicio</DialogTitle>
                    <DialogDescription className="text-base">Selecciona un servicio existente o crea uno personalizado.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-3 max-h-[350px] overflow-y-auto">
                    {servicesList.map((service) => {
                        const alreadyAdded = editItems.some(i => i.serviceId === service.id);
                        return (
                            <button
                                key={service.id}
                                onClick={() => !alreadyAdded && handleSelectService(service)}
                                disabled={alreadyAdded}
                                className={cn(
                                    "w-full p-4 rounded-xl border text-left flex justify-between items-center transition-all min-h-[60px]",
                                    alreadyAdded 
                                        ? "bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed"
                                        : "bg-white border-slate-200 hover:border-cyan-400 hover:bg-cyan-50 active:scale-[0.98]"
                                )}
                            >
                                <div>
                                    <p className="font-medium text-slate-700 text-base">{service.name}</p>
                                    <p className="text-sm text-slate-400">${service.price.toFixed(2)} / {service.unit}</p>
                                </div>
                                {alreadyAdded ? (
                                    <Badge variant="secondary" className="text-sm">Ya agregado</Badge>
                                ) : (
                                    <Plus className="w-5 h-5 text-cyan-600" />
                                )}
                            </button>
                        );
                    })}
                </div>
                <div className="border-t pt-4">
                    <Button 
                        variant="outline" 
                        onClick={handleAddCustomItem}
                        className="w-full rounded-xl h-12 border-dashed border-slate-300 text-slate-600 hover:text-cyan-700 hover:border-cyan-300 text-base"
                    >
                        <Plus className="w-5 h-5 mr-2" /> Servicio Personalizado
                    </Button>
                </div>
            </DialogContent>
        </Dialog>

        {/* MODAL: EDITAR FECHA/HORA Y CANTIDADES - Optimizado para POS táctil */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
             <DialogContent className="rounded-2xl sm:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                 <DialogHeader className="border-b pb-4">
                     <DialogTitle className="text-xl lg:text-2xl">Editar Pedido</DialogTitle>
                     <DialogDescription className="text-base">Ajusta cantidades, precios y fecha de entrega.</DialogDescription>
                 </DialogHeader>
                 
                 <div className="flex-1 overflow-y-auto py-4 lg:py-6 space-y-6">
                     {/* Sección de Items */}
                     <div className="space-y-4">
                         <div className="flex justify-between items-center">
                             <Label className="text-cyan-700 font-bold text-base">Detalle de Servicios</Label>
                             <Button size="default" variant="outline" onClick={handleAddItem} className="h-11 text-sm gap-2 border-cyan-200 text-cyan-700 hover:bg-cyan-50">
                                 <Plus className="w-4 h-4" /> Agregar
                             </Button>
                         </div>
                         
                         <div className="space-y-4">
                             {editItems.map((item, idx) => (
                                 <div key={idx} className="bg-slate-50 p-4 lg:p-5 rounded-xl border border-slate-200 space-y-4 relative group">
                                     <div className="pr-10">
                                         {item.isCustom ? (
                                             <Input 
                                                 value={item.serviceName}
                                                 onChange={(e) => handleItemChange(idx, 'serviceName', e.target.value)}
                                                 className="font-medium border-slate-200 bg-white h-12 text-base"
                                                 placeholder="Nombre del servicio"
                                             />
                                         ) : (
                                             <div className="font-medium text-slate-700 text-base bg-white h-12 flex items-center px-4 rounded-md border border-slate-200">
                                                 {item.serviceName}
                                             </div>
                                         )}
                                     </div>
                                     
                                     <button 
                                         onClick={() => handleRemoveItem(idx)}
                                         className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
                                     >
                                         <Trash2 className="w-5 h-5" />
                                     </button>
                                     
                                     <div className="flex gap-4 items-end">
                                         <div className="flex-1 space-y-2">
                                             <Label className="text-xs text-slate-500 uppercase font-bold">Cant.</Label>
                                             {item.unit === 'kg' ? (
                                                 <ScaleInput
                                                     value={String(item.quantity)}
                                                     onChange={(val) => handleItemChange(idx, 'quantity', val)}
                                                     unit="kg"
                                                     placeholder="0"
                                                     className="h-12 bg-white text-center text-lg"
                                                 />
                                             ) : (
                                                 <Input 
                                                     type="number"
                                                     value={item.quantity}
                                                     onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                                                     className="h-12 bg-white text-center text-lg"
                                                 />
                                             )}
                                         </div>
                                         {/* Solo mostrar campo de precio si NO tiene precio (isCustom o priceUnit === 0) */}
                                         {(item.isCustom || item.priceUnit === 0) && (
                                             <div className="flex-1 space-y-2">
                                                 <Label className="text-xs text-slate-500 uppercase font-bold">Precio Unit.</Label>
                                                 <div className="relative">
                                                     <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">$</span>
                                                     <Input 
                                                         type="number"
                                                         value={item.priceUnit}
                                                         onChange={(e) => handleItemChange(idx, 'priceUnit', e.target.value)}
                                                         className="h-12 pl-7 bg-white text-lg"
                                                         placeholder="0.00"
                                                     />
                                                 </div>
                                             </div>
                                         )}
                                         <div className="flex-1 space-y-2">
                                             <Label className="text-xs text-slate-500 uppercase font-bold">Subtotal</Label>
                                             <div className="h-12 flex items-center font-bold text-slate-700 text-lg px-3 bg-slate-100 rounded-md border border-slate-200">
                                                 ${(Number(item.subtotal) || 0).toFixed(2)}
                                             </div>
                                         </div>
                                     </div>
                                 </div>
                             ))}
                         </div>
                         
                         {/* Total */}
                         <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                             <span className="font-bold text-slate-600 text-lg">Total a Pagar:</span>
                             <span className="font-bold text-3xl text-cyan-600">${editTotal.toFixed(2)}</span>
                         </div>
                     </div>
                     
                     {/* Sección de Método de Pago */}
                     <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                         <Label className="text-slate-700 font-bold text-sm uppercase">Método de Pago</Label>
                         <select 
                             value={editPaymentMethod} 
                             onChange={(e) => setEditPaymentMethod(e.target.value)}
                             className="w-full h-12 px-4 rounded-lg border border-slate-200 bg-white text-slate-700 text-base focus:outline-none focus:ring-2 focus:ring-cyan-500"
                         >
                             <option value="pagar_al_retiro">Pagar al Retiro (Pendiente)</option>
                             <option value="efectivo">Efectivo</option>
                             <option value="transferencia">Transferencia</option>
                             <option value="tarjeta">Tarjeta</option>
                         </select>
                     </div>

                     {/* Sección de Fecha */}
                     <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                         <Label className="text-slate-700 font-bold text-sm uppercase">Fecha de Entrega</Label>
                         <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                 <Label className="text-sm text-slate-500">Fecha</Label>
                                 <Input 
                                     type="date" 
                                     value={editDate} 
                                     onChange={(e) => setEditDate(e.target.value)} 
                                     className="h-12 bg-white rounded-lg text-base" 
                                     min={todayStr}
                                 />
                             </div>
                             <div className="space-y-2">
                                 <Label className="text-sm text-slate-500">Hora</Label>
                                 <Input 
                                     type="time" 
                                     value={editTime} 
                                     onChange={(e) => setEditTime(e.target.value)} 
                                     className="h-12 bg-white rounded-lg text-base" 
                                     min={editDate === todayStr ? nowTimeStr : undefined}
                                 />
                             </div>
                         </div>
                     </div>
                 </div>
                 
                 <DialogFooter className="border-t pt-4 lg:pt-5 flex-wrap gap-3">
                     <Button variant="outline" onClick={() => setEditModalOpen(false)} className="rounded-xl h-12 px-6 text-base">Cancelar</Button>
                     <Button 
                         variant="outline" 
                         onClick={() => handlePrintReceipt(editTarget)} 
                         
                         className="rounded-xl h-12 px-6 text-base border-cyan-200 text-cyan-700 hover:bg-cyan-50 gap-2"
                     >
                         <Printer className="w-5 h-5" /> Imprimir
                     </Button>
                     <Button onClick={saveEdit} className="bg-cyan-600 hover:bg-cyan-700 rounded-xl h-12 px-6 text-base text-white gap-2">
                         <Save className="w-5 h-5" /> Guardar Cambios
                     </Button>
                 </DialogFooter>
             </DialogContent>
        </Dialog>

        {/* Modal de Configuración de Impresión - Con soporte USB */}
        <Dialog open={printModalOpen} onOpenChange={setPrintModalOpen}>
          <DialogContent className="rounded-2xl sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Printer className="h-6 w-6 text-cyan-600" />
                Imprimir Recibo
              </DialogTitle>
              <DialogDescription>
                Conecta tu impresora USB para impresión directa.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">


              {/* Error de impresora */}
              {thermalPrinter.error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{thermalPrinter.error}</p>
                </div>
              )}

              {/* Vista previa del pedido */}
              {printTarget && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate-600">Folio:</span>
                    <span className="font-bold text-slate-800 font-mono">{printTarget.id?.slice(0,6).toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate-600">Cliente:</span>
                    <span className="font-medium text-slate-700">{printTarget.clientName || 'Cliente'}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                    <span className="text-sm font-medium text-slate-600">Total:</span>
                    <span className="font-bold text-xl text-green-600">${Number(printTarget.estimatedTotal || 0).toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Test de impresora USB */}
              {thermalPrinter.isConnected && (
                <Button
                  variant="outline"
                  onClick={thermalPrinter.printTest}
                  className="w-full h-12"
                  disabled={thermalPrinter.isPrinting}
                >
                  {thermalPrinter.isPrinting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Printer className="h-4 w-4 mr-2" />
                  )}
                  Imprimir Prueba
                </Button>
              )}

              {/* Opciones sin USB */}
              {/* Botón de seleccionar impresora/vista previa removido por requerimiento */}
            </div>

            <DialogFooter className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setPrintModalOpen(false)}
                className="flex-1 h-12"
              >
                Cancelar
              </Button>
              

              
              <Button 
                onClick={() => handlePrintReceipt(printTarget, printerConfig.showDialog)}
                className="flex-1 h-12 bg-cyan-600 hover:bg-cyan-700"
                disabled={thermalPrinter.isPrinting}
              >
                {thermalPrinter.isPrinting ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <Printer className="h-5 w-5 mr-2" />
                )}
                {thermalPrinter.isConnected ? 'Imprimir USB' : 'Imprimir'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

    </div>
  );
}