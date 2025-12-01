"use client";

import { useEffect, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useFirestore, useAuth } from '@/firebase/provider';
import { writeAudit } from '@/lib/audit';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { PlusCircle, Edit2, Trash2 } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

export default function InventoryPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const auth = useAuth();

  const [items, setItems] = useState<Array<any>>([]);

  // add form
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<'kg' | 'pieces'>('kg');
  const [newMinThreshold, setNewMinThreshold] = useState('0');

  // edit
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editUnit, setEditUnit] = useState<'kg' | 'pieces'>('kg');
  const [editMinThreshold, setEditMinThreshold] = useState('0');

  // delete confirm
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState<any | null>(null);

  useEffect(() => {
    const col = collection(firestore, 'inventory');
    const unsub = onSnapshot(col, (snap) => {
      const list: any[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setItems(list);
    });
    return () => unsub();
  }, [firestore]);

  async function addItem(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!name.trim() || !quantity) {
      toast({ title: 'Faltan datos', description: 'Nombre y cantidad son requeridos.' });
      return;
    }
    const qty = parseFloat(quantity.toString());
    if (isNaN(qty)) {
      toast({ title: 'Cantidad inválida', description: 'Introduce un número válido.' });
      return;
    }
    try {
      const minNum = parseFloat(newMinThreshold.toString()) || 0;
      const ref = await addDoc(collection(firestore, 'inventory'), {
        name: name.trim(),
        quantity: qty,
        unit,
        minThreshold: minNum,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Artículo añadido', description: `ID: ${ref.id}` });
      setName(''); setQuantity(''); setUnit('kg'); setNewMinThreshold('0');
      // audit
      writeAudit(firestore, {
        actorUid: auth?.currentUser?.uid ?? null,
        actorEmail: auth?.currentUser?.email ?? null,
        action: 'create',
        resource: 'inventory',
        resourceId: ref.id,
        after: { name: name.trim(), quantity: qty, unit, minThreshold: minNum },
      });
    } catch (err: any) {
      console.error('Add inventory error', err);
      toast({ title: 'Error', description: err?.message || 'No se pudo añadir el artículo.', variant: 'destructive' });
    }
  }

  function openEdit(item: any) {
    setEditing(item);
    setEditName(item.name || '');
    setEditQuantity(String(item.quantity ?? ''));
    setEditUnit(item.unit || 'kg');
    setEditMinThreshold(String(item.minThreshold ?? 0));
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editing) return;
    if (!editName.trim() || !editQuantity) {
      toast({ title: 'Faltan datos', description: 'Nombre y cantidad son requeridos.' });
      return;
    }
    const qty = parseFloat(editQuantity.toString());
    if (isNaN(qty)) {
      toast({ title: 'Cantidad inválida', description: 'Introduce un número válido.' });
      return;
    }
    try {
      const minNum = parseFloat(editMinThreshold.toString()) || 0;
      await updateDoc(doc(firestore, 'inventory', editing.id), {
        name: editName.trim(),
        quantity: qty,
        unit: editUnit,
        minThreshold: minNum,
        updatedAt: serverTimestamp(),
      });
      toast({ title: 'Artículo actualizado' });
      setEditOpen(false); setEditing(null);
      // audit
      writeAudit(firestore, {
        actorUid: auth?.currentUser?.uid ?? null,
        actorEmail: auth?.currentUser?.email ?? null,
        action: 'update',
        resource: 'inventory',
        resourceId: editing.id,
        before: editing,
        after: { name: editName.trim(), quantity: qty, unit: editUnit, minThreshold: minNum },
      });
    } catch (err: any) {
      console.error('Update inventory error', err);
      toast({ title: 'Error', description: err?.message || 'No se pudo actualizar el artículo.', variant: 'destructive' });
    }
  }

  async function confirmDelete(item: any) {
    setToDelete(item); setConfirmOpen(true);
  }

  async function doDelete() {
    if (!toDelete) return;
    try {
      await deleteDoc(doc(firestore, 'inventory', toDelete.id));
      toast({ title: 'Artículo eliminado' });
      setToDelete(null); setConfirmOpen(false);
      // audit
      writeAudit(firestore, {
        actorUid: auth?.currentUser?.uid ?? null,
        actorEmail: auth?.currentUser?.email ?? null,
        action: 'delete',
        resource: 'inventory',
        resourceId: toDelete.id,
        before: toDelete,
      });
    } catch (err: any) {
      console.error('Delete inventory error', err);
      toast({ title: 'Error', description: err?.message || 'No se pudo eliminar el artículo.', variant: 'destructive' });
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Gestionar Inventario</CardTitle>
            <CardDescription>Lista de artículos en inventario. Añade, edita o elimina entradas.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Artículo</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell className="font-medium">{it.name}</TableCell>
                    <TableCell>{`${Number(it.quantity || 0)} ${it.unit === 'kg' ? 'kg' : it.unit === 'pieces' ? 'pzas' : ''}`}</TableCell>
                    <TableCell>
                      {(() => {
                        const min = typeof it.minThreshold === 'number' ? it.minThreshold : parseFloat(it.minThreshold || '0');
                        const qtyVal = Number(it.quantity || 0);
                        const isLow = qtyVal < min;
                        return (
                          <Badge variant={isLow ? 'destructive' : 'default'}>
                            {isLow ? 'Bajo' : 'Bien'}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(it)} aria-label="Editar">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => confirmDelete(it)} aria-label="Eliminar">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Edit dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar Artículo</DialogTitle>
                  <DialogDescription>Modifica nombre, cantidad o unidad.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-2">
                  <div className="grid grid-cols-1 gap-1">
                    <Label htmlFor="edit-name">Nombre</Label>
                    <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    <Label htmlFor="edit-qty">Cantidad</Label>
                    <Input id="edit-qty" type="number" value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    <Label htmlFor="edit-unit">Unidad</Label>
                    <Select defaultValue={editUnit} onValueChange={(v) => setEditUnit(v as 'kg' | 'pieces')}>
                      <SelectTrigger aria-label="Unidad">
                        <SelectValue>{editUnit === 'kg' ? 'Peso (KG)' : 'Piezas'}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">Peso (KG)</SelectItem>
                        <SelectItem value="pieces">Piezas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    <Label htmlFor="edit-min">Stock mínimo</Label>
                    <Input id="edit-min" type="number" value={editMinThreshold} onChange={(e) => setEditMinThreshold(e.target.value)} />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="ghost">Cancelar</Button>
                  </DialogClose>
                  <Button onClick={saveEdit}>Guardar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Confirm delete */}
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmar eliminación</DialogTitle>
                  <DialogDescription>¿Eliminar {toDelete?.name ?? 'este artículo'}? Esta acción no se puede deshacer.</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="ghost">Cancelar</Button>
                  </DialogClose>
                  <Button onClick={doDelete}>Eliminar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

          </CardContent>
        </Card>
      </div>
      <div>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Añadir Artículo</CardTitle>
            <CardDescription>Añade nuevas entradas al inventario.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={addItem}>
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Detergente" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unidad</Label>
                <Select defaultValue={unit} onValueChange={(v) => setUnit(v as 'kg' | 'pieces')}>
                  <SelectTrigger aria-label="Unidad">
                    <SelectValue>{unit === 'kg' ? 'Peso (KG)' : 'Piezas'}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">Peso (KG)</SelectItem>
                    <SelectItem value="pieces">Piezas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="qty">Cantidad</Label>
                <Input id="qty" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Ej: 10" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min">Stock mínimo</Label>
                <Input id="min" type="number" value={newMinThreshold} onChange={(e) => setNewMinThreshold(e.target.value)} placeholder="Ej: 5" />
              </div>
              <Button type="submit" className="w-full">
                <PlusCircle className="mr-2 h-4 w-4" />
                Añadir Artículo
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
