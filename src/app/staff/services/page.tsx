
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
import { Badge } from "@/components/ui/badge";
import { services } from "@/lib/placeholder-data";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ServicesPage() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
            <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                <CardTitle className="font-headline">Gestión de Servicios</CardTitle>
                <CardDescription>
                    Ver, cobrar y gestionar el estado de pago de los servicios.
                </CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Servicio</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Estado de Pago</TableHead>
                    <TableHead>
                        <span className="sr-only">Acciones</span>
                    </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {services.map((service) => (
                    <TableRow key={service.id}>
                        <TableCell className="font-medium">{service.name}</TableCell>
                        <TableCell>${service.price.toFixed(2)}</TableCell>
                        <TableCell>
                        <Badge variant={service.paymentStatus === 'Pagado' ? 'default' : 'destructive'}>
                            {service.paymentStatus}
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
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuItem>Marcar como Pagado</DropdownMenuItem>
                            <DropdownMenuItem>Marcar como Pendiente</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>Cobrar</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </CardContent>
            </Card>
        </div>
        <div>
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Añadir Nuevo Servicio</CardTitle>
                    <CardDescription>
                        Crea un nuevo servicio para ofrecer a los clientes.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="service-name">Nombre del Servicio</Label>
                            <Input id="service-name" placeholder="Ej: Lavado Premium" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="service-price">Precio</Label>
                            <Input id="service-price" type="number" placeholder="Ej: 25.00" />
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
  );
}
