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
import { ListFilter, Users, PlayCircle, CheckCircle2, Eye, PackageCheck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useEffect, useState } from 'react';
import { useFirestore, useAuth } from '@/firebase/provider';
import { collection, addDoc, query, where, getDocs, Timestamp, serverTimestamp, onSnapshot, orderBy, updateDoc, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function StaffDashboard() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [openingAmount, setOpeningAmount] = useState<string>('0.00');
  const [checking, setChecking] = useState(true);
  const [pendingOrders, setPendingOrders] = useState<Array<any>>([]);
  const [showPendiente, setShowPendiente] = useState(true);
  const [showEnProgreso, setShowEnProgreso] = useState(true);
  const [showCompletado, setShowCompletado] = useState(true);
  const [showEntregado, setShowEntregado] = useState(true);
  const [deliverModalOpen, setDeliverModalOpen] = useState(false);
  const [deliverTarget, setDeliverTarget] = useState<any | null>(null);
  const amountDue = deliverTarget ? Number(deliverTarget?.estimatedTotal || 0) : 0;
  const [payAmount, setPayAmount] = useState<string>('');
  const [staffName, setStaffName] = useState<string>('');

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
        // En caso de error, mostrar modal para no bloquear operación
        setShowModal(true);
      } finally {
        setChecking(false);
      }
    }
    checkOpeningStrict();
  }, [firestore, auth]);

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
      setPendingOrders(items);
    }, (err) => {
      console.error('orders subscription error', err);
    });
    return () => unsub();
  }, [firestore]);

  // Cargar nombre del personal actual
  useEffect(() => {
    (async () => {
      try {
        const uid = auth?.currentUser?.uid;
        if (!uid || !firestore) return;
        let name = auth?.currentUser?.displayName || '';
        const snapUsers = await getDocs(query(collection(firestore, 'users'), where('authUid', '==', uid)));
        snapUsers.forEach(d => {
          const data = d.data() as any;
          if (data?.name) name = data.name;
        });
        setStaffName(name || 'Personal');
      } catch (err) {
        setStaffName('Personal');
      }
    })();
  }, [auth, firestore]);

  async function saveOpening() {
    try {
      if (!firestore) return;
      const amount = parseFloat(openingAmount);
      if (isNaN(amount) || amount < 0) {
        toast({ title: 'Monto inválido', description: 'Ingresa un monto válido mayor o igual a 0.', variant: 'destructive' });
        return;
      }
      await addDoc(collection(firestore, 'cash_registers'), {
        type: 'opening',
        amount,
        userId: auth?.currentUser?.uid || null,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Registrado', description: `Monto inicial guardado: ${amount.toFixed(2)}` });
      setShowModal(false);
    } catch (err: any) {
      console.error('saveOpening error', err);
      toast({ title: 'Error', description: err?.message || 'No se pudo guardar el monto', variant: 'destructive' });
    }
  }

  async function setOrderStatus(orderId: string, status: 'pendiente' | 'en_progreso' | 'completado') {
    try {
      if (!firestore) return;
      await updateDoc(doc(firestore, 'orders', orderId), { status });
      toast({ title: 'Actualizado', description: `Pedido ${orderId} → ${status.replace('_',' ')}` });
    } catch (err: any) {
      console.error('setOrderStatus error', err);
      toast({ title: 'Error al actualizar', description: err?.message || 'No se pudo cambiar el estado', variant: 'destructive' });
    }
  }

  async function markDelivered(order: any) {
    try {
      if (!firestore || !order?.id) return;
      // Guardar que fue entregado; si estaba sin pagar, marcar pagado
      const updates: any = { status: 'entregado', deliveredAt: serverTimestamp(), deliveredBy: staffName || 'Personal', deliveredByUid: auth?.currentUser?.uid || null, paymentStatus: 'pagado' };
      await updateDoc(doc(firestore, 'orders', order.id), updates);
      toast({ title: 'Entrega registrada', description: `Entrega a ${order.clientName || order.clientId} registrada por ${staffName || 'Personal'} (pagado).` });
      setDeliverModalOpen(false);
      setDeliverTarget(null);
      setPayAmount('');
    } catch (err: any) {
      console.error('markDelivered error', err);
      toast({ title: 'Error al entregar', description: err?.message || 'No se pudo registrar la entrega', variant: 'destructive' });
    }
  }

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
            <Users className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight drop-shadow-sm">Panel del Personal</h1>
            <p className="text-cyan-50 opacity-90">Tareas y operaciones del día</p>
          </div>
        </div>

        <Dialog open={showModal} onOpenChange={(open) => setShowModal(open)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registro de apertura de caja</DialogTitle>
              <DialogDescription>Introduce el monto de dinero disponible en caja al iniciar tu jornada.</DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <Input type="number" step="0.01" value={openingAmount} onChange={(e) => setOpeningAmount((e.target as HTMLInputElement).value)} />
            </div>
            <DialogFooter className="mt-4">
              <div className="flex gap-2">
                <Button onClick={() => saveOpening()}>Guardar monto</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-headline">Tareas Pendientes</CardTitle>
              <CardDescription>
                Gestiona y actualiza el estado de los pedidos de los clientes.
              </CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <ListFilter className="h-4 w-4" />
                  Filtrar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filtrar por Estado</DropdownMenuLabel>
                <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem checked={showPendiente} onCheckedChange={(v) => setShowPendiente(Boolean(v))}>Pendiente</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={showEnProgreso} onCheckedChange={(v) => setShowEnProgreso(Boolean(v))}>En Progreso</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={showCompletado} onCheckedChange={(v) => setShowCompletado(Boolean(v))}>Completado</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={showEntregado} onCheckedChange={(v) => setShowEntregado(Boolean(v))}>Entregado</DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Servicio</TableHead>
                  <TableHead>Fecha de Entrega</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Atendió</TableHead>
                  <TableHead>Entregó</TableHead>
                  <TableHead>Total Est.</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-sm text-muted-foreground">Sin pedidos pendientes</TableCell>
                  </TableRow>
                ) : (
                  pendingOrders
                    .filter((o) => {
                      const s = o.status as string;
                      if (s === 'pendiente') return showPendiente;
                      if (s === 'en_progreso') return showEnProgreso;
                      if (s === 'completado') return showCompletado;
                      if (s === 'entregado') return showEntregado;
                      return true;
                    })
                    .map((o) => {
                    const deliveryDate = o.deliveryDate?.toDate ? o.deliveryDate.toDate() : null;
                    const isPaid = (o as any).paymentStatus === 'pagado' || o.paymentMethod !== 'pagar_al_retiro';
                    const paymentLabel = isPaid ? 'Pagado' : 'Sin pagar';
                    const paymentVariant = isPaid ? 'default' : 'destructive';
                    const statusLabel = (() => {
                      switch (o.status) {
                        case 'pendiente': return 'Pendiente';
                        case 'en_progreso': return 'En progreso';
                        case 'completado': return 'Completado';
                        case 'entregado': return 'Entregado';
                        default: return String(o.status || 'Pendiente');
                      }
                    })();
                    const statusVariant = (() => {
                      switch (o.status) {
                        case 'pendiente': return 'secondary';
                        case 'en_progreso': return 'default';
                        case 'completado': return 'success';
                        case 'entregado': return 'outline';
                        default: return 'secondary';
                      }
                    })();
                    return (
                      <TableRow key={o.id}>
                        <TableCell>{o.clientName || o.clientId}</TableCell>
                        <TableCell>{o.serviceName || o.serviceId}</TableCell>
                        <TableCell>{deliveryDate ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(deliveryDate) : '-'}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant as any}>{statusLabel}</Badge>
                        </TableCell>
                        <TableCell>{o.attendedBy || o.staffName || '-'}</TableCell>
                        <TableCell>{o.deliveredBy || '-'}</TableCell>
                        <TableCell>${Number(o.estimatedTotal || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={paymentVariant}>{paymentLabel}</Badge>
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <div className="flex items-center gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="ghost" onClick={() => setOrderStatus(o.id, 'en_progreso')}>
                                    <PlayCircle className="h-4 w-4 text-blue-600" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Marcar en progreso</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="ghost" onClick={() => setOrderStatus(o.id, 'completado')}>
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Marcar completado</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="ghost" onClick={() => {
                                    toast({ title: 'Detalles del pedido', description: `ID: ${o.id}` });
                                  }}>
                                    <Eye className="h-4 w-4 text-slate-700" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Ver detalles</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="ghost" onClick={() => { setDeliverTarget(o); setDeliverModalOpen(true); }}>
                                    <PackageCheck className="h-4 w-4 text-purple-700" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Marcar entregado</p>
                                </TooltipContent>
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

        {/* Modal: Confirmar Entrega */}
        <Dialog open={deliverModalOpen} onOpenChange={setDeliverModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar entrega</DialogTitle>
              <DialogDescription>
                Confirma la entrega para {deliverTarget?.clientName || deliverTarget?.clientId}. {deliverTarget?.paymentMethod === 'pagar_al_retiro' ? 'Este pedido está marcado como sin pagar.' : 'Este pedido ya estaba marcado como pagado.'}
              </DialogDescription>
            </DialogHeader>
            {deliverTarget?.paymentMethod === 'pagar_al_retiro' && (
              <div className="space-y-3">
                <div className="text-sm">Monto a pagar: <span className="font-semibold">${amountDue.toFixed(2)}</span></div>
                <div>
                  <label className="text-sm">¿Con cuánto va a pagar?</label>
                  <Input type="number" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="Ej: 500.00" />
                  {payAmount && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Cambio aproximado: ${Math.max(0, (parseFloat(payAmount || '0') || 0) - amountDue).toFixed(2)}
                    </p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Nota: Este cálculo no se guardará; solo se registrará que fue entregado y pagado.</p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setDeliverModalOpen(false); setDeliverTarget(null); setPayAmount(''); }}>Cancelar</Button>
              <Button onClick={() => deliverTarget && markDelivered(deliverTarget)}>Confirmar entrega</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
