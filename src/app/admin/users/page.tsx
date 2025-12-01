"use client"

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
import { MoreHorizontal, PlusCircle, Check, X, Trash2, Edit2 } from "lucide-react";
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { addDoc, collection as collectionRef, serverTimestamp } from 'firebase/firestore';
// actions will be inline buttons instead of a dropdown

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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle className="font-headline">Gestión de Usuarios</CardTitle>
            <CardDescription>
                Ver, gestionar y aprobar usuarios en la plataforma.
            </CardDescription>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Ver:</Label>
            <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="h-9 rounded border px-2">
              <option value="all">Todos</option>
              <option value="client">Clientes</option>
              <option value="personal">Personal</option>
            </select>
          </div>
          <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <PlusCircle className="h-4 w-4" />
              Añadir Usuario
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Añadir Usuario</DialogTitle>
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
                // close is handled by DialogClose on the submit button
              }}
            >
              <div className="grid gap-2">
                <div className="grid grid-cols-1 gap-1">
                  <Label htmlFor="name">Nombre</Label>
                  <Input id="name" name="name" />
                </div>
                <div className="grid grid-cols-1 gap-1">
                  <Label htmlFor="email">Correo</Label>
                  <Input id="email" name="email" type="email" />
                </div>
                  <div className="grid grid-cols-1 gap-1">
                    <Label htmlFor="defaultPass">Contraseña por defecto</Label>
                    <Input id="defaultPass" name="defaultPass" value={defaultPass} onChange={(e) => setDefaultPass((e.target as HTMLInputElement).value)} />
                    <p className="text-xs text-muted-foreground mt-1">El usuario deberá cambiar esta contraseña al iniciar sesión.</p>
                  </div>
                <div className="grid grid-cols-1 gap-1">
                  <Label htmlFor="role">Tipo de cuenta</Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setRoleValue('client')}
                      className={`h-9 px-3 rounded ${roleValue === 'client' ? 'bg-cyan-600 text-white' : 'border'}`}
                    >
                      Cliente
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoleValue('personal')}
                      className={`h-9 px-3 rounded ${roleValue === 'personal' ? 'bg-cyan-600 text-white' : 'border'}`}
                    >
                      Personal
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">El rol se asignará automáticamente según el tipo seleccionado.</p>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="ghost">Cancelar</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button type="submit">Crear y Aprobar</Button>
                </DialogClose>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estatus</TableHead>
              <TableHead>Fecha de Alta</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="person portrait" />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="font-medium">
                      {user.name}
                      <div className="text-sm text-muted-foreground">
                        {user.email}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={user.role === 'admin' ? 'default' : user.role === 'personal' ? 'secondary' : 'outline'}>
                    {user.role === 'admin' ? 'Administrador' : user.role === 'personal' ? 'Personal' : 'Cliente'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {user.status ? (
                    <Badge variant={user.status === 'aprobado' ? 'default' : user.status === 'pendiente' ? 'secondary' : 'destructive'}>
                      {user.status === 'aprobado' ? 'Aprobado' : user.status === 'pendiente' ? 'Pendiente' : 'Rechazado'}
                    </Badge>
                  ) : (
                    <Badge variant="outline">-</Badge>
                  )}
                </TableCell>
                <TableCell>{user.createdAt ? (user.createdAt.seconds ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : String(user.createdAt)) : user.dateAdded}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="ghost" onClick={() => setStatus(user.id, 'aprobado')} aria-label="Aprobar">
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setStatus(user.id, 'rechazado')} aria-label="Rechazar">
                      <X className="h-4 w-4" />
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="icon" variant="ghost" aria-label="Editar">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
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
                        }}>
                          <div className="grid gap-2">
                            <div>
                              <Label htmlFor="name">Nombre</Label>
                              <Input id="name" name="name" defaultValue={user.name} />
                            </div>
                            <div>
                              <Label htmlFor="email">Correo</Label>
                              <Input id="email" name="email" type="email" defaultValue={user.email} />
                            </div>
                            <div>
                              <Label htmlFor="role">Rol</Label>
                              <select id="role" name="role" defaultValue={user.role || 'client'} className="w-full h-9 rounded border px-2">
                                <option value="client">Cliente</option>
                                <option value="personal">Personal</option>
                                <option value="admin">Admin</option>
                              </select>
                            </div>
                            <div>
                              <Label htmlFor="status">Estatus</Label>
                              <select id="status" name="status" defaultValue={user.status || 'pendiente'} className="w-full h-9 rounded border px-2">
                                <option value="aprobado">Aprobado</option>
                                <option value="pendiente">Pendiente</option>
                                <option value="rechazado">Rechazado</option>
                              </select>
                            </div>
                          </div>
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button variant="ghost">Cancelar</Button>
                            </DialogClose>
                            <DialogClose asChild>
                              <Button type="submit">Guardar</Button>
                            </DialogClose>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                    <Button size="icon" variant="ghost" onClick={() => { setSelectedToDelete(user); setConfirmOpen(true); }} aria-label="Eliminar">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {/* Confirm delete dialog */}
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar eliminación</DialogTitle>
              <DialogDescription>
                ¿Estás seguro de eliminar a {selectedToDelete?.name ?? 'este usuario'}? Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost">Cancelar</Button>
              </DialogClose>
              <Button
                onClick={async () => {
                  if (!selectedToDelete) return;
                  await deleteUser(selectedToDelete.id);
                  setSelectedToDelete(null);
                  setConfirmOpen(false);
                }}
              >
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
