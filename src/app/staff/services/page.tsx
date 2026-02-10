"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
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
  PenTool,
  Printer,
  Scale
} from "lucide-react";
import { ScaleInput } from "@/components/scale-input";
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
  const [clients, setClients] = useState<Array<{ id: string; name: string; email?: string; phone?: string; authUid?: string }>>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [selectedClient, setSelectedClient] = useState<{ id: string; name: string; email?: string; phone?: string; authUid?: string } | null>(null);

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

  // Receipt State
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<{
    orderId: string;
    clientName: string;
    clientPhone?: string;
    items: CartItem[];
    total: string;
    paymentMethod: string;
    deliveryDate: Date;
    deliveryTime: string;
    staffName: string;
    createdAt: Date;
    notes?: string;
  } | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

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

      // Genera el email ficticio si no hay email real
      let finalEmail = newClientEmail.trim();
      let cleanPhone = newClientPhone.trim().replace(/[^0-9]/g, '');
      if (!finalEmail && newClientPhone.trim()) {
        finalEmail = `${cleanPhone}@lavanderia.angy`;
      }

      // --- NUEVO: Guardar email ficticio en Firestore si no hay email real ---
      if (j.docId && finalEmail) {
        await setDoc(doc(firestore, 'users', j.docId), { email: finalEmail }, { merge: true });
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

      // Enviar correo de bienvenida con credenciales (si tiene email)
      if (newClientEmail.trim()) {
        try {
          await fetch('/api/send-welcome-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: newClientEmail.trim(),
              name: newClientName.trim(),
              password: defaultPass,
            }),
          });
          toast({ title: "📧 Correo enviado", description: "Se envió el correo de bienvenida con las credenciales." });
        } catch (emailErr) {
          console.error('Error enviando correo:', emailErr);
          // No interrumpir el flujo si falla el correo
        }
      }

      // Enviar WhatsApp de bienvenida (si tiene teléfono)
      if (newClientPhone.trim()) {
        try {
          let phone = cleanPhone;
          // Fuerza el formato +521XXXXXXXXXX
          if (!phone.startsWith('521')) {
            // Si ya empieza con '52', lo convierte a '521'
            if (phone.startsWith('52')) {
              phone = '521' + phone.slice(2);
            } else {
              phone = '521' + phone;
            }
          }
          phone = '+' + phone;

          await fetch('/api/twilio-test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: phone,
              body: `¡Hola ${newClientName.trim()}! 👋\n\nTu cuenta en Lavandería Angy ha sido creada.\n\nPara ingresar:\n1. Ve a https://lavanderiaangy.vercel.app\n2. Inicia sesión con tu correo o telefono: ${cleanPhone} O ${finalEmail}\n3. Tu contraseña temporal es: ${defaultPass}\n\nCámbiala después de tu primer acceso.\n\n¡Ya puedes programar tus servicios de lavandería o revisar el status de tu ropa!`
            }),
          });
          toast({ title: "📱 WhatsApp enviado", description: "Se envió el mensaje de bienvenida por WhatsApp." });
        } catch (waErr) {
          console.error('Error enviando WhatsApp:', waErr);
          // No interrumpir el flujo si falla el WhatsApp
        }
      }

      const newClient = { 
        id: clientDocId, 
        name: newClientName.trim(), 
        email: finalEmail, // <-- Usar el email real o ficticio aquí
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
        toast({ title: "Cantidad invalida", description: "Ingresa un número mayor a 0", variant: "destructive" });
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

  // Función para imprimir recibo en impresora térmica 58mm (EC-5890X)
  const handlePrintReceipt = () => {
    if (!lastOrder) return;
    
    const printWindow = window.open('', '_blank', 'width=600,height=600');
    if (!printWindow) {
      toast({ title: "Error", description: "No se pudo abrir la ventana de impresión. Verifica los bloqueadores de pop-ups.", variant: "destructive" });
      return;
    }

    const paymentLabels: Record<string, string> = {
      'efectivo': 'Efectivo',
      'terminal': 'Tarjeta',
      'transferencia': 'Transferencia',
      'pagar_al_retiro': 'Pago Pendiente'
    };

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Recibo #${lastOrder.orderId}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          @page {
            size: 58mm auto;
            margin: 0mm;
          }
          html, body {
            width: 58mm;
            margin: 0;
            padding: 0;
            height: auto;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            font-weight: 900;
            color: #000000;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            padding: 2mm 3mm 3mm 3mm;
            line-height: 1.3;
            height: auto;
          }
          .receipt-container {
            width: 100%;
            max-width: 52mm;
            margin: 0 auto;
          }
          .center { text-align: center; }
          .bold { font-weight: 900; }
          .separator {
            border-top: 2px dashed #000000;
            margin: 3px 0;
          }
          .double-separator {
            border-top: 3px solid #000000;
            margin: 4px 0;
          }
          .header {
            text-align: center;
            margin-bottom: 5px;
          }
          .logo {
            font-size: 18px;
            font-weight: 900;
            letter-spacing: 1px;
            color: #000000;
          }
          .subtitle {
            font-size: 11px;
            font-weight: bold;
            color: #000000;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            font-weight: bold;
          }
          .item-row {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            font-weight: bold;
            padding: 2px 0;
          }
          .item-name {
            max-width: 60%;
            word-wrap: break-word;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            font-size: 16px;
            font-weight: 900;
            margin-top: 4px;
            color: #000000;
          }
          .footer {
            text-align: center;
            margin-top: 4px;
            font-size: 10px;
            font-weight: bold;
            line-height: 1.2;
          }
          .order-id {
            font-size: 16px;
            font-weight: 900;
            letter-spacing: 2px;
            color: #000000;
          }
          .notes {
            font-size: 10px;
            font-weight: bold;
            margin-top: 4px;
            padding: 4px;
            border: 1px solid #000;
          }
          @media print {
            html, body { 
              width: 58mm;
              height: auto;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .receipt-container {
              width: 100%;
              page-break-after: avoid;
            }
            body {
              padding-bottom: 3mm;
            }
          }
        </style>
      </head>
      <body>
        ${(() => {
          const receiptBody = `<div class="receipt-container">
        <div class="header">
          <div class="logo">LAVANDERÍA Y PLANCHADURIA ANGY</div>
          <div class="subtitle">Servicio de Calidad</div>
        </div>
        
        <div class="double-separator"></div>
        
        <div class="center">
          <div class="order-id">Folio: ${lastOrder.orderId}</div>
          <div style="font-size: 10px;">${format(lastOrder.createdAt, "dd/MM/yyyy HH:mm")}</div>
        </div>
        
        <div class="separator"></div>
        
        <div style="margin: 6px 0;">
          <div class="info-row">
            <span>Cliente:</span>
            <span class="bold">${lastOrder.clientName}</span>
          </div>
          ${lastOrder.clientPhone ? `<div class="info-row"><span>Tel:</span><span>${lastOrder.clientPhone}</span></div>` : ''}
          <div class="info-row">
            <span>Atendió:</span>
            <span>${lastOrder.staffName}</span>
          </div>
        </div>
        
        <div class="separator"></div>
        
        <div style="margin: 6px 0;">
          <div class="bold" style="margin-bottom: 4px;">SERVICIOS:</div>
          ${lastOrder.items.map(item => `
            <div class="item-row">
              <span class="item-name">${item.serviceName} x${item.quantity}${item.unit === 'kg' ? 'kg' : 'pz'}</span>
              <span>$${item.subtotal.toFixed(2)}</span>
            </div>
          `).join('')}
        </div>
        
        <div class="double-separator"></div>
        
        <div class="total-row">
          <span>TOTAL:</span>
          <span>$${lastOrder.total}</span>
        </div>
        
        <div class="info-row" style="margin-top: 4px;">
          <span>Pago:</span>
          <span>${paymentLabels[lastOrder.paymentMethod] || lastOrder.paymentMethod}</span>
        </div>
        
        <div class="separator"></div>
        
        <div style="margin: 6px 0;">
          <div class="bold">ENTREGA:</div>
          <div class="center" style="font-size: 13px;">
            ${format(lastOrder.deliveryDate, "EEEE dd/MM", { locale: es })}
          </div>
          <div class="center bold" style="font-size: 14px;">
            ${lastOrder.deliveryTime} hrs
          </div>
        </div>
        
        ${lastOrder.notes ? `<div class="notes">Notas: ${lastOrder.notes}</div>` : ''}
        
        <div class="double-separator"></div>
        
        <div class="footer">
          <div>¡Gracias por su preferencia!</div>
          <div>Puede revisar su servicio en nuestro sitio web</div>
          <div>lavanderiaangy.vercel.app/</div>
          <div style="margin-top: 4px;">Conserve este ticket</div>
          <div>.     </div>
          <div>.      </div>
          <div>.      </div>
        </div>
        
        </div>`;
          return receiptBody + receiptBody;
        })()}
        
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
          window.onafterprint = function() {
            window.close();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(receiptHTML);
    printWindow.document.close();
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
        userId: selectedClient.authUid || selectedClient.id,
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

      // Guardar datos para el recibo
      setLastOrder({
        orderId: docRef.id.slice(0, 6).toUpperCase(),
        clientName: selectedClient.name,
        clientPhone: selectedClient.phone,
        items: [...cart],
        total: cartTotal,
        paymentMethod,
        deliveryDate: deliveryDateTime,
        deliveryTime,
        staffName,
        createdAt: new Date(),
        notes: notes.trim() || undefined
      });

      toast({ title: "Pedido creado con éxito", description: `Orden #${docRef.id.slice(0,6).toUpperCase()}` });
      
      // Cerrar confirmación y mostrar modal de recibo
      setConfirmOpen(false);
      setReceiptOpen(true);
      
      // Reset Form
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
    <div className="relative min-h-[calc(100vh-4rem)] p-3 md:p-6 lg:p-8 space-y-5 lg:space-y-6 pos-mode">
        
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 tracking-tight">Registrar Pedido</h1>
          <p className="text-slate-500 text-sm lg:text-base">Crea una nueva orden de servicio de forma rápida.</p>
        </div>
        <div className="hidden md:block">
            <Badge variant="outline" className="px-4 py-2 bg-white text-slate-600 border-slate-200 shadow-sm text-sm lg:text-base">
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
                    <CardTitle className="text-lg lg:text-xl flex items-center gap-2">
                        <User className="h-5 w-5 lg:h-6 lg:w-6 text-cyan-600" />
                        Cliente
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {!selectedClient ? (
                        <div className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <Input 
                                    placeholder="Buscar cliente por nombre o correo..." 
                                    className="pl-12 h-12 lg:h-14 rounded-xl border-slate-200 focus-visible:ring-cyan-500 bg-slate-50/30 text-base lg:text-lg"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searchTerm.length > 1 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden max-h-72 overflow-y-auto">
                                        {loadingClients && <div className="p-4 text-base text-slate-500 text-center">Buscando...</div>}
                                        {!loadingClients && clients.length === 0 && (
                                            <div className="p-4 text-base text-slate-500 text-center">No se encontraron clientes.</div>
                                        )}
                                        {clients.map(client => (
                                            <button 
                                                key={client.id}
                                                className="w-full text-left px-5 py-4 hover:bg-cyan-50 transition-colors border-b border-slate-50 last:border-0 flex justify-between items-center group active:scale-[0.98] min-h-[64px]"
                                                onClick={() => {
                                                    setSelectedClient(client);
                                                    setSearchTerm("");
                                                    setClients([]);
                                                }}
                                            >
                                                <div>
                                                    <p className="font-medium text-slate-800 group-hover:text-cyan-700 text-base lg:text-lg">{client.name}</p>
                                                    <p className="text-sm text-slate-500 flex items-center gap-2">
                                                        <span>{client.email || 'Sin correo'}</span>
                                                        {client.phone && <span className="text-cyan-600 font-mono bg-cyan-50 px-2 py-0.5 rounded">📞 {client.phone}</span>}
                                                    </p>
                                                </div>
                                                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-cyan-400" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <Button 
                                variant="outline" 
                                className="w-full h-12 lg:h-14 border-dashed border-slate-300 text-slate-600 hover:text-cyan-700 hover:border-cyan-300 hover:bg-cyan-50/50 rounded-xl text-base active:scale-[0.98]"
                                onClick={() => setIsAddModalOpen(true)}
                            >
                                <UserPlus className="mr-2 h-5 w-5" /> Registrar Nuevo Cliente
                            </Button>
                        </div>
                    ) : (
                        <div className="bg-cyan-50/60 border border-cyan-100 rounded-xl p-4 lg:p-5 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 lg:h-14 lg:w-14 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-700 font-bold border border-cyan-200 text-lg lg:text-xl">
                                    {selectedClient.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 text-base lg:text-lg">{selectedClient.name}</p>
                                    <div className="flex flex-col sm:flex-row sm:gap-3 text-sm lg:text-base text-slate-500">
                                        <p>{selectedClient.email || 'Sin correo'}</p>
                                        {selectedClient.phone && <p className="text-cyan-700 font-medium">📞 {selectedClient.phone}</p>}
                                    </div>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedClient(null)} className="h-11 w-11 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl">
                                <X className="h-6 w-6" />
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 2. AGREGAR SERVICIOS */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-lg lg:text-xl flex items-center gap-2">
                  <Package className="h-5 w-5 lg:h-6 lg:w-6 text-cyan-600" />
                  Servicios y Prendas
                </CardTitle>
                {cart.length > 0 && (
                  <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-sm px-3 py-1">
                    {cart.length} ítem{cart.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Grid de selección - Optimizado para táctil */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4">
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
                                        flex flex-col items-center justify-center p-4 lg:p-5 rounded-xl border transition-all duration-200 min-h-[100px] lg:min-h-[120px] active:scale-[0.97]
                                        ${isSelected 
                                            ? 'border-cyan-500 bg-cyan-50 text-cyan-800 shadow-sm ring-2 ring-cyan-200 scale-[1.02]' 
                                            : 'border-slate-200 bg-white text-slate-600 hover:border-cyan-200 hover:bg-slate-50'
                                        }
                                    `}
                                >
                                    <div className={`mb-2 p-2.5 lg:p-3 rounded-full ${isSelected ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {React.cloneElement(icon, { className: 'w-5 h-5 lg:w-6 lg:h-6' })}
                                    </div>
                                    <span className="text-sm lg:text-base font-semibold text-center leading-tight">{s.name}</span>
                                    <span className="text-xs lg:text-sm text-slate-400 mt-1">${s.price}/{s.unit}</span>
                                </button>
                            );
                        })}
                        {/* Botón para Servicio Personalizado */}
                        <button
                            onClick={() => { setIsCustomMode(true); setTempServiceId(''); setTempQuantity(''); }}
                            className={`
                                flex flex-col items-center justify-center p-4 lg:p-5 rounded-xl border transition-all duration-200 min-h-[100px] lg:min-h-[120px] active:scale-[0.97]
                                ${isCustomMode 
                                    ? 'border-cyan-500 bg-cyan-50 text-cyan-800 shadow-sm ring-2 ring-cyan-200 scale-[1.02]' 
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-cyan-200 hover:bg-slate-50'
                                }
                            `}
                        >
                             <div className={`mb-2 p-2.5 lg:p-3 rounded-full ${isCustomMode ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-100 text-slate-500'}`}>
                                <PenTool className="w-5 h-5 lg:w-6 lg:h-6" />
                            </div>
                            <span className="text-sm lg:text-base font-semibold text-center leading-tight">Otro / Manual</span>
                            <span className="text-xs lg:text-sm text-slate-400 mt-1">Personalizado</span>
                        </button>
                    </div>

                    {/* Area de Input (Dinámica) - Optimizado para POS táctil */}
                    <div className="bg-slate-50 p-4 lg:p-5 rounded-xl border border-slate-100 transition-all">
                        {isCustomMode ? (
                            // --- MODO PERSONALIZADO ---
                            <div className="space-y-4 lg:space-y-5 animate-in fade-in slide-in-from-left-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-600 text-sm lg:text-base">Nombre del Servicio</Label>
                                        <Input 
                                            placeholder="Ej: Lavado de Alfombra" 
                                            className="h-12 lg:h-14 rounded-xl border-slate-200 bg-white text-base lg:text-lg"
                                            value={customName}
                                            onChange={(e) => setCustomName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-600 text-sm lg:text-base">Precio Unitario</Label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">$</span>
                                            <Input 
                                                type="number" 
                                                placeholder="0.00" 
                                                className="pl-9 h-12 lg:h-14 rounded-xl border-slate-200 bg-white text-base lg:text-lg"
                                                value={customPrice}
                                                onChange={(e) => setCustomPrice(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-end gap-3 lg:gap-4">
                                     <div className="w-1/3 space-y-2">
                                        <Label className="text-slate-600 text-sm lg:text-base">Unidad</Label>
                                        <Select value={customUnit} onValueChange={(v: any) => setCustomUnit(v)}>
                                            <SelectTrigger className="h-12 lg:h-14 rounded-xl bg-white border-slate-200 text-base"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="kg" className="py-3 text-base">Kilos</SelectItem>
                                                <SelectItem value="pieces" className="py-3 text-base">Piezas</SelectItem>
                                            </SelectContent>
                                        </Select>
                                     </div>
                                     <div className="flex-1 space-y-2">
                                        <ScaleInput
                                            label="Cantidad"
                                            value={tempQuantity}
                                            onChange={setTempQuantity}
                                            unit={customUnit}
                                            placeholder="0"
                                            className="h-12 lg:h-14 rounded-xl border-slate-200 bg-white text-lg"
                                        />
                                     </div>
                                     <Button 
                                        className="h-12 lg:h-14 px-6 lg:px-8 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white shadow-md text-base active:scale-[0.97]"
                                        onClick={handleAddToCart}
                                    >
                                        <Plus className="mr-2 h-5 w-5" /> Agregar
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            // --- MODO ESTÁNDAR ---
                            <div className="flex items-end gap-3 lg:gap-4 animate-in fade-in">
                                <div className="flex-1 space-y-2">
                                    <ScaleInput
                                        label={tempService ? `Cantidad de ${tempService.name}` : 'Selecciona un servicio arriba'}
                                        value={tempQuantity}
                                        onChange={setTempQuantity}
                                        unit={tempService?.unit || 'kg'}
                                        placeholder="0"
                                        disabled={!tempService}
                                        className="h-12 lg:h-14 rounded-xl border-slate-200 pl-4 text-lg lg:text-xl font-medium bg-white"
                                    />
                                </div>
                                <Button 
                                    className="h-12 lg:h-14 px-6 lg:px-8 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white shadow-md shadow-cyan-200 disabled:opacity-50 text-base active:scale-[0.97]"
                                    onClick={handleAddToCart}
                                    disabled={!tempService || !tempQuantity}
                                >
                                    <Plus className="mr-2 h-5 w-5" /> Agregar
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Lista de ítems en el carrito - Optimizado para táctil y tablets */}
                    {cart.length > 0 ? (
                      <div className="space-y-3">
                        <Label className="text-slate-600 text-sm lg:text-base">Servicios Agregados</Label>
                        <div className="border border-slate-200 rounded-xl overflow-x-auto divide-y divide-slate-100">
                          <div className="min-w-[520px]">
                          {cart.map((item, index) => (
                            <div key={index} className="flex flex-wrap md:flex-nowrap justify-between items-center p-4 lg:p-5 bg-white hover:bg-slate-50 transition-colors min-h-[70px]">
                              <div className="flex items-center gap-4 min-w-[180px]">
                                <div className={`h-10 w-10 lg:h-12 lg:w-12 rounded-xl flex items-center justify-center ${item.isCustom ? 'bg-amber-50 text-amber-600' : 'bg-cyan-50 text-cyan-600'}`}>
                                  {item.isCustom ? <PenTool className="w-5 h-5 lg:w-6 lg:h-6" /> : 
                                   (Object.keys(serviceIcons).find(key => item.serviceName.includes(key)) 
                                    ? serviceIcons[Object.keys(serviceIcons).find(key => item.serviceName.includes(key))!] 
                                    : serviceIcons['default'])}
                                </div>
                                <div>
                                  <p className="font-medium text-slate-800 text-sm lg:text-base">{item.serviceName} {item.isCustom && <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">Manual</span>}</p>
                                  <p className="text-xs lg:text-sm text-slate-500">
                                    {item.quantity} {item.unit === 'kg' ? 'kg' : 'pza'} x ${item.priceUnit}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 lg:gap-5 mt-2 md:mt-0">
                                <span className="font-semibold text-slate-700 text-base lg:text-lg">${item.subtotal.toFixed(2)}</span>
                                <button onClick={() => handleRemoveFromCart(index)} className="text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg">
                                  <Trash2 className="h-5 w-5" />
                                </button>
                              </div>
                            </div>
                          ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl">
                        <ShoppingBasket className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-sm lg:text-base text-slate-400">Aún no has agregado servicios al pedido.</p>
                      </div>
                    )}

                    <div className="space-y-2 pt-2">
                        <Label className="text-slate-600 text-sm lg:text-base">Notas del Pedido</Label>
                        <Textarea
                            placeholder="Manchas, prendas delicadas, instrucciones especiales..."
                            className="rounded-xl border-slate-200 bg-slate-50/50 min-h-[90px] lg:min-h-[100px] text-base"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* 3. LOGÍSTICA */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg lg:text-xl flex items-center gap-2">
                        <CalendarIcon className="h-5 w-5 lg:h-6 lg:w-6 text-cyan-600" />
                        Logística de Entrega
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
                        <div className="space-y-2">
                            <Label className="text-slate-600 text-sm lg:text-base">Fecha de Entrega</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full h-12 lg:h-14 justify-start text-left font-normal rounded-xl border-slate-200 text-base",
                                            !deliveryDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-3 h-5 w-5" />
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
                            <Label className="text-slate-600 text-sm lg:text-base">Hora Estimada</Label>
                            <div className="relative">
                                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <Input 
                                    type="time" 
                                    className="pl-12 h-12 lg:h-14 rounded-xl border-slate-200 block text-base" 
                                    value={deliveryTime}
                                    onChange={(e) => setDeliveryTime(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* COLUMNA DERECHA: RESUMEN Y PAGO - Optimizada para POS */}
        <div className="lg:col-span-4 space-y-6">
            <Card className="border-slate-200 shadow-md bg-white sticky top-4 overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-cyan-400 to-blue-500 w-full" />
                <CardHeader>
                    <CardTitle className="text-slate-800 text-lg lg:text-xl">Resumen del Pedido</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-slate-50 p-5 lg:p-6 rounded-2xl border border-slate-100">
                        {cart.length > 0 ? (
                            <div className="space-y-3 mb-4">
                                {cart.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm lg:text-base">
                                        <span className="text-slate-600 truncate max-w-[160px]">{item.serviceName} <span className="text-xs lg:text-sm text-slate-400">x{item.quantity}</span></span>
                                        <span className="font-medium text-slate-700">${item.subtotal.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-sm lg:text-base text-slate-400 mb-4">Agrega servicios para ver el costo</p>
                        )}
                        
                        <div className="h-px bg-slate-200 my-3" />
                        <div className="flex justify-between items-end">
                            <span className="text-slate-800 font-bold pb-1 text-base lg:text-lg">Total</span>
                            <span className="text-3xl lg:text-4xl font-bold text-cyan-600">${cartTotal}</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-slate-600 text-sm lg:text-base">Método de Pago</Label>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { id: 'efectivo', icon: <Banknote className="h-6 w-6" />, label: 'Efectivo' },
                                { id: 'terminal', icon: <CreditCard className="h-6 w-6" />, label: 'Tarjeta' },
                                { id: 'transferencia', icon: <Smartphone className="h-6 w-6" />, label: 'Transfer' },
                                { id: 'pagar_al_retiro', icon: <Clock className="h-6 w-6" />, label: 'Pendiente' },
                            ].map((method) => (
                                <button
                                    key={method.id}
                                    type="button"
                                    onClick={() => setPaymentMethod(method.id)}
                                    className={`
                                        flex flex-col items-center justify-center gap-2 p-4 lg:p-5 rounded-xl border transition-all min-h-[80px] lg:min-h-[90px] active:scale-[0.97]
                                        ${paymentMethod === method.id 
                                            ? 'border-cyan-500 bg-cyan-50 text-cyan-800 shadow-sm ring-2 ring-cyan-200' 
                                            : 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                                        }
                                    `}
                                >
                                    {method.icon}
                                    <span className="text-sm lg:text-base font-semibold">{method.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <Button 
                        size="lg" 
                        className="w-full bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl shadow-lg shadow-cyan-200 font-bold text-lg lg:text-xl h-14 lg:h-16 transition-all hover:scale-[1.02] active:scale-[0.98]"
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
        <DialogContent className="rounded-2xl sm:max-w-lg">
            <DialogHeader>
                <DialogTitle className="text-xl lg:text-2xl">Registrar Nuevo Cliente</DialogTitle>
                <DialogDescription className="text-base">Se creará el usuario y se asignará al pedido actual.</DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-3">
                <div className="space-y-2">
                    <Label className="text-base">Nombre Completo</Label>
                    <Input value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="Ej. Juan Pérez" className="rounded-xl h-12 lg:h-14 text-base" />
                </div>
                <div className="space-y-2">
                    <Label className="text-base">Correo (Opcional)</Label>
                    <Input value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)} placeholder="cliente@email.com" className="rounded-xl h-12 lg:h-14 text-base" />
                </div>
                <div className="space-y-2">
                    <Label className="text-base">Teléfono (Opcional)</Label>
                    <Input value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} placeholder="55 1234 5678" className="rounded-xl h-12 lg:h-14 text-base" />
                </div>
                <div className="bg-amber-50 text-amber-800 p-4 rounded-xl text-sm flex items-start gap-3 border border-amber-100">
                    <span className="text-xl">🔑</span>
                    <p className="mt-0.5">Contraseña temporal automática: <strong className="font-mono bg-white px-2 py-0.5 rounded border border-amber-200">{defaultPass}</strong></p>
                </div>
            </div>
            <DialogFooter className="gap-3">
                <Button variant="ghost" onClick={() => setIsAddModalOpen(false)} className="rounded-xl h-12 px-6 text-base">Cancelar</Button>
                <Button onClick={handleCreateClient} disabled={creatingClient} className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl h-12 px-6 text-base">
                    {creatingClient ? 'Guardando...' : 'Registrar Cliente'}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="rounded-2xl sm:max-w-lg">
            <DialogHeader>
                <div className="mx-auto w-14 h-14 bg-cyan-100 rounded-full flex items-center justify-center mb-2 text-cyan-600">
                    <CheckCircle2 className="w-7 h-7" />
                </div>
                <DialogTitle className="text-center text-xl lg:text-2xl text-slate-800">Confirmar Pedido</DialogTitle>
                <DialogDescription className="text-center text-base">Verifica los datos antes de generar la orden.</DialogDescription>
            </DialogHeader>
            
            <div className="bg-slate-50 p-5 rounded-xl space-y-4 text-sm lg:text-base border border-slate-100 mt-2">
                <div className="flex justify-between border-b border-slate-200/60 pb-3">
                    <span className="text-slate-500">Cliente</span>
                    <span className="font-semibold text-slate-800 text-right">{selectedClient?.name}</span>
                </div>
                <div className="border-b border-slate-200/60 pb-3">
                    <span className="text-slate-500 block mb-2">Servicios ({cart.length})</span>
                    <div className="max-h-24 overflow-y-auto space-y-2">
                        {cart.map((item, i) => (
                            <div key={i} className="flex justify-between text-sm">
                                <span className="text-slate-700">{item.serviceName} x{item.quantity}</span>
                                <span className="text-slate-500">${item.subtotal.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-3">
                    <span className="text-slate-500">Entrega</span>
                    <div className="text-right">
                        <p className="font-medium text-slate-800">{deliveryDate ? format(deliveryDate, 'PPP', {locale: es}) : ''}</p>
                        <p className="text-sm text-slate-500">{deliveryTime} hrs</p>
                    </div>
                </div>
                <div className="flex justify-between items-center pt-2">
                    <span className="text-slate-500 font-medium">Total a Pagar</span>
                    <span className="font-bold text-cyan-700 text-xl lg:text-2xl">${cartTotal}</span>
                </div>
            </div>

            <DialogFooter className="sm:justify-center gap-3 mt-4">
                <Button variant="outline" onClick={() => setConfirmOpen(false)} className="rounded-xl px-6 h-12 w-full sm:w-auto border-slate-200 text-base">Corregir</Button>
                <Button 
                    onClick={handleCreateOrder} 
                    disabled={processingOrder}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl px-8 h-12 w-full sm:w-auto shadow-md shadow-cyan-200 text-base"
                >
                    {processingOrder ? 'Procesando...' : 'Confirmar Orden'}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Recibo - Optimizado para POS */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
            <DialogHeader>
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-3 text-green-600">
                    <CheckCircle2 className="w-10 h-10" />
                </div>
                <DialogTitle className="text-center text-xl lg:text-2xl text-slate-800">¡Pedido Creado!</DialogTitle>
                <DialogDescription className="text-center text-base">Orden #{lastOrder?.orderId} registrada exitosamente</DialogDescription>
            </DialogHeader>
            
            {lastOrder && (
              <div className="bg-slate-50 p-5 rounded-xl space-y-3 text-sm lg:text-base border border-slate-100 mt-2">
                  <div className="flex justify-between">
                      <span className="text-slate-500">Cliente</span>
                      <span className="font-semibold text-slate-800">{lastOrder.clientName}</span>
                  </div>
                  <div className="flex justify-between">
                      <span className="text-slate-500">Servicios</span>
                      <span className="text-slate-700">{lastOrder.items.length} ítem(s)</span>
                  </div>
                  <div className="flex justify-between">
                      <span className="text-slate-500">Entrega</span>
                      <span className="text-slate-700">{format(lastOrder.deliveryDate, "dd/MM")} {lastOrder.deliveryTime}</span>
                  </div>
                  <div className="h-px bg-slate-200 my-2" />
                  <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-700">Total</span>
                      <span className="font-bold text-cyan-700 text-xl lg:text-2xl">${lastOrder.total}</span>
                  </div>
              </div>
            )}

            <DialogFooter className="flex-col gap-3 mt-4">
                <Button 
                    onClick={handlePrintReceipt}
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl h-14 shadow-md shadow-cyan-200 flex items-center justify-center gap-2 text-base active:scale-[0.98]"
                >
                    <Printer className="w-6 h-6" />
                    Imprimir Recibo
                </Button>
                <Button 
                    variant="outline" 
                    onClick={() => setReceiptOpen(false)} 
                    className="w-full rounded-xl h-12 border-slate-200 text-base"
                >
                    Cerrar
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}