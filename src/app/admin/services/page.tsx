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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription, 
    DialogFooter, 
    DialogClose 
} from "@/components/ui/dialog";
import { useFirestore } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { PlusCircle, Edit2, Trash2, Search, Wrench, AlertTriangle, XCircle, Tag, DollarSign, Shirt, Package } from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { writeAudit } from "@/lib/audit";
import { useAuth } from "@/firebase/provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export default function ManageServicesPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const auth = useAuth();

    const [servicesList, setServicesList] = useState<Array<any>>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // New service form
    const [newName, setNewName] = useState('');
    const [newPrice, setNewPrice] = useState('');
    const [newUnit, setNewUnit] = useState<string>('kg');
    const [newDescription, setNewDescription] = useState<string>('');

    // Edit dialog
    const [editOpen, setEditOpen] = useState(false);
    const [editing, setEditing] = useState<any | null>(null);
    const [editName, setEditName] = useState('');
    const [editPrice, setEditPrice] = useState('');
    const [editUnit, setEditUnit] = useState<string>('kg');
    const [editDescription, setEditDescription] = useState<string>('');

    // Delete confirm
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [selectedToDelete, setSelectedToDelete] = useState<any | null>(null);

    useEffect(() => {
        if (!firestore) return;
        setLoading(true);
        const col = collection(firestore, 'services');
        const unsub = onSnapshot(col, (snap) => {
            const items: any[] = [];
            snap.forEach(d => items.push({ id: d.id, ...d.data() }));
            setServicesList(items);
            setLoading(false);
        });
        return () => unsub();
    }, [firestore]);

    const filteredServices = useMemo(() => {
        if (!searchQuery) return servicesList;
        const q = searchQuery.toLowerCase();
        return servicesList.filter(svc => 
            svc.name.toLowerCase().includes(q) || 
            (svc.description && svc.description.toLowerCase().includes(q))
        );
    }, [servicesList, searchQuery]);

    async function addService(e?: React.FormEvent) {
        if (e) e.preventDefault();
        if (!newName.trim() || !newPrice) {
            toast({ title: 'Faltan datos', description: 'Nombre y precio son requeridos.', variant: "destructive" });
            return;
        }
        const priceNum = parseFloat(newPrice.toString());
        if (isNaN(priceNum)) {
            toast({ title: 'Precio inválido', description: 'Introduce un número válido.', variant: "destructive" });
            return;
        }
        try {
            const docRef = await addDoc(collection(firestore, 'services'), {
                name: newName.trim(),
                price: priceNum,
                unit: newUnit || 'kg',
                description: newDescription || '',
                createdAt: serverTimestamp(),
            });
            
            writeAudit(firestore, {
                actorUid: auth?.currentUser?.uid || null,
                actorEmail: auth?.currentUser?.email || null,
                action: 'create-service',
                resource: 'services',
                resourceId: docRef.id,
                after: { name: newName, price: priceNum, unit: newUnit }
            });

            toast({ title: 'Servicio añadido', description: `Se ha creado "${newName}".` });
            setNewName('');
            setNewPrice('');
            setNewUnit('kg');
            setNewDescription('');
        } catch (err: any) {
            console.error('Add service error', err);
            toast({ title: 'Error', description: err?.message || 'No se pudo crear el servicio.', variant: 'destructive' });
        }
    }

    function openEdit(svc: any) {
        setEditing(svc);
        setEditName(svc.name || '');
        setEditPrice(String(svc.price ?? ''));
        setEditUnit(svc.unit || 'kg');
        setEditDescription(svc.description || '');
        setEditOpen(true);
    }

    async function saveEdit() {
        if (!editing) return;
        if (!editName.trim() || !editPrice) {
            toast({ title: 'Faltan datos', description: 'Nombre y precio son requeridos.', variant: "destructive" });
            return;
        }
        const priceNum = parseFloat(editPrice.toString());
        if (isNaN(priceNum)) {
            toast({ title: 'Precio inválido', description: 'Introduce un número válido.', variant: "destructive" });
            return;
        }
        try {
            await updateDoc(doc(firestore, 'services', editing.id), {
                name: editName.trim(),
                price: priceNum,
                unit: editUnit || 'kg',
                description: editDescription || '',
                updatedAt: serverTimestamp(),
            });

            writeAudit(firestore, {
                actorUid: auth?.currentUser?.uid || null,
                actorEmail: auth?.currentUser?.email || null,
                action: 'update-service',
                resource: 'services',
                resourceId: editing.id,
                before: editing,
                after: { name: editName, price: priceNum, unit: editUnit }
            });

            toast({ title: 'Servicio actualizado' });
            setEditOpen(false);
            setEditing(null);
        } catch (err: any) {
            console.error('Update service error', err);
            toast({ title: 'Error', description: err?.message || 'No se pudo actualizar el servicio.', variant: 'destructive' });
        }
    }

    async function confirmDelete(svc: any) {
        setSelectedToDelete(svc);
        setConfirmOpen(true);
    }

    async function doDelete() {
        if (!selectedToDelete) return;
        try {
            await deleteDoc(doc(firestore, 'services', selectedToDelete.id));
            
            writeAudit(firestore, {
                actorUid: auth?.currentUser?.uid || null,
                actorEmail: auth?.currentUser?.email || null,
                action: 'delete-service',
                resource: 'services',
                resourceId: selectedToDelete.id,
                before: selectedToDelete
            });

            toast({ title: 'Servicio eliminado' });
            setSelectedToDelete(null);
            setConfirmOpen(false);
        } catch (err: any) {
            console.error('Delete service error', err);
            toast({ title: 'Error', description: err?.message || 'No se pudo eliminar el servicio.', variant: 'destructive' });
        }
    }

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
                        <Wrench className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight drop-shadow-sm">Gestión de Servicios</h1>
                        <p className="text-cyan-50 opacity-90">Configura precios y tipos de servicios</p>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    
                    {/* Columna Izquierda: Tabla de Servicios */}
                    <div className="lg:col-span-2">
                        <Card className="shadow-xl border-0 rounded-3xl overflow-hidden backdrop-blur-sm bg-white/95">
                            <CardHeader className="bg-white border-b border-slate-100 pb-4 pt-6 px-6">
                                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                    <div>
                                        <CardTitle className="font-headline text-xl text-slate-800">Catálogo de Servicios</CardTitle>
                                        <CardDescription className="text-slate-500">Servicios disponibles para los clientes.</CardDescription>
                                    </div>
                                    <div className="relative w-full sm:w-64 group">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-cyan-600 transition-colors" />
                                        <Input 
                                            placeholder="Buscar servicio..." 
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
                                            <TableHead className="pl-6 font-semibold text-slate-600">Servicio</TableHead>
                                            <TableHead className="font-semibold text-slate-600">Precio Unitario</TableHead>
                                            <TableHead className="font-semibold text-slate-600">Unidad</TableHead>
                                            <TableHead className="text-right pr-6 font-semibold text-slate-600">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow><TableCell colSpan={4} className="h-32 text-center text-slate-400">Cargando servicios...</TableCell></TableRow>
                                        ) : filteredServices.length === 0 ? (
                                            <TableRow><TableCell colSpan={4} className="h-32 text-center text-slate-400">No se encontraron servicios.</TableCell></TableRow>
                                        ) : (
                                            filteredServices.map((svc) => (
                                                <TableRow key={svc.id} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                                                    <TableCell className="pl-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-10 w-10 border border-slate-100 bg-slate-50">
                                                                <AvatarFallback className={cn("text-slate-500 bg-slate-100", 
                                                                    svc.name.toLowerCase().includes('lavado') && "text-blue-500 bg-blue-50",
                                                                    svc.name.toLowerCase().includes('plancha') && "text-orange-500 bg-orange-50",
                                                                )}>
                                                                    {svc.name.toLowerCase().includes('plancha') ? <Wrench className="h-5 w-5" /> : 
                                                                     svc.name.toLowerCase().includes('edredon') ? <Package className="h-5 w-5" /> :
                                                                     <Shirt className="h-5 w-5" />}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <span className="font-semibold text-slate-800 block">{svc.name}</span>
                                                                {svc.description && (
                                                                    <span className="text-xs text-slate-500 line-clamp-1">{svc.description}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center font-bold text-slate-700">
                                                            <DollarSign className="h-3.5 w-3.5 text-slate-400 mr-0.5" />
                                                            {Number(svc.price || 0).toFixed(2)}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200 shadow-none">
                                                            {svc.unit === 'kg' ? 'Por Kilo' : svc.unit === 'pieces' ? 'Por Pieza' : svc.unit}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg" onClick={() => openEdit(svc)}>
                                                                <Edit2 className="h-4 w-4" />
                                                            </Button>
                                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg" onClick={() => confirmDelete(svc)}>
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
                    </div>

                    {/* Columna Derecha: Formulario */}
                    <div>
                        <Card className="shadow-lg border-0 rounded-3xl overflow-hidden sticky top-6">
                            <CardHeader className="bg-white border-b border-slate-100">
                                <CardTitle className="font-headline text-lg text-slate-800">Nuevo Servicio</CardTitle>
                                <CardDescription>Añade una opción al catálogo.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 bg-slate-50/50">
                                <form className="space-y-4" onSubmit={addService}>
                                    <div className="space-y-2">
                                        <Label htmlFor="service-name-new" className="text-slate-600">Nombre del Servicio</Label>
                                        <Input id="service-name-new" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ej: Lavado de Edredón" className="rounded-xl border-slate-200 bg-white" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="service-description-new" className="text-slate-600">Descripción (Opcional)</Label>
                                        <Input id="service-description-new" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Detalles cortos..." className="rounded-xl border-slate-200 bg-white" />
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="service-price-new" className="text-slate-600">Precio</Label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                                                <Input id="service-price-new" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} type="number" placeholder="0.00" className="pl-7 rounded-xl border-slate-200 bg-white" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="service-unit-new" className="text-slate-600">Unidad</Label>
                                            <Select defaultValue={newUnit} onValueChange={(v) => setNewUnit(v)}>
                                                <SelectTrigger className="rounded-xl border-slate-200 bg-white"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="kg">Por Kilo</SelectItem>
                                                    <SelectItem value="pieces">Por Pieza</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    
                                    <Button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl shadow-md mt-2">
                                        <PlusCircle className="mr-2 h-4 w-4" /> Crear Servicio
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
                            <DialogTitle>Editar Servicio</DialogTitle>
                            <DialogDescription>Modifica los detalles del servicio seleccionado.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-2">
                            <div className="space-y-2">
                                <Label>Nombre</Label>
                                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label>Descripción</Label>
                                <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="rounded-xl" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Precio</Label>
                                    <Input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="rounded-xl" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Unidad</Label>
                                    <Select defaultValue={editUnit} onValueChange={(v) => setEditUnit(v)}>
                                        <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="kg">Por Kilo</SelectItem>
                                            <SelectItem value="pieces">Por Pieza</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
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
                                <AlertTriangle className="h-5 w-5" /> Eliminar Servicio
                            </DialogTitle>
                            <DialogDescription className="text-center">
                                ¿Estás seguro de eliminar <strong>{selectedToDelete?.name}</strong>?<br/>
                                Esta acción no se puede deshacer.
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