
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog";
import { useFirestore } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { PlusCircle, Check, X, Trash2, Edit2 } from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

export default function ManageServicesPage() {
    const firestore = useFirestore();
    const { toast } = useToast();

    const [servicesList, setServicesList] = useState<Array<any>>([]);

    // New service form
    const [newName, setNewName] = useState('');
    const [newPrice, setNewPrice] = useState('');
    const [newUnit, setNewUnit] = useState<string>('kg');

    // Edit dialog
    const [editOpen, setEditOpen] = useState(false);
    const [editing, setEditing] = useState<any | null>(null);
    const [editName, setEditName] = useState('');
    const [editPrice, setEditPrice] = useState('');
    const [editUnit, setEditUnit] = useState<string>('kg');

    // Delete confirm
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [selectedToDelete, setSelectedToDelete] = useState<any | null>(null);

    useEffect(() => {
        const col = collection(firestore, 'services');
        const unsub = onSnapshot(col, (snap) => {
            const items: any[] = [];
            snap.forEach(d => items.push({ id: d.id, ...d.data() }));
            setServicesList(items);
        });
        return () => unsub();
    }, [firestore]);

    async function addService(e?: React.FormEvent) {
        if (e) e.preventDefault();
        if (!newName.trim() || !newPrice) {
            toast({ title: 'Faltan datos', description: 'Nombre y precio son requeridos.' });
            return;
        }
        const priceNum = parseFloat(newPrice.toString());
        if (isNaN(priceNum)) {
            toast({ title: 'Precio inválido', description: 'Introduce un número válido.' });
            return;
        }
        try {
            const docRef = await addDoc(collection(firestore, 'services'), {
                name: newName.trim(),
                price: priceNum,
                unit: newUnit || 'kg',
                createdAt: serverTimestamp(),
            });
            toast({ title: 'Servicio añadido', description: `ID: ${docRef.id}` });
            setNewName('');
            setNewPrice('');
            setNewUnit('kg');
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
        setEditOpen(true);
    }

    async function saveEdit() {
        if (!editing) return;
        if (!editName.trim() || !editPrice) {
            toast({ title: 'Faltan datos', description: 'Nombre y precio son requeridos.' });
            return;
        }
        const priceNum = parseFloat(editPrice.toString());
        if (isNaN(priceNum)) {
            toast({ title: 'Precio inválido', description: 'Introduce un número válido.' });
            return;
        }
        try {
            await updateDoc(doc(firestore, 'services', editing.id), {
                name: editName.trim(),
                price: priceNum,
                unit: editUnit || 'kg',
                updatedAt: serverTimestamp(),
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
                        {/* Icono: engrane */}
                        <svg className="h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.89 3.31.877 2.42 2.42a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.89 1.543-.877 3.31-2.42 2.42a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.89-3.31-.877-2.42-2.42a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35.502-.122.92-.44 1.066-2.573-.89-1.543.877-3.31 2.42-2.42.838.483 1.897.183 2.573-1.066z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight drop-shadow-sm">Gestión de Servicios</h1>
                        <p className="text-cyan-50 opacity-90">Tipos, precios y unidades</p>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Gestionar Tipos de Servicio</CardTitle>
                        <CardDescription>Añadir, editar o eliminar los servicios ofrecidos a los clientes.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Servicio</TableHead>
                                    <TableHead>Precio</TableHead>
                                    <TableHead>Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {servicesList.map((svc) => (
                                    <TableRow key={svc.id}>
                                        <TableCell className="font-medium">{svc.name}</TableCell>
                                        <TableCell>{`$${Number(svc.price || 0).toFixed(2)} ${svc.unit === 'kg' ? '/ kg' : svc.unit === 'pieces' ? '/ piezas' : ''}`}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Button size="icon" variant="ghost" onClick={() => openEdit(svc)} aria-label="Editar">
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" onClick={() => confirmDelete(svc)} aria-label="Eliminar">
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
                                    <DialogTitle>Editar Servicio</DialogTitle>
                                    <DialogDescription>Modifica los datos del servicio seleccionado.</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-2">
                                    <div className="grid grid-cols-1 gap-1">
                                        <Label htmlFor="edit-name">Nombre</Label>
                                        <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
                                    </div>
                                    <div className="grid grid-cols-1 gap-1">
                                        <Label htmlFor="edit-unit">Tipo</Label>
                                        <Select defaultValue={editUnit} onValueChange={(v) => setEditUnit(v)}>
                                            <SelectTrigger aria-label="Unidad">
                                                <SelectValue>{editUnit === 'kg' ? 'Peso (KG)' : editUnit === 'pieces' ? 'Piezas' : editUnit}</SelectValue>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="kg">Peso (KG)</SelectItem>
                                                <SelectItem value="pieces">Piezas</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-1 gap-1">
                                        <Label htmlFor="edit-price">Precio</Label>
                                        <Input id="edit-price" type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
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

                        {/* Confirm delete dialog */}
                        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Confirmar eliminación</DialogTitle>
                                    <DialogDescription>¿Estás seguro de eliminar {selectedToDelete?.name ?? 'este servicio'}? Esta acción no se puede deshacer.</DialogDescription>
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
                        <CardTitle className="font-headline">Añadir Nuevo Tipo de Servicio</CardTitle>
                        <CardDescription>Define un nuevo servicio para ofrecer a los clientes.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form className="space-y-4" onSubmit={addService}>
                            <div className="space-y-2">
                                <Label htmlFor="service-name-new">Nombre del Servicio</Label>
                                <Input id="service-name-new" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ej: Lavado Premium" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="service-unit-new">Tipo</Label>
                                <Select defaultValue={newUnit} onValueChange={(v) => setNewUnit(v)}>
                                    <SelectTrigger aria-label="Unidad">
                                        <SelectValue>{newUnit === 'kg' ? 'Peso (KG)' : newUnit === 'pieces' ? 'Piezas' : newUnit}</SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="kg">Peso (KG)</SelectItem>
                                        <SelectItem value="pieces">Piezas</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="service-price-new">Precio</Label>
                                <Input id="service-price-new" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} type="number" placeholder="Ej: 25.00" />
                            </div>
                            <Button type="submit" className="w-full">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Añadir Servicio
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
                </div>
            </div>
        </div>
    );
}
