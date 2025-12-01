
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Search,
  UserPlus,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, where, Timestamp, serverTimestamp } from "firebase/firestore";
import { writeAudit } from "@/lib/audit";
import { useAuth, useFirestore } from "@/firebase/provider";
// Init Firebase using env vars to avoid non-module import errors
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY as string,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN as string,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID as string,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID as string,
};

export default function ServicesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [clients, setClients] = useState<Array<{ id: string; name: string; email?: string; phone?: string }>>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [selectedClient, setSelectedClient] = useState<{ id: string; name: string; email?: string; phone?: string } | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [creatingClient, setCreatingClient] = useState(false);
  const [defaultPass, setDefaultPass] = useState<string>('Cambio123!');

  // Firestore init (client-side)
  const app = useMemo(() => {
    const apps = getApps();
    return apps.length ? apps[0] : initializeApp(firebaseConfig);
  }, []);
  const db = useMemo(() => getFirestore(app), [app]);
  const appFirestore = useFirestore();
  const auth = useAuth();
  const [staffName, setStaffName] = useState<string>("");
  const router = useRouter();
  const [servicesList, setServicesList] = useState<Array<{ id: string; name: string; price: number; unit: 'kg' | 'pieces' }>>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const selectedService = useMemo(() => servicesList.find(s => s.id === selectedServiceId) || null, [servicesList, selectedServiceId]);
  const [quantity, setQuantity] = useState<string>('');
  const estimatedCost = useMemo(() => {
    let q = parseFloat(quantity || '0');
    if (selectedService?.unit === 'pieces') {
      q = Math.floor(q);
    }
    const price = selectedService?.price ?? 0;
    if (isNaN(q) || q <= 0) return '';
    return (q * price).toFixed(2);
  }, [quantity, selectedService]);
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(undefined);
  const [deliveryTime, setDeliveryTime] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>('efectivo');
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Load services from Firestore
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'services'));
        const items: Array<{ id: string; name: string; price: number; unit: 'kg' | 'pieces' }> = [];
        snap.forEach(d => {
          const data = d.data() as any;
          items.push({ id: d.id, name: data.name, price: Number(data.price || 0), unit: (data.unit === 'pieces' ? 'pieces' : 'kg') });
        });
        setServicesList(items);
      } catch (err: any) {
        toast({ title: 'Error cargando servicios', description: err?.message ?? String(err), variant: 'destructive' });
      }
    })();
  }, [db]);

  // Load current staff name
  useEffect(() => {
    (async () => {
      try {
        const uid = auth?.currentUser?.uid;
        if (!uid) return;
        const snapUsers = await getDocs(query(collection(appFirestore, 'users'), where('authUid', '==', uid)));
        let name = auth?.currentUser?.displayName || '';
        snapUsers.forEach(d => {
          const data = d.data() as any;
          if (data?.name) name = data.name;
        });
        setStaffName(name || 'Personal');
      } catch (err) {
        setStaffName('Personal');
      }
    })();
  }, [auth, appFirestore]);

  const searchClients = async (term: string) => {
    setLoadingClients(true);
    try {
      const usersRef = collection(db, "users");
      // Simple query without composite index; filter in-memory
      const snap = await getDocs(query(usersRef, where("role", "==", "client")));
      const results: Array<{ id: string; name: string; email?: string; phone?: string }> = [];
      const t = term.trim().toLowerCase();
      snap.forEach(doc => {
        const d = doc.data() as any;
        const name = d.name ?? "(Sin nombre)";
        const email = d.email ?? "";
        const phone = d.phone ?? "";
        if (!t || t.length < 2) return; // show empty until 2+ chars
        if (
          String(name).toLowerCase().includes(t) ||
          String(email).toLowerCase().includes(t)
        ) {
          results.push({ id: doc.id, name, email, phone });
        }
      });
      setClients(results);
    } catch (err: any) {
      toast({ title: "Error buscando clientes", description: err?.message ?? String(err), variant: "destructive" });
    } finally {
      setLoadingClients(false);
    }
  };

  useEffect(() => {
    const id = setTimeout(() => searchClients(searchTerm), 400);
    return () => clearTimeout(id);
  }, [searchTerm]);

  const handleCreateClient = async () => {
    if (!newClientName.trim()) {
      toast({ title: "Nombre requerido", description: "Ingresa el nombre del cliente." });
      return;
    }
    setCreatingClient(true);
    try {
      // Usar el mismo flujo del admin: endpoint /api/create-auth-user
      const res = await fetch('/api/create-auth-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClientName.trim(),
          email: newClientEmail.trim(),
          role: 'client',
          phone: newClientPhone.trim(),
          defaultPassword: defaultPass,
          // opcional: puedes enviar defaultPassword si el endpoint lo acepta
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'No se pudo crear el cliente');
      const created = { id: j.docId || j.uid || 'nuevo', name: newClientName.trim(), email: newClientEmail.trim() || undefined, phone: newClientPhone.trim() || undefined };
      setSelectedClient(created);
      setIsAddModalOpen(false);
      setNewClientName("");
      setNewClientEmail("");
      setNewClientPhone("");
      toast({ title: "Cliente creado", description: `Cliente registrado y usuario Auth creado (uid: ${j.uid || 'N/A'})` });
    } catch (err: any) {
      toast({ title: "Error al crear cliente", description: err?.message ?? String(err), variant: "destructive" });
    } finally {
      setCreatingClient(false);
    }
  };

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
            <CalendarIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight drop-shadow-sm">Nuevo Pedido (Personal)</h1>
            <p className="text-cyan-50 opacity-90">Registrar pedido manual para un cliente</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline">
              Registrar Nuevo Pedido Manual
            </CardTitle>
            <CardDescription>
              Crea un nuevo pedido de servicio para un cliente.
            </CardDescription>
          </CardHeader>
          <CardContent>
        <form className="grid gap-8 md:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
          {/* Columna de Cliente y Servicio */}
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Información del Cliente</Label>
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      if (selectedClient) {
                        setSelectedClient(null);
                      }
                    }}
                    placeholder="Buscar por nombre o correo..."
                    className="pl-9"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => setIsAddModalOpen(true)}>
                    <UserPlus className="h-4 w-4" />
                    <span className="sr-only">Registrar Nuevo Cliente</span>
                  </Button>
                  {selectedClient ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Seleccionado:</span>
                      <span className="px-2 py-1 rounded-md bg-muted text-sm font-medium text-foreground">
                        {selectedClient.name}{selectedClient.email ? ` · ${selectedClient.email}` : ""}
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedClient(null); setSearchTerm(""); setClients([]); }}>Cambiar</Button>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">Sin cliente seleccionado</div>
                  )}
                </div>
                {!selectedClient && (
                  <div className="rounded-lg border bg-background">
                    {loadingClients ? (
                      <div className="p-3 text-sm text-muted-foreground">Buscando clientes...</div>
                    ) : clients.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground">No hay resultados</div>
                    ) : (
                      <ul className="max-h-48 overflow-auto divide-y">
                        {clients.map((c) => (
                          <li key={c.id}>
                            <button
                              type="button"
                              className="w-full text-left p-3 hover:bg-muted"
                              onClick={() => {
                                setSelectedClient(c);
                                setSearchTerm(c.name || c.email || "");
                                setClients([]);
                              }}
                            >
                              <div className="font-medium">{c.name}</div>
                              <div className="text-xs text-muted-foreground">{c.email ?? "Sin correo"}{c.phone ? ` · ${c.phone}` : ""}</div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="service-type">Tipo de Servicio</Label>
              <Select value={selectedServiceId} onValueChange={(v) => { setSelectedServiceId(v); setQuantity(''); }}>
                <SelectTrigger id="service-type">
                  <SelectValue placeholder="Selecciona un tipo de servicio" />
                </SelectTrigger>
                <SelectContent>
                  {servicesList.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">Sin servicios</div>
                  ) : (
                    servicesList.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name} · ${Number(s.price).toFixed(2)} {s.unit === 'kg' ? '/ kg' : '/ piezas'}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            {selectedService && (
              <div className="space-y-2">
                <Label htmlFor="service-quantity">{selectedService.unit === 'kg' ? 'Peso (KG)' : 'Número de piezas'}</Label>
                <Input
                  id="service-quantity"
                  type="number"
                  min="0"
                  step={selectedService.unit === 'kg' ? '0.01' : '1'}
                  value={quantity}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (selectedService.unit === 'pieces') {
                      if (v === '') { setQuantity(''); return; }
                      const n = Math.max(0, Math.floor(Number(v) || 0));
                      setQuantity(String(n));
                    } else {
                      setQuantity(v);
                    }
                  }}
                  placeholder={selectedService.unit === 'kg' ? 'Ej: 3.5' : 'Ej: 12'}
                />
                <p className="text-xs text-muted-foreground">Precio: ${Number(selectedService.price).toFixed(2)} {selectedService.unit === 'kg' ? '/ kg' : '/ piezas'}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="item-description">
                Descripción de Prendas / Ítems
              </Label>
              <Textarea
                id="item-description"
                placeholder="Ej: 5 camisas, 2 pantalones, 1 vestido"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="special-instructions">
                Instrucciones Especiales
              </Label>
              <Textarea
                id="special-instructions"
                placeholder="Ej: Usar detergente hipoalergénico"
              />
            </div>
          </div>

          {/* Columna de Fechas y Costo */}
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Fecha y Hora de Recepción</Label>
              <Button
                variant={"outline"}
                className="w-full justify-start text-left font-normal cursor-not-allowed opacity-80"
                disabled
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                <span>{format(new Date(), "PPP p")}</span>
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Fecha y Hora Estimada de Entrega</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !Date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span>{deliveryDate ? format(deliveryDate, 'PPP') : 'Seleccionar fecha'}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    initialFocus
                    selected={deliveryDate}
                    onSelect={(d) => setDeliveryDate(d ?? undefined)}
                    disabled={(date: Date) => {
                      const today = new Date();
                      today.setHours(0,0,0,0);
                      const d = new Date(date);
                      d.setHours(0,0,0,0);
                      return d < today;
                    }}
                  />
                </PopoverContent>
              </Popover>
              <div className="mt-2">
                <Label htmlFor="delivery-time">Hora de entrega</Label>
                <Input
                  id="delivery-time"
                  type="time"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Ejemplo: 14:30</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimated-cost">Estimación de Costo</Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-muted-foreground">$</span>
                <Input id="estimated-cost" type="text" readOnly value={estimatedCost} placeholder="0.00" className="pl-7" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Método de Pago</Label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setPaymentMethod('transferencia')} className={`flex items-center gap-2 p-3 rounded-lg border ${paymentMethod==='transferencia' ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200 bg-white'} hover:bg-slate-50`}>
                  <span className="h-2 w-2 rounded-full bg-cyan-500" />
                  <span className="text-sm">Transferencia</span>
                </button>
                <button type="button" onClick={() => setPaymentMethod('terminal')} className={`flex items-center gap-2 p-3 rounded-lg border ${paymentMethod==='terminal' ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200 bg-white'} hover:bg-slate-50`}>
                  <span className="h-2 w-2 rounded-full bg-cyan-500" />
                  <span className="text-sm">Terminal</span>
                </button>
                <button type="button" onClick={() => setPaymentMethod('efectivo')} className={`flex items-center gap-2 p-3 rounded-lg border ${paymentMethod==='efectivo' ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200 bg-white'} hover:bg-slate-50`}>
                  <span className="h-2 w-2 rounded-full bg-cyan-500" />
                  <span className="text-sm">Efectivo</span>
                </button>
                <button type="button" onClick={() => setPaymentMethod('pagar_al_retiro')} className={`flex items-center gap-2 p-3 rounded-lg border ${paymentMethod==='pagar_al_retiro' ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200 bg-white'} hover:bg-slate-50`}>
                  <span className="h-2 w-2 rounded-full bg-cyan-500" />
                  <span className="text-sm">Pagar cuando lo recoja</span>
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Seleccionado: {paymentMethod.replace('_',' ')}</p>
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={() => {
                  if (!selectedClient) { toast({ title: 'Selecciona cliente', description: 'Debes seleccionar o registrar un cliente.' }); return; }
                  if (!selectedService) { toast({ title: 'Selecciona servicio', description: 'Debes seleccionar un tipo de servicio.' }); return; }
                  const qBase = parseFloat(quantity || '0');
                  const qNum = selectedService.unit === 'pieces' ? Math.floor(qBase) : qBase;
                  if (isNaN(qNum) || qNum <= 0) { toast({ title: 'Cantidad inválida', description: 'Ingresa una cantidad válida.' }); return; }
                  if (!deliveryDate) { toast({ title: 'Falta fecha de entrega', description: 'Selecciona la fecha estimada de entrega.' }); return; }
                  if (!deliveryTime) { toast({ title: 'Falta hora de entrega', description: 'Selecciona la hora estimada de entrega.' }); return; }
                  setConfirmOpen(true);
                }}
              >
                Crear Pedido
              </Button>
              <Button variant="outline" type="button" className="w-full">
                Cancelar
              </Button>
            </div>
          </div>
        </form>
          </CardContent>
        </Card>

        {/* Modal: Confirmar Pedido */}
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Pedido</DialogTitle>
              <DialogDescription>Revisa los datos antes de guardar.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Cliente</span><span className="font-medium">{selectedClient?.name}{selectedClient?.email ? ` · ${selectedClient.email}` : ''}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Servicio</span><span className="font-medium">{selectedService?.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Unidad</span><span className="font-medium">{selectedService?.unit === 'kg' ? 'KG' : 'Piezas'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Cantidad</span><span className="font-medium">{quantity}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Entrega estimada</span><span className="font-medium">{deliveryDate ? format(deliveryDate, 'PPP') : '-'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Hora de entrega</span><span className="font-medium">{deliveryTime || '-'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Método de pago</span><span className="font-medium">{paymentMethod.replace('_',' ')}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Costo estimado</span><span className="font-semibold">${estimatedCost || '0.00'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Atiende</span><span className="font-medium">{staffName}</span></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
              <Button onClick={async () => {
                try {
                  if (!selectedClient || !selectedService || !deliveryDate || !deliveryTime) return;
                  const qBase = parseFloat(quantity || '0');
                  const qNum = selectedService.unit === 'pieces' ? Math.floor(qBase) : qBase;
                  const totalNum = parseFloat(estimatedCost || '0');
                  const staffUid = auth?.currentUser?.uid || null;
                  const staffEmail = auth?.currentUser?.email || null;
                  // Combinar fecha y hora de entrega en un solo Date
                  const deliveryDateTime = new Date(deliveryDate);
                  const [hh, mm] = deliveryTime.split(":");
                  if (hh && mm) {
                    deliveryDateTime.setHours(Number(hh), Number(mm), 0, 0);
                  }
                  const docRef = await addDoc(collection(db, 'orders'), {
                    clientId: selectedClient.id,
                    clientName: selectedClient.name,
                    serviceId: selectedService.id,
                    serviceName: selectedService.name,
                    unit: selectedService.unit,
                    quantity: qNum,
                    priceUnit: selectedService.price,
                    estimatedTotal: totalNum,
                    receivedAt: Timestamp.now(),
                    createdAt: serverTimestamp(),
                    deliveryDate: Timestamp.fromDate(deliveryDateTime),
                    deliveryTime: deliveryTime,
                    paymentMethod,
                    status: 'pendiente',
                    staffName,
                    staffUid,
                    staffEmail,
                    attendedBy: staffName,
                  });
                  // audit log del pedido
                  writeAudit(db, {
                    actorUid: staffUid,
                    actorEmail: staffEmail,
                    action: 'create-order',
                    resource: 'orders',
                    resourceId: docRef.id,
                    after: {
                      clientId: selectedClient.id,
                      serviceId: selectedService.id,
                      quantity: qNum,
                      paymentMethod,
                      staffName,
                      staffUid,
                      deliveryDate: deliveryDateTime.toISOString(),
                      deliveryTime,
                    },
                  });
                  toast({ title: 'Pedido creado', description: `ID: ${docRef.id}` });
                  // limpiar formulario y redirigir a lista (inventario por ahora)
                  setSelectedClient(null);
                  setSelectedServiceId('');
                  setQuantity('');
                  setDeliveryDate(undefined);
                  setDeliveryTime("");
                  setPaymentMethod('efectivo');
                  setSearchTerm('');
                  setClients([]);
                  setConfirmOpen(false);
                  router.push('/staff/services');
                } catch (err: any) {
                  toast({ title: 'Error al crear pedido', description: err?.message ?? String(err), variant: 'destructive' });
                }
              }}>Confirmar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal: Registrar nuevo cliente */}
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Nuevo Cliente</DialogTitle>
              <DialogDescription>Crear cliente directamente en la base de datos.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="new-client-name">Nombre</Label>
                <Input id="new-client-name" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} placeholder="Nombre completo" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-client-email">Correo (opcional)</Label>
                <Input id="new-client-email" type="email" value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)} placeholder="correo@ejemplo.com" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-client-phone">Teléfono (opcional)</Label>
                <Input id="new-client-phone" value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} placeholder="55 0000 0000" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="defaultPass">Contraseña Temporal</Label>
                <Input id="defaultPass" value={defaultPass} onChange={(e) => setDefaultPass(e.target.value)} placeholder="Contraseña inicial" />
                <p className="text-xs text-muted-foreground">El usuario deberá cambiar esta contraseña al iniciar sesión.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateClient} disabled={creatingClient}>
                {creatingClient ? "Creando..." : "Registrar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
