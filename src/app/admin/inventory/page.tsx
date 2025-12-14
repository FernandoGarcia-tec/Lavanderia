"use client";

import { useEffect, useState, useMemo } from "react";
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
import { PlusCircle, Edit2, Trash2, Package, Search, AlertTriangle, XCircle, Box, Plus } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function InventoryPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const auth = useAuth();

  const [items, setItems] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'low' | 'out'>('all');

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
    if (!firestore) return;
    const col = collection(firestore, 'inventory');
    const unsub = onSnapshot(col, (snap) => {
      const list: any[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setItems(list);
      setLoading(false);
    });
    return () => unsub();
  }, [firestore]);

  // Logic
  const filteredItems = useMemo(() => {
    return items.filter(item => {
        const qty = Number(item.quantity ?? 0);
        const min = Number(item.minThreshold ?? 0);
        
        // Status Filter
        if (filterStatus === 'low' && qty > min) return false;
        if (filterStatus === 'out' && qty > 0) return false;
        
        // Search Filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return (item.name || '').toLowerCase().includes(q);
        }
        return true;
    });
  }, [items, filterStatus, searchQuery]);

  const stats = useMemo(() => {
      let low = 0;
      let out = 0;
      items.forEach(i => {
          const qty = Number(i.quantity ?? 0);
          const min = Number(i.minThreshold ?? 0);
          if (qty === 0) out++;
          else if (qty <= min) low++;
      });
      return { total: items.length, low, out };
  }, [items]);

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

  // Helper components
  const FilterCard = ({ id, label, count, icon: Icon, colorClass }: any) => (
      <button 
        onClick={() => setFilterStatus(filterStatus === id ? 'all' : id)}
        className={cn(
            "flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 hover:shadow-md w-full text-left relative overflow-hidden group bg-white",
            filterStatus === id 
                ? `border-${colorClass}-200 ring-2 ring-${colorClass}-100 bg-${colorClass}-50` 
                : "border-slate-200 hover:border-cyan-200"
        )}
      >
          <div className={cn("p-3 rounded-xl transition-colors", filterStatus === id ? `bg-${colorClass}-100 text-${colorClass}-700` : `bg-slate-100 text-slate-500 group-hover:bg-${colorClass}-50 group-hover:text-${colorClass}-600`)}>
              <Icon className="w-6 h-6" />
          </div>
          <div>
             <div className="text-2xl font-bold text-slate-800">{count}</div>
             <div className="text-sm text-slate-500 font-medium">{label}</div>
          </div>
          {filterStatus === id && (
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
                    <Box className="h-8 w-8 text-white" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight drop-shadow-sm">Inventario</h1>
                    <p className="text-cyan-50 opacity-90">Control de insumos y stock</p>
                </div>
            </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <FilterCard id="all" label="Total Artículos" count={stats.total} icon={Package} colorClass="slate" />
            <FilterCard id="low" label="Stock Bajo" count={stats.low} icon={AlertTriangle} colorClass="orange" />
            <FilterCard id="out" label="Agotados" count={stats.out} icon={XCircle} colorClass="red" />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          
          {/* Columna Izquierda: Tabla */}
          <div className="lg:col-span-2">
            <Card className="shadow-xl border-0 rounded-3xl overflow-hidden backdrop-blur-sm bg-white/95">
                <CardHeader className="bg-white border-b border-slate-100 pb-4 pt-6 px-6">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div>
                            <CardTitle className="font-headline text-xl text-slate-800">Listado de Artículos</CardTitle>
                        </div>
                        <div className="relative w-full sm:w-64 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-cyan-600 transition-colors" />
                            <Input 
                                placeholder="Buscar artículo..." 
                                className="pl-9 h-10 rounded-xl border-slate-200 bg-slate-50 focus:bg-white transition-all focus-visible:ring-cyan-500"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                    <TableHeader className="bg-slate-50/80">
                        <TableRow className="hover:bg-transparent border-b border-slate-100">
                        <TableHead className="pl-6 font-semibold text-slate-600">Artículo</TableHead>
                        <TableHead className="font-semibold text-slate-600">Cantidad</TableHead>
                        <TableHead className="font-semibold text-slate-600">Estado</TableHead>
                        <TableHead className="text-right pr-6 font-semibold text-slate-600">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={4} className="h-32 text-center text-slate-400">Cargando inventario...</TableCell></TableRow>
                        ) : filteredItems.length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="h-32 text-center text-slate-400">No se encontraron artículos.</TableCell></TableRow>
                        ) : (
                            filteredItems.map((item) => {
                                const qty = Number(item.quantity ?? 0);
                                const min = Number(item.minThreshold ?? 0);
                                const isOut = qty === 0;
                                const isLow = !isOut && qty <= min;
                                
                                return (
                                <TableRow key={item.id} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                                    <TableCell className="pl-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9 border border-slate-100 bg-slate-50">
                                                <AvatarFallback className="bg-slate-100 text-slate-500">
                                                    <Package className="h-4 w-4" />
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="font-semibold text-slate-700">{item.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-medium text-slate-600">{qty} {item.unit}</span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={cn(
                                            "shadow-none border",
                                            isOut ? "bg-red-50 text-red-700 border-red-200" :
                                            isLow ? "bg-orange-50 text-orange-700 border-orange-200" :
                                            "bg-green-50 text-green-700 border-green-200"
                                        )}>
                                            {isOut ? 'Agotado' : isLow ? 'Bajo' : 'Estable'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg" onClick={() => openEdit(item)}>
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg" onClick={() => confirmDelete(item)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
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

          {/* Columna Derecha: Formulario */}
          <div>
            <Card className="shadow-lg border-0 rounded-3xl overflow-hidden sticky top-6">
                <CardHeader className="bg-white border-b border-slate-100">
                    <CardTitle className="font-headline text-lg text-slate-800">Añadir Artículo</CardTitle>
                    <CardDescription>Registra nuevos insumos.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 bg-slate-50/50">
                    <form className="space-y-4" onSubmit={addItem}>
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-slate-600">Nombre del Artículo</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Detergente líquido" className="rounded-xl border-slate-200 bg-white" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="qty" className="text-slate-600">Cantidad</Label>
                            <Input id="qty" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" className="rounded-xl border-slate-200 bg-white" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="unit" className="text-slate-600">Unidad</Label>
                            <Select defaultValue={unit} onValueChange={(v) => setUnit(v as 'kg' | 'pieces')}>
                                <SelectTrigger className="rounded-xl border-slate-200 bg-white"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="kg">Kilos (kg)</SelectItem>
                                    <SelectItem value="pieces">Piezas</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="min" className="text-slate-600">Stock Mínimo (Alerta)</Label>
                        <Input id="min" type="number" value={newMinThreshold} onChange={(e) => setNewMinThreshold(e.target.value)} placeholder="0" className="rounded-xl border-slate-200 bg-white" />
                    </div>
                    
                    <Button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl shadow-md mt-2">
                        <Plus className="mr-2 h-4 w-4" /> Añadir al Inventario
                    </Button>
                    </form>
                </CardContent>
            </Card>
          </div>

        </div>

        {/* Modales */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent className="rounded-2xl sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Editar Artículo</DialogTitle>
                <DialogDescription>Modifica los detalles del insumo.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
                <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Cantidad</Label>
                        <Input type="number" value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)} className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                        <Label>Unidad</Label>
                        <Select defaultValue={editUnit} onValueChange={(v) => setEditUnit(v as 'kg' | 'pieces')}>
                            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="kg">Kilos (kg)</SelectItem>
                                <SelectItem value="pieces">Piezas</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Stock Mínimo</Label>
                    <Input type="number" value={editMinThreshold} onChange={(e) => setEditMinThreshold(e.target.value)} className="rounded-xl" />
                </div>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setEditOpen(false)} className="rounded-xl">Cancelar</Button>
                <Button onClick={saveEdit} className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl">Guardar Cambios</Button>
            </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogContent className="rounded-2xl sm:max-w-sm">
            <DialogHeader>
                <DialogTitle className="text-red-600 flex items-center gap-2 justify-center">
                    <AlertTriangle className="h-5 w-5" /> Eliminar Artículo
                </DialogTitle>
                <DialogDescription className="text-center">
                    ¿Estás seguro de eliminar <strong>{toDelete?.name}</strong>?
                </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-center gap-2">
                <Button variant="ghost" onClick={() => setConfirmOpen(false)} className="rounded-xl">Cancelar</Button>
                <Button onClick={doDelete} className="bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-md">Eliminar</Button>
            </DialogFooter>
            </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}