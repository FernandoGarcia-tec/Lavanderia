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
import { MoreHorizontal, ListFilter } from "lucide-react";
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
  );
}
