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
import { Badge } from "@/components/ui/badge";
import { staffTasks } from "@/lib/placeholder-data";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, ListFilter, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useEffect, useState } from 'react';
import { useFirestore, useAuth } from '@/firebase/provider';
import { collection, addDoc, query, where, getDocs, Timestamp, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function StaffDashboard() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [openingAmount, setOpeningAmount] = useState<string>('0.00');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // On mount, check if there's already an opening cash for today
    async function checkOpening() {
      try {
        if (!firestore) {
          setChecking(false);
          return;
        }
        const start = new Date();
        start.setHours(0,0,0,0);
        const end = new Date();
        end.setHours(23,59,59,999);
        const q = query(collection(firestore, 'cash_registers'), where('type', '==', 'opening'), where('createdAt', '>=', Timestamp.fromDate(start)), where('createdAt', '<=', Timestamp.fromDate(end)));
        const snap = await getDocs(q);
        if (snap.empty) {
          setShowModal(true);
        }
      } catch (err) {
        console.error('checkOpening error', err);
      } finally {
        setChecking(false);
      }
    }
    checkOpening();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firestore]);

  async function saveOpening(skip = false) {
    try {
      if (!firestore) return;
      if (!skip) {
        const amount = parseFloat(openingAmount) || 0;
        await addDoc(collection(firestore, 'cash_registers'), {
          type: 'opening',
          amount,
          userId: auth?.currentUser?.uid || null,
          createdAt: serverTimestamp(),
        });
        toast({ title: 'Registrado', description: `Monto inicial guardado: ${amount}` });
      } else {
        toast({ title: 'Omitido', description: 'Se omitió el registro de apertura.' });
      }
      setShowModal(false);
    } catch (err: any) {
      console.error('saveOpening error', err);
      toast({ title: 'Error', description: err?.message || 'No se pudo guardar el monto', variant: 'destructive' });
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
            <Users className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight drop-shadow-sm">Panel del Personal</h1>
            <p className="text-cyan-50 opacity-90">Tareas y operaciones del día</p>
          </div>
        </div>

        {/* Contenido */}
        <>
      <Dialog open={showModal} onOpenChange={(open) => setShowModal(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registro de apertura de caja</DialogTitle>
            <DialogDescription>Introduce el monto de dinero disponible en caja al iniciar tu jornada.</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <Input type="number" step="0.01" value={openingAmount} onChange={(e) => setOpeningAmount((e.target as HTMLInputElement).value)} />
          </div>
          <DialogFooter className="mt-4">
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => saveOpening(true)}>Omitir</Button>
              <Button onClick={() => saveOpening(false)}>Guardar monto</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-headline">Tareas Pendientes</CardTitle>
            <CardDescription>
              Gestiona y actualiza el estado de los pedidos de los clientes.
            </CardDescription>
          </div>
          <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                      <ListFilter className="h-4 w-4" />
                      Filtrar
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filtrar por Estado</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem checked>Pendiente</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked>En Progreso</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem>Completado</DropdownMenuCheckboxItem>
              </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Servicio</TableHead>
                <TableHead>Fecha de Entrega</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffTasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.orderId}</TableCell>
                  <TableCell>{task.client}</TableCell>
                  <TableCell>{task.service}</TableCell>
                  <TableCell>{task.dueDate}</TableCell>
                  <TableCell>
                    <Badge variant={task.status === 'Pendiente' ? 'destructive' : task.status === 'En Progreso' ? 'secondary' : 'default'}>
                      {task.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actualizar Estado</DropdownMenuLabel>
                        <DropdownMenuItem>Marcar en Progreso</DropdownMenuItem>
                        <DropdownMenuItem>Marcar Completado</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Ver Detalles</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
        </>
      </div>
    </div>
  );
}
