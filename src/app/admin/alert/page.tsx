"use client";

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useFirestore } from '@/firebase/provider';
import { collection, query, where, onSnapshot, orderBy, doc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  AlertTriangle, 
  Package, 
  UserPlus, 
  Check, 
  Trash2, 
  ArrowRight,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from "@/lib/utils";

export default function AlertsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [inventoryAlerts, setInventoryAlerts] = useState<any[]>([]);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [inventoryNotifications, setInventoryNotifications] = useState<any[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notifiedInventoryIds, setNotifiedInventoryIds] = useState<Set<string>>(new Set());
  const [notifiedUserIds, setNotifiedUserIds] = useState<Set<string>>(new Set());

  // Función para enviar alertas por WhatsApp al admin
  const sendAdminWhatsAppAlert = async (message: string) => {
    try {
      await fetch('/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'alert',
          channel: 'whatsapp',
          to: { phone: '3121061790' },
          name: 'Administrador',
          status: 'alerta',
          customMessage: message
        }),
      });
    } catch (error) {
      console.error('Error enviando alerta WhatsApp:', error);
    }
  };

  useEffect(() => {
    if (!firestore) return;

    // 1. Alertas de Stock Bajo (Calculado en tiempo real)
    const invCol = collection(firestore, 'inventory');
    const unsubInv = onSnapshot(invCol, (snap: any) => {
      const items: any[] = [];
      snap.forEach((d: any) => items.push({ id: d.id, ...d.data() }));
      const low = items.filter(it => {
        const qty = Number(it.quantity ?? it.stockActual ?? it.cantidad ?? it.stock ?? 0);
        const min = Number(it.minThreshold ?? it.stockCritico ?? it.stockMin ?? 0);
        return qty <= min; // Incluye agotados (0) y bajos
      });
      setInventoryAlerts(low);

      // Enviar alerta por WhatsApp si hay nuevos items críticos
      low.forEach(item => {
        if (!notifiedInventoryIds.has(item.id)) {
          const qty = Number(item.quantity ?? item.stock ?? 0);
          const isOut = qty === 0;
          const message = isOut 
            ? `🚨 *ALERTA CRÍTICA - Lavandería Angy*\n\n❌ *Producto AGOTADO*\n📦 ${item.name || 'Producto'}\n\n⚠️ Stock actual: 0\n📊 Mínimo requerido: ${item.minThreshold ?? 0}\n\n🔴 Requiere reposición INMEDIATA`
            : `⚠️ *ALERTA - Lavandería Angy*\n\n📦 *Stock Bajo*\n${item.name || 'Producto'}\n\n📊 Stock actual: ${qty}\n📌 Mínimo: ${item.minThreshold ?? 0}\n\n🟡 Considere reponer pronto`;
          
          sendAdminWhatsAppAlert(message);
          setNotifiedInventoryIds(prev => new Set(prev).add(item.id));
        }
      });
    });

    // 2. Usuarios Pendientes
    const usersQ = query(collection(firestore, 'users'), where('status', '==', 'pendiente'));
    const unsubUsers = onSnapshot(usersQ, (snap: any) => {
      const items: any[] = [];
      snap.forEach((d: any) => items.push({ id: d.id, ...d.data() }));
      setPendingUsers(items);

      // Enviar alerta por WhatsApp si hay nuevos usuarios pendientes
      items.forEach(user => {
        if (!notifiedUserIds.has(user.id)) {
          const message = `👤 *NUEVO USUARIO - Lavandería Angy*\n\n✨ *Solicitud de Registro*\n\n👤 Nombre: ${user.name || 'Sin nombre'}\n📧 Email: ${user.email || 'No proporcionado'}\n📱 Teléfono: ${user.phone || 'No proporcionado'}\n\n⏳ Estado: Pendiente de aprobación\n\n💡 Revise el panel de administración para aprobar o rechazar.`;
          
          sendAdminWhatsAppAlert(message);
          setNotifiedUserIds(prev => new Set(prev).add(user.id));
        }
      });
    });

    // 3. Notificaciones Manuales/Automáticas de Inventario (Colección 'alerts')
    const alertsCol = collection(firestore, 'alerts');
    // En prod: orderBy('createdAt', 'desc') requiere índice compuesto si se combina con where
    const unsubAlerts = onSnapshot(alertsCol, (snap: any) => {
      const items: any[] = [];
      snap.forEach((d: any) => items.push({ id: d.id, ...d.data() }));
      
      // Filtrar y ordenar en cliente para evitar problemas de índices en dev
      const activeAlerts = items
        .filter(n => n.type === 'inventory' && n.status !== 'dismissed')
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        
      setInventoryNotifications(activeAlerts);
    });

    return () => {
      unsubInv();
      unsubUsers();
      unsubAlerts();
    };
  }, [firestore]);

  const stats = useMemo(() => ({
    total: inventoryAlerts.length + pendingUsers.length + inventoryNotifications.length,
    stock: inventoryAlerts.length,
    users: pendingUsers.length,
    manual: inventoryNotifications.length
  }), [inventoryAlerts, pendingUsers, inventoryNotifications]);

  async function dismissNotification(id: string) {
    if (!firestore || !id) return;
    try {
      setProcessingId(id);
      await updateDoc(doc(firestore, 'alerts', id), { status: 'dismissed', dismissedAt: serverTimestamp() });
      toast({ title: "Alerta descartada", description: "Se ha marcado como leída." });
    } catch (e) {
      toast({ title: "Error", description: "No se pudo descartar la alerta.", variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  }

  async function deleteNotification(id: string) {
    if (!firestore || !id) return;
    try {
      setProcessingId(id);
      await deleteDoc(doc(firestore, 'alerts', id));
      toast({ title: "Alerta eliminada", description: "Registro borrado permanentemente." });
    } catch (e) {
      toast({ title: "Error", description: "No se pudo eliminar la alerta.", variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  }

  // Componente de Tarjeta de Resumen
  const SummaryCard = ({ title, count, icon: Icon, color }: any) => (
    <Card className="border-0 shadow-md bg-white">
        <CardContent className="p-4 flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-slate-500">{title}</p>
                <h3 className="text-2xl font-bold text-slate-800">{count}</h3>
            </div>
            <div className={`p-3 rounded-xl ${color}`}>
                <Icon className="w-6 h-6" />
            </div>
        </CardContent>
    </Card>
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

      {/* Contenido principal */}
      <div className="relative z-10 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Encabezado */}
        <div className="flex items-center gap-4 mb-8 text-white">
          <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner ring-2 ring-white/10">
            <Bell className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight drop-shadow-sm">Centro de Alertas</h1>
            <p className="text-cyan-50 opacity-90">Monitoreo de eventos críticos del sistema</p>
          </div>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <SummaryCard 
                title="Inventario Crítico" 
                count={stats.stock} 
                icon={Package} 
                color={stats.stock > 0 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"} 
            />
            <SummaryCard 
                title="Usuarios Nuevos" 
                count={stats.users} 
                icon={UserPlus} 
                color={stats.users > 0 ? "bg-orange-100 text-orange-600" : "bg-slate-100 text-slate-600"} 
            />
            <SummaryCard 
                title="Notificaciones" 
                count={stats.manual} 
                icon={Info} 
                color="bg-blue-100 text-blue-600" 
            />
        </div>

        <div className="space-y-6">
          
          {/* SECCIÓN 1: INVENTARIO CRÍTICO */}
          <Card className="shadow-xl border-0 rounded-3xl overflow-hidden backdrop-blur-sm bg-white/95">
            <CardHeader className="bg-white border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <CardTitle className="text-lg text-slate-800">Atención Inmediata: Inventario</CardTitle>
                  </div>
                  <Button variant="outline" size="sm" asChild className="text-slate-500 hover:text-slate-800">
                    <Link href="/admin/inventory">Gestionar Todo <ArrowRight className="ml-1 h-3 w-3" /></Link>
                  </Button>
              </div>
              <CardDescription>Artículos agotados o por debajo del mínimo permitido.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {inventoryAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-slate-400 bg-slate-50/50">
                   <Check className="h-8 w-8 mb-2 opacity-50 text-green-500" />
                   <p className="text-sm font-medium">Todo el inventario está bajo control.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {inventoryAlerts.map(it => {
                     const isOut = (it.quantity ?? it.stock ?? 0) === 0;
                     return (
                      <div key={it.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className={cn("p-2 rounded-lg", isOut ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600")}>
                                <Package className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="font-semibold text-slate-800">{it.name || 'Sin nombre'}</div>
                                <div className="text-xs text-slate-500 flex gap-2 mt-0.5">
                                    <span className={cn("font-medium", isOut ? "text-red-500" : "text-orange-500")}>
                                        Stock: {it.quantity ?? 0}
                                    </span>
                                    <span>•</span>
                                    <span>Mínimo: {it.minThreshold ?? 0}</span>
                                </div>
                            </div>
                        </div>
                        <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800 rounded-xl" asChild>
                          <Link href={`/admin/inventory?highlight=${it.id}`}>Reponer</Link>
                        </Button>
                      </div>
                     );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* SECCIÓN 2: USUARIOS PENDIENTES */}
          <Card className="shadow-lg border-0 rounded-3xl overflow-hidden backdrop-blur-sm bg-white/95">
            <CardHeader className="bg-white border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-orange-500" />
                  <CardTitle className="text-lg text-slate-800">Solicitudes de Acceso</CardTitle>
              </div>
              <CardDescription>Usuarios registrados esperando aprobación manual.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
               {pendingUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-slate-400 bg-slate-50/50">
                   <Check className="h-8 w-8 mb-2 opacity-50 text-green-500" />
                   <p className="text-sm font-medium">No hay solicitudes pendientes.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pendingUsers.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold border border-orange-200">
                             {(u.name || u.email || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                             <div className="font-semibold text-slate-800">{u.name || 'Usuario'}</div>
                             <div className="text-xs text-slate-500">{u.email}</div>
                          </div>
                      </div>
                      <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl" asChild>
                            <Link href="/admin/users">Revisar</Link>
                          </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* SECCIÓN 3: HISTORIAL DE NOTIFICACIONES */}
          <Card className="shadow-lg border-0 rounded-3xl overflow-hidden backdrop-blur-sm bg-white/95">
             <CardHeader className="bg-white border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Info className="h-5 w-5 text-blue-500" />
                        <CardTitle className="text-lg text-slate-800">Historial de Eventos</CardTitle>
                    </div>
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600">{inventoryNotifications.length} activas</Badge>
                </div>
             </CardHeader>
             <CardContent className="p-0">
                {inventoryNotifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">Sin notificaciones recientes.</div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {inventoryNotifications.map(n => (
                            <div key={n.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 p-1.5 bg-blue-50 rounded-md text-blue-600">
                                        <Bell className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-800 text-sm">{n.name || 'Alerta de sistema'}</p>
                                        <p className="text-xs text-slate-500">
                                            Estado: <span className="font-semibold">{n.status}</span> · 
                                            Stock registrado: {n.stock}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 self-end sm:self-auto">
                                    <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="text-slate-400 hover:text-green-600 hover:bg-green-50 h-8 px-2"
                                        disabled={processingId === n.id}
                                        onClick={() => dismissNotification(n.id)}
                                        title="Marcar como leída"
                                    >
                                        <Check className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 px-2"
                                        disabled={processingId === n.id}
                                        onClick={() => deleteNotification(n.id)}
                                        title="Eliminar"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
             </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}