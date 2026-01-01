"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, 
  UserPlus, 
  Calendar as CalendarIcon, 
  Clock, 
  CreditCard, 
  Banknote, 
  Smartphone, 
  CheckCircle2, 
  X,
  User,
  Package,
  ChevronRight,
  Droplets,
  Shirt,
  Wind,
  Sparkles,
  Brush,
  Plus,
  Trash2,
  ShoppingBasket,
  PenTool
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp, 
  Timestamp,
  doc, 
  setDoc 
} from "firebase/firestore";
import { writeAudit } from "@/lib/audit";
import { useAuth, useFirestore } from "@/firebase/provider";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

// Icon mapping for services (Visual feedback)
const serviceIcons: Record<string, JSX.Element> = {
  'Lavandería': <Droplets className="w-5 h-5" />,
  'Planchaduría': <Wind className="w-5 h-5" />,
  'Tintorería': <Sparkles className="w-5 h-5" />,
  'Edredones': <Package className="w-5 h-5" />,
  'default': <Shirt className="w-5 h-5" />
};

interface CartItem {
  serviceId: string;
  serviceName: string;
  unit: string;
  quantity: number;
  priceUnit: number;
  subtotal: number;
  isCustom?: boolean;
}

export default function ServicesPage() {
  // --- Hooks & State ---
  const { toast } = useToast();
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();

  // Staff Info
  const [staffName, setStaffName] = useState<string>("");

  // Client Search
  const [searchTerm, setSearchTerm] = useState("");
  const [clients, setClients] = useState<Array<{ id: string; name: string; email?: string; phone?: string }>>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [selectedClient, setSelectedClient] = useState<{ id: string; name: string; email?: string; phone?: string } | null>(null);

  // New Client Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [creatingClient, setCreatingClient] = useState(false);
  const [defaultPass, setDefaultPass] = useState<string>('Cambio123!');

  // Service Selection
  const [servicesList, setServicesList] = useState<Array<{ id: string; name: string; price: number; unit: 'kg' | 'pieces' }>>([]);
  const [tempServiceId, setTempServiceId] = useState<string>('');
  const [tempQuantity, setTempQuantity] = useState<string>('');
  
  // Custom Service State
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customUnit, setCustomUnit] = useState<'kg' | 'pieces'>("kg");

  // Cart Data
  const [cart, setCart] = useState<CartItem[]>([]);

  // Logistics & Payment
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(undefined);
  const [deliveryTime, setDeliveryTime] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>('efectivo');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [processingOrder, setProcessingOrder] = useState(false);
  const [notes, setNotes] = useState("");

  // Computed
  const tempService = useMemo(() => servicesList.find(s => s.id === tempServiceId) || null, [servicesList, tempServiceId]);
  
  const cartTotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.subtotal, 0).toFixed(2);
  }, [cart]);

  // --- Effects ---

  // 1. Load Services
  useEffect(() => {
    if (!firestore) return;
    const fetchServices = async () => {
      try {
        const snap = await getDocs(collection(firestore, 'services'));
        const items: Array<{ id: string; name: string; price: number; unit: 'kg' | 'pieces' }> = [];
        snap.forEach(d => {
          const data = d.data() as any;
          items.push({ id: d.id, name: data.name, price: Number(data.price || 0), unit: (data.unit === 'pieces' ? 'pieces' : 'kg') });
        });
        setServicesList(items);
      } catch (err: any) {
        console.error(err);
        toast({ title: 'Error', description: 'No se pudieron cargar los servicios.', variant: 'destructive' });
      }
    };
    fetchServices();
  }, [firestore]);

  // 2. Load Staff Name
  useEffect(() => {
    const fetchStaffName = async () => {
      if (!auth?.currentUser || !firestore) return;
      try {
        const q = query(collection(firestore, 'users'), where('authUid', '==', auth.currentUser.uid));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const userData = snap.docs[0].data();
          setStaffName(userData.name || auth.currentUser.displayName || 'Personal');
        } else {
          setStaffName(auth.currentUser.displayName || 'Personal');
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchStaffName();
  }, [auth, firestore]);

  // 3. Client Search Debounce
  useEffect(() => {
    const search = async () => {
      if (!searchTerm.trim() || searchTerm.length < 2) {
        setClients([]);
        return;
      }
      setLoadingClients(true);
      try {
        const q = query(collection(firestore, 'users'), where('role', '==', 'client'));
        const snap = await getDocs(q);
        const term = searchTerm.toLowerCase();
        const results = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as any))
          .filter(c => 
            (c.name && c.name.toLowerCase().includes(term)) || 
            (c.email && c.email.toLowerCase().includes(term)) ||
            (c.phone && c.phone.includes(term)) // Buscar también por teléfono
          )
          .slice(0, 5); 
        setClients(results);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingClients(false);
      }
    };

    const timeoutId = setTimeout(search, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, firestore]);

  // --- Handlers ---

  const handleCreateClient = async () => {
    if (!newClientName.trim()) {
      toast({ title: "Falta nombre", description: "El nombre es obligatorio.", variant: "destructive" });
      return;
    }
    setCreatingClient(true);
    try {
      const res = await fetch('/api/create-auth-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClientName.trim(),
          email: newClientEmail.trim(),
          role: 'client',
          phone: newClientPhone.trim(),
          defaultPassword: defaultPass,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Error al crear cliente');
      
      // --- FIX: Asegurar guardado de teléfono en users ---
      if (newClientPhone.trim() && j.docId) {
          await setDoc(doc(firestore, 'users', j.docId), { phone: newClientPhone.trim() }, { merge: true });
      }

      // Crear notificación de bienvenida para el nuevo cliente
      const clientDocId = j.docId || j.uid;
      if (clientDocId) {
        await addDoc(collection(firestore, 'notifications'), {
          userId: clientDocId,
          type: 'welcome',
          title: '🎉 ¡Bienvenido a Lavandería Angy!',
          message: `Hola ${newClientName.trim()}, tu cuenta ha sido creada. Ya puedes programar tus servicios de lavandería.`,
          read: false,
          createdAt: serverTimestamp(),
        });
      }

      const newClient = { 
        id: clientDocId, 
        name: newClientName.trim(), 
        email: newClientEmail.trim(), 
        phone: newClientPhone.trim() 
      };
      
      setSelectedClient(newClient);
      setIsAddModalOpen(false);
      setNewClientName("");
      setNewClientEmail("");
      setNewClientPhone("");
      toast({ title: "Cliente registrado", description: "Se ha seleccionado automáticamente." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCreatingClient(false);
    }
  };

  const handleAddToCart = () => {
    // Lógica para servicio personalizado
    if (isCustomMode) {
      if (!customName.trim() || !customPrice) {
        toast({ title: "Datos incompletos", description: "Ingresa nombre y precio del servicio.", variant: "destructive" });
        return;
      }
      const q = parseFloat(tempQuantity);
      const p = parseFloat(customPrice);
      if (isNaN(q) || q <= 0) {
        toast({ title: "Cantidad inválida", variant: "destructive" });
        return;
      }
      if (isNaN(p) || p <= 0) {
        toast({ title: "Precio inválido", variant: "destructive" });
        return;
      }

      const newItem: CartItem = {
        serviceId: 'custom-' + Date.now(),
        serviceName: customName,
        unit: customUnit,
        priceUnit: p,
        quantity: q,
        subtotal: q * p,
        isCustom: true
      };
      setCart([...cart, newItem]);
      setTempQuantity('');
      setCustomName('');
      setCustomPrice('');
      toast({ title: "Agregado", description: "Servicio manual añadido." });
      return;
    }

    // Lógica para servicio estándar
    if (!tempService) {
        toast({ title: "Selecciona un servicio", variant: "destructive" });
        return;
    }
    const q = parseFloat(tempQuantity);
    if (isNaN(q) || q <= 0) {
        toast({ title: "Cantidad inválida", description: "Ingresa un número mayor a 0", variant: "destructive" });
        return;
    }

    const newItem: CartItem = {
        serviceId: tempService.id,
        serviceName: tempService.name,
        unit: tempService.unit,
        priceUnit: tempService.price,
        quantity: q,
        subtotal: q * tempService.price,
        isCustom: false
    };

    setCart([...cart, newItem]);
    setTempQuantity('');
    toast({ title: "Agregado", description: `${tempService.name} añadido al pedido.` });
  };

  const handleRemoveFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const handleCreateOrder = async () => {
    if (!selectedClient || cart.length === 0 || !deliveryDate || !deliveryTime) return;
    
    setProcessingOrder(true);
    try {
      const staffUid = auth?.currentUser?.uid || null;
      const staffEmail = auth?.currentUser?.email || null;
      
      const deliveryDateTime = new Date(deliveryDate);
      const [hours, minutes] = deliveryTime.split(':').map(Number);
      deliveryDateTime.setHours(hours, minutes, 0, 0);

      const orderData = {
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        clientEmail: selectedClient.email || null,
        clientPhone: selectedClient.phone || null, // <--- GUARDAR TELÉFONO EN EL PEDIDO
        items: cart,
        serviceName: cart.length === 1 ? cart[0].serviceName : 'Varios Servicios',
        estimatedTotal: parseFloat(cartTotal),
        paymentMethod,
        notes: notes.trim(),
        status: 'pendiente',
        staffName,
        staffUid,
        staffEmail,
        attendedBy: staffName,
        receivedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        deliveryDate: Timestamp.fromDate(deliveryDateTime),
        deliveryTimeStr: deliveryTime,
      };

      const docRef = await addDoc(collection(firestore, 'orders'), orderData);

      writeAudit(firestore, {
        actorUid: staffUid,
        actorEmail: staffEmail,
        action: 'create-order-staff',
        resource: 'orders',
        resourceId: docRef.id,
        after: { ...orderData, deliveryDate: deliveryDateTime.toISOString() }
      });

      toast({ title: "Pedido creado con éxito", description: `Orden #${docRef.id.slice(0,6).toUpperCase()}` });
      
      // Reset Form
      setConfirmOpen(false);
      setSelectedClient(null);
      setSearchTerm("");
      setCart([]);
      setTempServiceId("");
      setTempQuantity("");
      setDeliveryDate(undefined);
      setDeliveryTime("");
      setNotes("");
      setPaymentMethod("efectivo");
      setIsCustomMode(false);
      setCustomName("");
      setCustomPrice("");
      
    } catch (err: any) {
      console.error(err);
      toast({ title: "Error al crear pedido", description: err.message, variant: "destructive" });
    } finally {
      setProcessingOrder(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] p-4 md:p-8 space-y-6">
        
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Registrar Pedido</h1>
          <p className="text-slate-500">Crea una nueva orden de servicio de forma rápida.</p>
        </div>
        <div className="hidden md:block">
            <Badge variant="outline" className="px-3 py-1 bg-white text-slate-600 border-slate-200 shadow-sm">
                Atendiendo: <span className="font-semibold ml-1 text-cyan-700">{staffName}</span>
            </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLUMNA IZQUIERDA: FORMULARIO */}
        <div className="lg:col-span-8 space-y-6">
            
            {/* 1. SELECCIÓN DE CLIENTE */}
            <Card className="border-slate-200 shadow-sm overflow-visible">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <User className="h-5 w-5 text-cyan-600" />
                        Cliente
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {!selectedClient ? (
                        <div className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <Input 
                                    placeholder="Buscar cliente por nombre o correo..." 
                                    className="pl-10 h-11 rounded-xl border-slate-200 focus-visible:ring-cyan-500 bg-slate-50/30"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searchTerm.length > 1 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                                        {loadingClients && <div className="p-3 text-sm text-slate-500 text-center">Buscando...</div>}
                                        {!loadingClients && clients.length === 0 && (
                                            <div className="p-3 text-sm text-slate-500 text-center">No se encontraron clientes.</div>
                                        )}
                                        {clients.map(client => (
                                            <button 
                                                key={client.id}
                                                className="w-full text-left px-4 py-3 hover:bg-cyan-50 transition-colors border-b border-slate-50 last:border-0 flex justify-between items-center group"
                                                onClick={() => {
                                                    setSelectedClient(client);
                                                    setSearchTerm("");
                                                    setClients([]);
                                                }}
                                            >
                                                <div>
                                                    <p className="font-medium text-slate-800 group-hover:text-cyan-700">{client.name}</p>
                                                    <p className="text-xs text-slate-500 flex items-center gap-2">
                                                        <span>{client.email || 'Sin correo'}</span>
                                                        {client.phone && <span className="text-cyan-600 font-mono bg-cyan-50 px-1 rounded">📞 {client.phone}</span>}
                                                    </p>
                                                </div>
                                                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-cyan-400" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <Button 
                                variant="outline" 
                                className="w-full h-11 border-dashed border-slate-300 text-slate-600 hover:text-cyan-700 hover:border-cyan-300 hover:bg-cyan-50/50 rounded-xl"
                                onClick={() => setIsAddModalOpen(true)}
                            >
                                <UserPlus className="mr-2 h-4 w-4" /> Registrar Nuevo Cliente
                            </Button>
                        </div>
                    ) : (
                        <div className="bg-cyan-50/60 border border-cyan-100 rounded-xl p-4 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-700 font-bold border border-cyan-200">
                                    {selectedClient.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800">{selectedClient.name}</p>
                                    <div className="flex flex-col sm:flex-row sm:gap-3 text-sm text-slate-500">
                                        <p>{selectedClient.email || 'Sin correo'}</p>
                                        {selectedClient.phone && <p className="text-cyan-700 font-medium">📞 {selectedClient.phone}</p>}
                                    </div>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedClient(null)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 2. AGREGAR SERVICIOS */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Package className="h-5 w-5 text-cyan-600" />
                        Servicios y Prendas
                    </CardTitle>
                    {cart.length > 0 && (
                        <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                            {cart.length} ítem{cart.length !== 1 ? 's' : ''}
                        </Badge>
                    )}
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Grid de selección */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {servicesList.map((s) => {
                            const isSelected = tempServiceId === s.id && !isCustomMode;
                            const icon = Object.keys(serviceIcons).find(key => s.name.includes(key)) 
                                ? serviceIcons[Object.keys(serviceIcons).find(key => s.name.includes(key))!] 
                                : serviceIcons['default'];

                            return (
                                <button
                                    key={s.id}
                                    onClick={() => { setTempServiceId(s.id); setTempQuantity(''); setIsCustomMode(false); }}
                                    className={`
                                        flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200
                                        ${isSelected 
                                            ? 'border-cyan-500 bg-cyan-50 text-cyan-800 shadow-sm ring-1 ring-cyan-200 scale-[1.02]' 
                                            : 'border-slate-200 bg-white text-slate-600 hover:border-cyan-200 hover:bg-slate-50'
                                        }
                                    `}
                                >
                                    <div className={`mb-2 p-2 rounded-full ${isSelected ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {icon}
                                    </div>
                                    <span className="text-sm font-semibold text-center leading-tight">{s.name}</span>
                                    <span className="text-[10px] text-slate-400 mt-1">${s.price}/{s.unit}</span>
                                </button>
                            );
                        })}
                        {/* Botón para Servicio Personalizado */}
                        <button
                            onClick={() => { setIsCustomMode(true); setTempServiceId(''); setTempQuantity(''); }}
                            className={`
                                flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200
                                ${isCustomMode 
                                    ? 'border-cyan-500 bg-cyan-50 text-cyan-800 shadow-sm ring-1 ring-cyan-200 scale-[1.02]' 
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-cyan-200 hover:bg-slate-50'
                                }
                            `}
                        >
                             <div className={`mb-2 p-2 rounded-full ${isCustomMode ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-100 text-slate-500'}`}>
                                <PenTool className="w-5 h-5" />
                            </div>
                            <span className="text-sm font-semibold text-center leading-tight">Otro / Manual</span>
                            <span className="text-[10px] text-slate-400 mt-1">Personalizado</span>
                        </button>
                    </div>

                    {/* Area de Input (Dinámica) */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 transition-all">
                        {isCustomMode ? (
                            // --- MODO PERSONALIZADO ---
                            <div className="space-y-4 animate-in fade-in slide-in-from-left-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-600">Nombre del Servicio</Label>
                                        <Input 
                                            placeholder="Ej: Lavado de Alfombra" 
                                            className="h-11 rounded-xl border-slate-200 bg-white"
                                            value={customName}
                                            onChange={(e) => setCustomName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-600">Precio Unitario</Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                                            <Input 
                                                type="number" 
                                                placeholder="0.00" 
                                                className="pl-7 h-11 rounded-xl border-slate-200 bg-white"
                                                value={customPrice}
                                                onChange={(e) => setCustomPrice(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-end gap-3">
                                     <div className="w-1/3 space-y-2">
                                        <Label className="text-slate-600">Unidad</Label>
                                        <Select value={customUnit} onValueChange={(v: any) => setCustomUnit(v)}>
                                            <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="kg">Kilos</SelectItem>
                                                <SelectItem value="pieces">Piezas</SelectItem>
                                            </SelectContent>
                                        </Select>
                                     </div>
                                     <div className="flex-1 space-y-2">
                                        <Label className="text-slate-600">Cantidad</Label>
                                        <Input 
                                            type="number" 
                                            placeholder="0" 
                                            className="h-11 rounded-xl border-slate-200 bg-white"
                                            value={tempQuantity}
                                            onChange={(e) => setTempQuantity(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddToCart(); }}
                                        />
                                     </div>
                                     <Button 
                                        className="h-11 px-6 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white shadow-md"
                                        onClick={handleAddToCart}
                                    >
                                        <Plus className="mr-2 h-4 w-4" /> Agregar
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            // --- MODO ESTÁNDAR ---
                            <div className="flex items-end gap-3 animate-in fade-in">
                                <div className="flex-1 space-y-2">
                                    <Label className="text-slate-600">
                                        {tempService ? `Cantidad de ${tempService.name}` : 'Selecciona un servicio arriba'}
                                    </Label>
                                    <div className="relative">
                                        <Input 
                                            type="number" 
                                            min="0" 
                                            step={tempService?.unit === 'kg' ? '0.1' : '1'}
                                            placeholder="0"
                                            className="h-11 rounded-xl border-slate-200 pl-4 text-lg font-medium bg-white"
                                            value={tempQuantity}
                                            onChange={(e) => setTempQuantity(e.target.value)}
                                            disabled={!tempService}
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddToCart(); }}
                                        />
                                        {tempService && (
                                            <div className="absolute right-3 top-3 text-xs text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded">
                                                {tempService.unit === 'kg' ? 'KG' : 'PZA'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <Button 
                                    className="h-11 px-6 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white shadow-md shadow-cyan-200 disabled:opacity-50"
                                    onClick={handleAddToCart}
                                    disabled={!tempService || !tempQuantity}
                                >
                                    <Plus className="mr-2 h-4 w-4" /> Agregar
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Lista de ítems en el carrito */}
                    {cart.length > 0 ? (
                        <div className="space-y-3">
                            <Label className="text-slate-600">Servicios Agregados</Label>
                            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                                {cart.map((item, index) => (
                                    <div key={index} className="flex justify-between items-center p-3 bg-white hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${item.isCustom ? 'bg-amber-50 text-amber-600' : 'bg-cyan-50 text-cyan-600'}`}>
                                                {item.isCustom ? <PenTool className="w-4 h-4" /> : 
                                                 (Object.keys(serviceIcons).find(key => item.serviceName.includes(key)) 
                                                    ? serviceIcons[Object.keys(serviceIcons).find(key => item.serviceName.includes(key))!] 
                                                    : serviceIcons['default'])}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-800 text-sm">{item.serviceName} {item.isCustom && <span className="text-[10px] text-amber-600 bg-amber-50 px-1 rounded border border-amber-100">Manual</span>}</p>
                                                <p className="text-xs text-slate-500">
                                                    {item.quantity} {item.unit === 'kg' ? 'kg' : 'pza'} x ${item.priceUnit}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="font-semibold text-slate-700 text-sm">${item.subtotal.toFixed(2)}</span>
                                            <button onClick={() => handleRemoveFromCart(index)} className="text-slate-400 hover:text-red-500 transition-colors">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
                            <ShoppingBasket className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-sm text-slate-400">Aún no has agregado servicios al pedido.</p>
                        </div>
                    )}

                    <div className="space-y-2 pt-2">
                        <Label className="text-slate-600">Notas del Pedido</Label>
                        <Textarea
                            placeholder="Manchas, prendas delicadas, instrucciones especiales..."
                            className="rounded-xl border-slate-200 bg-slate-50/50 min-h-[80px]"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* 3. LOGÍSTICA */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <CalendarIcon className="h-5 w-5 text-cyan-600" />
                        Logística de Entrega
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-slate-600">Fecha de Entrega</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full h-11 justify-start text-left font-normal rounded-xl border-slate-200",
                                            !deliveryDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {deliveryDate ? format(deliveryDate, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={deliveryDate}
                                        onSelect={setDeliveryDate}
                                        initialFocus
                                        locale={es}
                                        disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-600">Hora Estimada</Label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <Input 
                                    type="time" 
                                    className="pl-10 h-11 rounded-xl border-slate-200 block" 
                                    value={deliveryTime}
                                    onChange={(e) => setDeliveryTime(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* COLUMNA DERECHA: RESUMEN Y PAGO */}
        <div className="lg:col-span-4 space-y-6">
            <Card className="border-slate-200 shadow-md bg-white sticky top-4 overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-cyan-400 to-blue-500 w-full" />
                <CardHeader>
                    <CardTitle className="text-slate-800">Resumen del Pedido</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                        {cart.length > 0 ? (
                            <div className="space-y-2 mb-4">
                                {cart.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                        <span className="text-slate-600 truncate max-w-[150px]">{item.serviceName} <span className="text-xs text-slate-400">x{item.quantity}</span></span>
                                        <span className="font-medium text-slate-700">${item.subtotal.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-sm text-slate-400 mb-4">Agrega servicios para ver el costo</p>
                        )}
                        
                        <div className="h-px bg-slate-200 my-2" />
                        <div className="flex justify-between items-end">
                            <span className="text-slate-800 font-bold pb-1">Total</span>
                            <span className="text-3xl font-bold text-cyan-600">${cartTotal}</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-slate-600">Método de Pago</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { id: 'efectivo', icon: <Banknote className="h-5 w-5" />, label: 'Efectivo' },
                                { id: 'terminal', icon: <CreditCard className="h-5 w-5" />, label: 'Tarjeta' },
                                { id: 'transferencia', icon: <Smartphone className="h-5 w-5" />, label: 'Transfer' },
                                { id: 'pagar_al_retiro', icon: <Clock className="h-5 w-5" />, label: 'Pendiente' },
                            ].map((method) => (
                                <button
                                    key={method.id}
                                    type="button"
                                    onClick={() => setPaymentMethod(method.id)}
                                    className={`
                                        flex flex-col items-center justify-center gap-1 p-3 rounded-xl border transition-all
                                        ${paymentMethod === method.id 
                                            ? 'border-cyan-500 bg-cyan-50 text-cyan-800 shadow-sm ring-1 ring-cyan-200' 
                                            : 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                                        }
                                    `}
                                >
                                    {method.icon}
                                    <span className="text-xs font-semibold">{method.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <Button 
                        size="lg" 
                        className="w-full bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl shadow-lg shadow-cyan-200 font-bold text-lg h-12 transition-all hover:scale-[1.02]"
                        onClick={() => {
                            if (!selectedClient) { toast({title: "Falta Cliente", description: "Selecciona un cliente.", variant: "destructive"}); return; }
                            if (cart.length === 0) { toast({title: "Carrito vacío", description: "Agrega al menos un servicio.", variant: "destructive"}); return; }
                            if (!deliveryDate || !deliveryTime) { toast({title: "Faltan Fechas", description: "Define fecha y hora de entrega.", variant: "destructive"}); return; }
                            setConfirmOpen(true);
                        }}
                    >
                        Crear Pedido (${cartTotal})
                    </Button>
                </CardContent>
            </Card>
        </div>
      </div>

      {/* --- MODALES --- */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Registrar Nuevo Cliente</DialogTitle>
                <DialogDescription>Se creará el usuario y se asignará al pedido actual.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
                <div className="space-y-2">
                    <Label>Nombre Completo</Label>
                    <Input value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="Ej. Juan Pérez" className="rounded-xl" />
                </div>
                <div className="space-y-2">
                    <Label>Correo (Opcional)</Label>
                    <Input value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)} placeholder="cliente@email.com" className="rounded-xl" />
                </div>
                <div className="space-y-2">
                    <Label>Teléfono (Opcional)</Label>
                    <Input value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} placeholder="55 1234 5678" className="rounded-xl" />
                </div>
                <div className="bg-amber-50 text-amber-800 p-3 rounded-xl text-xs flex items-start gap-2 border border-amber-100">
                    <span className="text-lg">🔑</span>
                    <p className="mt-0.5">Contraseña temporal automática: <strong className="font-mono bg-white px-1 rounded border border-amber-200">{defaultPass}</strong></p>
                </div>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setIsAddModalOpen(false)} className="rounded-xl">Cancelar</Button>
                <Button onClick={handleCreateClient} disabled={creatingClient} className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl">
                    {creatingClient ? 'Guardando...' : 'Registrar Cliente'}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
            <DialogHeader>
                <div className="mx-auto w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center mb-2 text-cyan-600">
                    <CheckCircle2 className="w-6 h-6" />
                </div>
                <DialogTitle className="text-center text-xl text-slate-800">Confirmar Pedido</DialogTitle>
                <DialogDescription className="text-center">Verifica los datos antes de generar la orden.</DialogDescription>
            </DialogHeader>
            
            <div className="bg-slate-50 p-4 rounded-xl space-y-3 text-sm border border-slate-100 mt-2">
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                    <span className="text-slate-500">Cliente</span>
                    <span className="font-semibold text-slate-800 text-right">{selectedClient?.name}</span>
                </div>
                <div className="border-b border-slate-200/60 pb-2">
                    <span className="text-slate-500 block mb-1">Servicios ({cart.length})</span>
                    <div className="max-h-20 overflow-y-auto space-y-1">
                        {cart.map((item, i) => (
                            <div key={i} className="flex justify-between text-xs">
                                <span className="text-slate-700">{item.serviceName} x{item.quantity}</span>
                                <span className="text-slate-500">${item.subtotal.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                    <span className="text-slate-500">Entrega</span>
                    <div className="text-right">
                        <p className="font-medium text-slate-800">{deliveryDate ? format(deliveryDate, 'PPP', {locale: es}) : ''}</p>
                        <p className="text-xs text-slate-500">{deliveryTime} hrs</p>
                    </div>
                </div>
                <div className="flex justify-between items-center pt-1">
                    <span className="text-slate-500 font-medium">Total a Pagar</span>
                    <span className="font-bold text-cyan-700 text-lg">${cartTotal}</span>
                </div>
            </div>

            <DialogFooter className="sm:justify-center gap-3 mt-4">
                <Button variant="outline" onClick={() => setConfirmOpen(false)} className="rounded-xl px-6 w-full sm:w-auto border-slate-200">Corregir</Button>
                <Button 
                    onClick={handleCreateOrder} 
                    disabled={processingOrder}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl px-8 w-full sm:w-auto shadow-md shadow-cyan-200"
                >
                    {processingOrder ? 'Procesando...' : 'Confirmar Orden'}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}