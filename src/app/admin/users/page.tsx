"use client";

import { useEffect, useState, useMemo } from 'react';
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
  CardFooter
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Users, 
  Search, 
  Plus, 
  Trash2, 
  Edit2, 
  CheckCircle2, 
  XCircle, 
  ShieldAlert, 
  ShieldCheck, 
  User, 
  RefreshCw,
  MoreHorizontal,
  Briefcase
} from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useFirestore, useAuth } from '@/firebase/provider';
import { writeAudit } from '@/lib/audit';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, updateDoc, doc, deleteDoc, getDoc, setDoc } from 'firebase/firestore';
import { cn } from "@/lib/utils";

export default function UsersPage() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  // --- Estados ---
  const [usersList, setUsersList] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'client' | 'personal' | 'admin'>('all');
  
  // Estados de Modales
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  
  // Formulario Creación
  const [newUserRole, setNewUserRole] = useState<string>('client');
  const [defaultPass, setDefaultPass] = useState<string>('Cambio123');
  const [migrating, setMigrating] = useState<boolean>(false);

  // --- Carga de Datos ---
  useEffect(() => {
    if (!firestore) return;
    // Escuchar colección de usuarios en tiempo real
    const unsub = onSnapshot(collection(firestore, 'users'), (snap) => {
      const items: any[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      // Ordenar por fecha de creación (más reciente primero) si existe, sino por nombre
      items.sort((a, b) => {
          const da = a.createdAt?.seconds || 0;
          const db = b.createdAt?.seconds || 0;
          return db - da;
      });
      setUsersList(items);
      setLoading(false);
    });
    return () => unsub();
  }, [firestore]);

  // --- Lógica de Filtrado ---
  const filteredUsers = useMemo(() => {
      return usersList.filter(user => {
          const matchesSearch = (user.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
                                (user.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                                (user.phone?.includes(searchQuery));
          const matchesRole = roleFilter === 'all' || user.role === roleFilter;
          return matchesSearch && matchesRole;
      });
  }, [usersList, searchQuery, roleFilter]);

  const stats = useMemo(() => ({
      all: usersList.length,
      client: usersList.filter(u => u.role === 'client').length,
      personal: usersList.filter(u => u.role === 'personal').length,
      admin: usersList.filter(u => u.role === 'admin').length,
  }), [usersList]);

  // --- Acciones ---

  // Función auxiliar para enviar notificaciones por email/SMS
  async function sendStatusNotification(userData: any, newStatus: string) {
    try {
      const hasEmail = userData.email && userData.email.trim();
      const hasPhone = userData.phone && userData.phone.trim();
      
      if (!hasEmail && !hasPhone) {
        console.log('Usuario sin email ni teléfono, no se envía notificación externa');
        return;
      }

      let channel = 'email'; // por defecto email
      if (hasEmail && hasPhone) {
        channel = 'both';
      } else if (hasPhone && !hasEmail) {
        channel = 'sms';
      }

      const response = await fetch('/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          to: {
            email: userData.email,
            phone: userData.phone,
          },
          name: userData.name || 'Usuario',
          status: newStatus,
        }),
      });

      const result = await response.json();
      
      if (result.email) {
        toast({ title: '📧 Correo enviado', description: `Se notificó a ${userData.email}` });
      }
      if (result.sms) {
        toast({ title: '📲 SMS enviado', description: `Se notificó al ${userData.phone}` });
      }
      if (result.errors?.length > 0) {
        console.warn('Errores al notificar:', result.errors);
      }
    } catch (err) {
      console.error('Error enviando notificación:', err);
    }
  }

  async function setStatus(uid: string, status: string) {
    try {
      const beforeSnap = await getDoc(doc(firestore, 'users', uid));
      const before = beforeSnap.exists() ? beforeSnap.data() : null;
      await updateDoc(doc(firestore, 'users', uid), { status });
      toast({ title: `Usuario ${status}`, description: `El estado ha sido actualizado.` });
      
      // Enviar notificación por correo/SMS
      if (before && (status === 'aprobado' || status === 'rechazado')) {
        sendStatusNotification(before, status);
      }
      
      writeAudit(firestore, {
        actorUid: auth?.currentUser?.uid ?? null,
        actorEmail: auth?.currentUser?.email ?? null,
        action: 'update_status',
        resource: 'users',
        resourceId: uid,
        before,
        after: { ...(before || {}), status },
      });
    } catch (e: any) {
      toast({ title: 'Error', description: 'No se pudo actualizar el estado.', variant: 'destructive' });
    }
  }

  async function deleteUser(uid: string) {
    try {
      const beforeSnap = await getDoc(doc(firestore, 'users', uid));
      const before = beforeSnap.exists() ? beforeSnap.data() : null;
      await deleteDoc(doc(firestore, 'users', uid));
      toast({ title: 'Usuario eliminado', description: 'El registro ha sido borrado permanentemente.' });
      setIsDeleteOpen(false);
      
      writeAudit(firestore, {
        actorUid: auth?.currentUser?.uid ?? null,
        actorEmail: auth?.currentUser?.email ?? null,
        action: 'delete',
        resource: 'users',
        resourceId: uid,
        before,
      });
    } catch (e: any) {
      toast({ title: 'Error', description: 'No se pudo eliminar el usuario.', variant: 'destructive' });
    }
  }

  async function updateUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedUser) return;
    
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name') || '').trim();
    const email = String(fd.get('email') || '').trim();
    const phone = String(fd.get('phone') || '').trim(); // Nuevo campo
    const role = String(fd.get('role') || 'client');
    const status = String(fd.get('status') || 'aprobado');

    if (!name || !email) { toast({ title: 'Datos incompletos', description: 'Nombre y correo son requeridos.', variant: 'destructive' }); return; }

    try {
      await updateDoc(doc(firestore, 'users', selectedUser.id), { name, email, phone, role, status });
      toast({ title: 'Usuario actualizado', description: 'Los cambios se han guardado correctamente.' });
      setIsEditOpen(false);
      
      writeAudit(firestore, {
        actorUid: auth?.currentUser?.uid ?? null,
        actorEmail: auth?.currentUser?.email ?? null,
        action: 'update_user',
        resource: 'users',
        resourceId: selectedUser.id,
        before: selectedUser,
        after: { name, email, phone, role, status },
      });
    } catch (e: any) {
      toast({ title: 'Error', description: 'No se pudo actualizar el usuario.', variant: 'destructive' });
    }
  }

  async function createUserDirect(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name') || '').trim();
    const email = String(fd.get('email') || '').trim();
    const phone = String(fd.get('phone') || '').trim(); // Nuevo campo
    const role = newUserRole; 
    
    if (!name || !email) {
       toast({ title: 'Faltan datos', description: 'Nombre y correo son requeridos.', variant: 'destructive' });
       return;
    }

    try {
      const res = await fetch('/api/create-auth-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, role, defaultPassword: defaultPass }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Error creating auth user');
      
      // --- FIX CRÍTICO ---
      // Forzar el guardado del teléfono directamente en Firestore por si la API falla en esto
      if (phone && j.docId) {
          await setDoc(doc(firestore, 'users', j.docId), { phone }, { merge: true });
      }
      // --------------------

      toast({ title: 'Usuario creado', description: `Se ha creado la cuenta para ${name}.` });
      setIsCreateOpen(false);
      
      writeAudit(firestore, {
        actorUid: auth?.currentUser?.uid ?? null,
        actorEmail: auth?.currentUser?.email ?? null,
        action: 'create_auth_user',
        resource: 'users',
        resourceId: j.docId ?? null,
        after: { name, email, phone, role, status: 'aprobado', authUid: j.uid },
      });
      
      if (j.resetLink) {
        console.log('Reset link:', j.resetLink);
      }
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Error', description: 'No se pudo crear el usuario.', variant: 'destructive' });
    }
  }

  // --- Componentes UI ---

  const FilterCard = ({ id, label, count, icon: Icon, colorClass }: any) => (
      <button 
        onClick={() => setRoleFilter(roleFilter === id ? 'all' : id)}
        className={cn(
            "flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 hover:shadow-md w-full text-left relative overflow-hidden group bg-white",
            roleFilter === id 
                ? `border-${colorClass}-200 ring-2 ring-${colorClass}-100 bg-${colorClass}-50` 
                : "border-slate-200 hover:border-cyan-200"
        )}
      >
          <div className={cn("p-3 rounded-xl transition-colors", roleFilter === id ? `bg-${colorClass}-100 text-${colorClass}-700` : `bg-slate-100 text-slate-500 group-hover:bg-${colorClass}-50 group-hover:text-${colorClass}-600`)}>
              <Icon className="w-6 h-6" />
          </div>
          <div>
             <div className="text-2xl font-bold text-slate-800">{count}</div>
             <div className="text-sm text-slate-500 font-medium">{label}</div>
          </div>
          {roleFilter === id && (
            <div className={`absolute bottom-0 left-0 w-full h-1 bg-${colorClass}-500`} />
          )}
      </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden font-sans p-4 md:p-8">
      {/* Fondo */}
      <div className="absolute top-0 left-0 w-full h-[40vh] bg-gradient-to-br from-cyan-600 via-sky-500 to-blue-600 rounded-b-[50px] shadow-lg overflow-hidden z-0">
        <div className="absolute top-10 left-10 w-24 h-24 bg-white/10 rounded-full blur-xl animate-pulse" />
        <div className="absolute top-20 right-20 w-32 h-32 bg-cyan-200/20 rounded-full blur-2xl" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 text-white">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner ring-2 ring-white/10">
                    <Users className="h-8 w-8 text-white" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight drop-shadow-sm">Directorio de Usuarios</h1>
                    <p className="text-cyan-50 opacity-90">Administra roles y accesos a la plataforma</p>
                </div>
            </div>
            <div className="flex gap-2">
                 <Button 
                    variant="secondary" 
                    className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm"
                    onClick={async () => {
                        if (!confirm('¿Sincronizar usuarios de Auth a Base de Datos?')) return;
                        setMigrating(true);
                        try {
                            const token = await auth?.currentUser?.getIdToken();
                            await fetch('/api/migrate-auth-users', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
                            toast({ title: 'Sincronización completada' });
                        } catch (e) { toast({ title: 'Error', variant: 'destructive' }); }
                        finally { setMigrating(false); }
                    }}
                    disabled={migrating}
                 >
                    <RefreshCw className={cn("mr-2 h-4 w-4", migrating && "animate-spin")} /> {migrating ? 'Sincronizando...' : 'Sincronizar'}
                 </Button>
            </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <FilterCard id="all" label="Total Usuarios" count={stats.all} icon={Users} colorClass="slate" />
            <FilterCard id="client" label="Clientes" count={stats.client} icon={User} colorClass="blue" />
            <FilterCard id="personal" label="Personal" count={stats.personal} icon={Briefcase} colorClass="orange" />
            <FilterCard id="admin" label="Administradores" count={stats.admin} icon={ShieldCheck} colorClass="purple" />
        </div>

        {/* Main Card */}
        <Card className="shadow-xl border-0 rounded-3xl overflow-hidden backdrop-blur-sm bg-white/95">
          <CardHeader className="bg-white border-b border-slate-100 pb-4 pt-6 px-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                    <CardTitle className="font-headline text-xl text-slate-800">Lista de Usuarios</CardTitle>
                    <CardDescription className="text-slate-500">Visualiza y gestiona todos los usuarios registrados.</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-cyan-600 transition-colors" />
                        <Input 
                            placeholder="Buscar por nombre, correo o tel..." 
                            className="pl-9 h-10 rounded-xl border-slate-200 bg-slate-50 focus:bg-white transition-all focus-visible:ring-cyan-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                         <Button className="flex-1 sm:flex-none bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl shadow-md" onClick={() => { setNewUserRole('client'); setIsCreateOpen(true); }}>
                            <Plus className="h-4 w-4 mr-2" /> Cliente
                         </Button>
                         <Button variant="outline" className="flex-1 sm:flex-none border-cyan-200 text-cyan-700 hover:bg-cyan-50 rounded-xl" onClick={() => { setNewUserRole('personal'); setIsCreateOpen(true); }}>
                            <Plus className="h-4 w-4 mr-2" /> Personal
                         </Button>
                    </div>
                </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="hover:bg-transparent border-b border-slate-100">
                  <TableHead className="pl-6 font-semibold text-slate-600">Usuario</TableHead>
                  <TableHead className="font-semibold text-slate-600">Rol</TableHead>
                  <TableHead className="font-semibold text-slate-600">Estado</TableHead>
                  <TableHead className="font-semibold text-slate-600">Fecha Registro</TableHead>
                  <TableHead className="text-right pr-6 font-semibold text-slate-600">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                   <TableRow><TableCell colSpan={5} className="h-32 text-center text-slate-400">Cargando usuarios...</TableCell></TableRow>
                ) : filteredUsers.length === 0 ? (
                   <TableRow><TableCell colSpan={5} className="h-32 text-center text-slate-400">No se encontraron usuarios.</TableCell></TableRow>
                ) : (
                   filteredUsers.map((user) => (
                      <TableRow key={user.id} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                        <TableCell className="pl-6 py-4">
                           <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 border-2 border-white shadow-sm ring-1 ring-slate-100">
                                 <AvatarImage src={user.avatar} />
                                 <AvatarFallback className="bg-gradient-to-br from-cyan-100 to-blue-100 text-cyan-700 font-bold">
                                     {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                                 </AvatarFallback>
                              </Avatar>
                              <div>
                                 <p className="font-semibold text-slate-800 text-sm">{user.name || 'Sin nombre'}</p>
                                 <p className="text-xs text-slate-500">{user.email}</p>
                                 {user.phone && <p className="text-xs text-slate-400 font-mono mt-0.5">{user.phone}</p>}
                              </div>
                           </div>
                        </TableCell>
                        <TableCell>
                           <Badge className={cn(
                               "rounded-lg px-2.5 py-0.5 font-medium shadow-none border",
                               user.role === 'admin' ? "bg-purple-50 text-purple-700 border-purple-200" :
                               user.role === 'personal' ? "bg-orange-50 text-orange-700 border-orange-200" :
                               "bg-slate-50 text-slate-600 border-slate-200"
                           )}>
                               {user.role === 'admin' ? 'Administrador' : user.role === 'personal' ? 'Personal' : 'Cliente'}
                           </Badge>
                        </TableCell>
                        <TableCell>
                           {user.status ? (
                               <div className="flex items-center gap-1.5">
                                   <div className={cn("h-2 w-2 rounded-full", 
                                       user.status === 'aprobado' ? "bg-green-500" : 
                                       user.status === 'pendiente' ? "bg-yellow-400" : "bg-red-500"
                                   )} />
                                   <span className="text-sm text-slate-600 capitalize">{user.status}</span>
                               </div>
                           ) : <span className="text-slate-400 text-sm">-</span>}
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm">
                           {user.createdAt?.seconds ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                           <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              {/* Quick Actions for Pending */}
                              {user.status === 'pendiente' && (
                                <>
                                    <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg" onClick={() => setStatus(user.id, 'aprobado')}>
                                            <CheckCircle2 className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger><TooltipContent>Aprobar</TooltipContent></Tooltip></TooltipProvider>
                                    
                                    <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 bg-red-50 hover:bg-red-100 rounded-lg mr-1" onClick={() => setStatus(user.id, 'rechazado')}>
                                            <XCircle className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger><TooltipContent>Rechazar</TooltipContent></Tooltip></TooltipProvider>
                                </>
                              )}

                              <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg" onClick={() => { setSelectedUser(user); setIsEditOpen(true); }}>
                                 <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg" onClick={() => { setSelectedUser(user); setIsDeleteOpen(true); }}>
                                 <Trash2 className="h-4 w-4" />
                              </Button>
                           </div>
                        </TableCell>
                      </TableRow>
                   ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* MODAL CREAR USUARIO */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogContent className="rounded-2xl sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-center text-xl text-slate-800">Nuevo Usuario</DialogTitle>
                    <DialogDescription className="text-center">
                        Estás creando una cuenta de tipo <span className="font-bold text-cyan-600 capitalize">{newUserRole}</span>.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={createUserDirect} className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label>Nombre Completo</Label>
                        <Input name="name" placeholder="Ej. Juan Pérez" className="rounded-xl" required />
                    </div>
                    <div className="space-y-2">
                        <Label>Correo Electrónico</Label>
                        <Input name="email" type="email" placeholder="usuario@email.com" className="rounded-xl" required />
                    </div>
                    {/* Campo Teléfono Agregado */}
                    <div className="space-y-2">
                        <Label>Teléfono (Opcional)</Label>
                        <Input name="phone" type="tel" placeholder="55 1234 5678" className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                        <Label>Contraseña Temporal</Label>
                        <Input value={defaultPass} onChange={e => setDefaultPass(e.target.value)} className="rounded-xl" />
                        <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100 mt-1">⚠️ El usuario deberá cambiarla al ingresar.</p>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" type="button" onClick={() => setIsCreateOpen(false)} className="rounded-xl">Cancelar</Button>
                        <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl shadow-md">Crear Cuenta</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>

        {/* MODAL EDITAR USUARIO */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent className="rounded-2xl sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Editar Usuario</DialogTitle>
                </DialogHeader>
                {selectedUser && (
                    <form onSubmit={updateUser} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nombre</Label>
                            <Input name="name" defaultValue={selectedUser.name} className="rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label>Correo</Label>
                            <Input name="email" defaultValue={selectedUser.email} className="rounded-xl" />
                        </div>
                        {/* Campo Teléfono en Edición */}
                        <div className="space-y-2">
                            <Label>Teléfono</Label>
                            <Input name="phone" defaultValue={selectedUser.phone} className="rounded-xl" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Rol</Label>
                                <select name="role" defaultValue={selectedUser.role} className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:ring-2 focus:ring-cyan-500">
                                    <option value="client">Cliente</option>
                                    <option value="personal">Personal</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>Estatus</Label>
                                <select name="status" defaultValue={selectedUser.status} className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:ring-2 focus:ring-cyan-500">
                                    <option value="aprobado">Aprobado</option>
                                    <option value="pendiente">Pendiente</option>
                                    <option value="rechazado">Rechazado</option>
                                </select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" type="button" onClick={() => setIsEditOpen(false)} className="rounded-xl">Cancelar</Button>
                            <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl">Guardar Cambios</Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>

        {/* MODAL ELIMINAR */}
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
            <DialogContent className="rounded-2xl sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle className="text-red-600 flex items-center gap-2 justify-center">
                        <ShieldAlert className="h-6 w-6" /> Eliminar Usuario
                    </DialogTitle>
                    <DialogDescription className="text-center py-2">
                        ¿Estás seguro de eliminar a <strong>{selectedUser?.name}</strong>?<br/>
                        Esta acción es irreversible.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="sm:justify-center gap-2">
                    <Button variant="ghost" onClick={() => setIsDeleteOpen(false)} className="rounded-xl">Cancelar</Button>
                    <Button className="bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-md" onClick={() => selectedUser && deleteUser(selectedUser.id)}>Eliminar Definitivamente</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}