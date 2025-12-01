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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { users as placeholderUsers } from "@/lib/placeholder-data";
import { useEffect, useState } from 'react';
import { useFirestore, useAuth } from '@/firebase/provider';
import { writeAudit } from '@/lib/audit';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, updateDoc, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { Button } from "@/components/ui/button";
import { PlusCircle, Check, X, Trash2, Edit2, Users } from "lucide-react"; // Agregué Users icon
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function UsersPage() {
  const firestore = useFirestore();
  const [usersList, setUsersList] = useState<Array<any>>([]);

  useEffect(() => {
    const col = collection(firestore, 'users');
    const unsub = onSnapshot(col, (snap) => {
      const items: any[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      setUsersList(items);
    });
    return () => unsub();
  }, [firestore]);

  const usersToShow = usersList.length ? usersList : placeholderUsers;
  const [filter, setFilter] = useState<'all'|'client'|'personal'>('all');

  const filteredUsers = usersToShow.filter((u: any) => {
    if (filter === 'all') return true;
    return (u.role || '').toString() === filter;
  });

  const { toast } = useToast();
  const [migrating, setMigrating] = useState<boolean>(false);
  const [roleValue, setRoleValue] = useState<string>('client');
  const [defaultPass, setDefaultPass] = useState<string>('Cambio123!');
  const auth = useAuth();
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const [selectedToDelete, setSelectedToDelete] = useState<any | null>(null);

  async function setStatus(uid: string, status: string) {
    try {
      const beforeSnap = await getDoc(doc(firestore, 'users', uid));
      const before = beforeSnap.exists() ? beforeSnap.data() : null;
      await updateDoc(doc(firestore, 'users', uid), { status });
      toast({ title: `Usuario ${status}`, description: `Estado actualizado a ${status}.` });
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
      console.error('Update status error', e);
      toast({ title: 'Error', description: e?.message || 'No se pudo actualizar el estado.', variant: 'destructive' });
    }
  }

  async function deleteUser(uid: string) {
    try {
      const beforeSnap = await getDoc(doc(firestore, 'users', uid));
      const before = beforeSnap.exists() ? beforeSnap.data() : null;
      await deleteDoc(doc(firestore, 'users', uid));
      toast({ title: 'Usuario eliminado', description: 'El usuario fue eliminado.' });
      writeAudit(firestore, {
        actorUid: auth?.currentUser?.uid ?? null,
        actorEmail: auth?.currentUser?.email ?? null,
        action: 'delete',
        resource: 'users',
        resourceId: uid,
        before,
      });
    } catch (e: any) {
      console.error('Delete user error', e);
      toast({ title: 'Error', description: e?.message || 'No se pudo eliminar el usuario.', variant: 'destructive' });
    }
  }

  async function updateUser(uid: string, payload: Record<string, any>) {
    try {
      const beforeSnap = await getDoc(doc(firestore, 'users', uid));
      const before = beforeSnap.exists() ? beforeSnap.data() : null;
      await updateDoc(doc(firestore, 'users', uid), { ...payload });
      toast({ title: 'Usuario actualizado', description: 'Los datos fueron actualizados.' });
      writeAudit(firestore, {
        actorUid: auth?.currentUser?.uid ?? null,
        actorEmail: auth?.currentUser?.email ?? null,
        action: 'update_user',
        resource: 'users',
        resourceId: uid,
        before,
        after: { ...(before || {}), ...payload },
      });
    } catch (e: any) {
      console.error('Update user error', e);
      toast({ title: 'Error', description: e?.message || 'No se pudo actualizar el usuario.', variant: 'destructive' });
    }
  }

  async function createUserDirect(data: { name: string; email: string; role: string }, password?: string) {
    try {
      // Call server-side endpoint to create Auth user and Firestore doc
      const res = await fetch('/api/create-auth-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.name, email: data.email, role: data.role, defaultPassword: password || defaultPass }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Error creating auth user');
      toast({ title: 'Usuario creado', description: `Usuario Auth creado (uid: ${j.uid})` });
      writeAudit(firestore, {
        actorUid: auth?.currentUser?.uid ?? null,
        actorEmail: auth?.currentUser?.email ?? null,
        action: 'create_auth_user',
        resource: 'users',
        resourceId: j.docId ?? null,
        after: { name: data.name, email: data.email, role: data.role || 'client', status: 'aprobado', authUid: j.uid },
      });
      if (j.resetLink) {
        console.log('Reset link for user:', j.resetLink);
        toast({ title: 'Enlace de restablecimiento', description: 'Se generó un enlace de restablecimiento. Revisar consola para copiarlo.' });
      }
    } catch (e: any) {
      console.error('Create user error', e);
      toast({ title: 'Error', description: e?.message || 'No se pudo crear el usuario.', variant: 'destructive' });
    }
  }

  return (
    // CONTENEDOR PRINCIPAL ACUÁTICO
    <div className="min-h-screen bg-slate-50 relative overflow-hidden font-sans p-4 md:p-8">
      
      {/* --- FONDO SUPERIOR --- */}
      <div className="absolute top-0 left-0 w-full h-[40vh] bg-gradient-to-br from-cyan-500 via-sky-500 to-blue-600 rounded-b-[50px] shadow-lg overflow-hidden z-0">
        <div className="absolute top-10 left-10 w-24 h-24 bg-white/10 rounded-full blur-xl animate-pulse" />
        <div className="absolute top-20 right-20 w-32 h-32 bg-cyan-200/20 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 left-1/3 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
      </div>

      {/* --- CONTENIDO PRINCIPAL --- */}
      <div className="relative z-10 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* HEADER DE LA PÁGINA */}
        <div className="flex items-center gap-4 mb-8 text-white">
          <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner ring-2 ring-white/10">
            <Users className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight drop-shadow-sm">Panel de Administración</h1>
            <p className="text-cyan-50 opacity-90">Gestión centralizada de usuarios y roles</p>
          </div>
        </div>

        {/* TARJETA DE GESTIÓN */}
        <Card className="shadow-2xl border-0 rounded-3xl overflow-hidden backdrop-blur-sm bg-white/95">
          <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between bg-slate-50/50 pb-6 border-b border-slate-100">
            <div className="mb-4 md:mb-0">
                <CardTitle className="font-headline text-2xl text-cyan-900">Gestión de Usuarios</CardTitle>
                <CardDescription className="text-slate-500 mt-1">
                  Administra el acceso, roles y estados de los usuarios en la plataforma.
                </CardDescription>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filtrar:</Label>
                <select 
                  value={filter} 
                  onChange={(e) => setFilter(e.target.value as any)} 
                  className="h-8 bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer text-slate-700"
                >
                  <option value="all">Todos</option>
                  <option value="client">Clientes</option>
                  <option value="personal">Personal</option>
                </select>
              </div>

              <Dialog>
                <div className="flex items-center gap-2">
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2 bg-cyan-600 hover:bg-cyan-700 text-white shadow-md shadow-cyan-200 rounded-xl h-10 px-4 transition-all hover:scale-105" onClick={() => setRoleValue('client')}>
                      <PlusCircle className="h-4 w-4" />
                      Nuevo Cliente
                    </Button>
                  </DialogTrigger>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-2 border-cyan-200 text-cyan-700 hover:bg-cyan-50 hover:text-cyan-800 rounded-xl h-10 px-4" onClick={() => setRoleValue('personal')}>
                      <PlusCircle className="h-4 w-4" />
                      Nuevo Personal
                    </Button>
                  </DialogTrigger>
                </div>
                
                {/* MODAL DE CREACIÓN */}
                <DialogContent className="sm:max-w-[425px] rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-cyan-900 text-xl">Añadir Usuario</DialogTitle>
                  <DialogDescription>Crear un nuevo usuario directamente en la base de datos con estado aprobado.</DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget as HTMLFormElement);
                    const name = String(fd.get('name') || '').trim();
                    const email = String(fd.get('email') || '').trim();
                    const role = roleValue || 'client';
                    if (!name || !email) {
                      toast({ title: 'Faltan datos', description: 'Nombre y correo son requeridos.' });
                      return;
                    }
                    createUserDirect({ name, email, role });
                  }}
                  className="space-y-4 py-2"
                >
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="name" className="text-slate-600">Nombre</Label>
                      <Input id="name" name="name" className="rounded-xl border-slate-200" placeholder="Ej. Ana García" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="email" className="text-slate-600">Correo Electrónico</Label>
                      <Input id="email" name="email" type="email" className="rounded-xl border-slate-200" placeholder="correo@ejemplo.com" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="defaultPass" className="text-slate-600">Contraseña Temporal</Label>
                      <Input id="defaultPass" name="defaultPass" value={defaultPass} onChange={(e) => setDefaultPass((e.target as HTMLInputElement).value)} className="rounded-xl border-slate-200" />
                      <p className="text-xs text-muted-foreground mt-1 bg-yellow-50 text-yellow-700 p-2 rounded-lg border border-yellow-100">
                        ⚠️ El usuario deberá cambiar esta contraseña al iniciar sesión.
                      </p>
                    </div>
                    <div className="space-y-1">
                       <Label className="text-slate-600">Rol Asignado</Label>
                       <div className="p-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium text-slate-700">
                          {roleValue === 'personal' ? '🛠️ Personal de Servicio' : '👤 Cliente'}
                       </div>
                    </div>
                  </div>
                  <DialogFooter className="mt-4">
                    <DialogClose asChild>
                      <Button type="button" variant="ghost" className="rounded-xl">Cancelar</Button>
                    </DialogClose>
                    <DialogClose asChild>
                      <Button type="submit" className="rounded-xl bg-cyan-600 hover:bg-cyan-700">Crear y Aprobar</Button>
                    </DialogClose>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

             
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="hover:bg-transparent border-b border-slate-100">
                  <TableHead className="pl-6 h-12 text-slate-500 font-medium">Usuario</TableHead>
                  <TableHead className="text-slate-500 font-medium">Rol</TableHead>
                  <TableHead className="text-slate-500 font-medium">Estatus</TableHead>
                  <TableHead className="text-slate-500 font-medium">Fecha de Alta</TableHead>
                  <TableHead className="text-right pr-6 text-slate-500 font-medium">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center text-slate-400">
                            No se encontraron usuarios con el filtro seleccionado.
                        </TableCell>
                    </TableRow>
                ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-slate-50/50 border-b border-slate-50 last:border-0 transition-colors">
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                          <AvatarImage src={user.avatar} alt={user.name} />
                          <AvatarFallback className="bg-cyan-100 text-cyan-700 font-bold">{user.name?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-slate-800">{user.name || 'Sin nombre'}</div>
                          <div className="text-xs text-slate-500 font-mono">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`rounded-lg px-2.5 py-0.5 font-normal ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200' : 
                          user.role === 'personal' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200' : 
                          'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200 shadow-none'
                      }`}>
                        {user.role === 'admin' ? 'Administrador' : user.role === 'personal' ? 'Personal' : 'Cliente'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.status ? (
                        <div className="flex items-center gap-1.5">
                            <span className={`h-2 w-2 rounded-full ${
                                user.status === 'aprobado' ? 'bg-green-500' : 
                                user.status === 'pendiente' ? 'bg-yellow-400' : 'bg-red-500'
                            }`} />
                            <span className="text-sm text-slate-600 capitalize">{user.status}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                        {user.createdAt ? (user.createdAt.seconds ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : String(user.createdAt)) : user.dateAdded || '-'}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg" onClick={() => setStatus(user.id, 'aprobado')} title="Aprobar">
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg" onClick={() => setStatus(user.id, 'rechazado')} title="Rechazar">
                          <X className="h-4 w-4" />
                        </Button>
                        
                        {/* MODAL EDITAR */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg" title="Editar">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="rounded-2xl">
                            <DialogHeader>
                              <DialogTitle>Editar Usuario</DialogTitle>
                              <DialogDescription>Actualiza los datos del usuario.</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={async (e) => {
                              e.preventDefault();
                              const fd = new FormData(e.currentTarget as HTMLFormElement);
                              const name = String(fd.get('name') || '').trim();
                              const email = String(fd.get('email') || '').trim();
                              const role = String(fd.get('role') || 'client');
                              const status = String(fd.get('status') || 'aprobado');
                              if (!name || !email) { toast({ title: 'Faltan datos', description: 'Nombre y correo son requeridos.' }); return; }
                              await updateUser(user.id, { name, email, role, status });
                            }} className="space-y-4">
                              <div className="space-y-3">
                                <div>
                                  <Label htmlFor="name">Nombre</Label>
                                  <Input id="name" name="name" defaultValue={user.name} className="rounded-xl" />
                                </div>
                                <div>
                                  <Label htmlFor="email">Correo</Label>
                                  <Input id="email" name="email" type="email" defaultValue={user.email} className="rounded-xl" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                    <Label htmlFor="role">Rol</Label>
                                    <select id="role" name="role" defaultValue={user.role || 'client'} className="w-full h-10 rounded-xl border border-slate-200 px-3 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
                                        <option value="client">Cliente</option>
                                        <option value="personal">Personal</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                    </div>
                                    <div>
                                    <Label htmlFor="status">Estatus</Label>
                                    <select id="status" name="status" defaultValue={user.status || 'pendiente'} className="w-full h-10 rounded-xl border border-slate-200 px-3 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
                                        <option value="aprobado">Aprobado</option>
                                        <option value="pendiente">Pendiente</option>
                                        <option value="rechazado">Rechazado</option>
                                    </select>
                                    </div>
                                </div>
                              </div>
                              <DialogFooter>
                                <DialogClose asChild>
                                  <Button variant="ghost" className="rounded-xl">Cancelar</Button>
                                </DialogClose>
                                <DialogClose asChild>
                                  <Button type="submit" className="rounded-xl bg-cyan-600 hover:bg-cyan-700">Guardar Cambios</Button>
                                </DialogClose>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>

                        <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg" onClick={() => { setSelectedToDelete(user); setConfirmOpen(true); }} title="Eliminar">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )))}
              </TableBody>
            </Table>

            {/* Confirm delete dialog */}
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <DialogContent className="rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-red-600">Confirmar eliminación</DialogTitle>
                  <DialogDescription>
                    ¿Estás seguro de eliminar a <span className="font-bold text-slate-800">{selectedToDelete?.name}</span>? Esta acción es irreversible.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="ghost" className="rounded-xl">Cancelar</Button>
                  </DialogClose>
                  <Button
                    className="bg-red-500 hover:bg-red-600 text-white rounded-xl"
                    onClick={async () => {
                      if (!selectedToDelete) return;
                      await deleteUser(selectedToDelete.id);
                      setSelectedToDelete(null);
                      setConfirmOpen(false);
                    }}
                  >
                    Eliminar Definitivamente
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}