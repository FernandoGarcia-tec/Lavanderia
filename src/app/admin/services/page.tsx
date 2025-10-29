
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
import { services } from "@/lib/placeholder-data";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  PlusCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


export default function ManageServicesPage() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
        <Card>
            <CardHeader>
            <CardTitle className="font-headline">
                Gestionar Tipos de Servicio
            </CardTitle>
            <CardDescription>
                Añadir, editar o eliminar los servicios ofrecidos a los
                clientes.
            </CardDescription>
            </CardHeader>
            <CardContent>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Servicio</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>
                    <span className="sr-only">Acciones</span>
                    </TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {services.map((service) => (
                    <TableRow key={service.id}>
                    <TableCell className="font-medium">
                        {service.name}
                    </TableCell>
                    <TableCell>${service.price.toFixed(2)}</TableCell>
                    <TableCell>
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                            aria-haspopup="true"
                            size="icon"
                            variant="ghost"
                            >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuItem>Editar</DropdownMenuItem>
                            <DropdownMenuItem>Eliminar</DropdownMenuItem>
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
            <CardTitle className="font-headline">
                Añadir Nuevo Tipo de Servicio
            </CardTitle>
            <CardDescription>
                Define un nuevo servicio para ofrecer a los clientes.
            </CardDescription>
            </CardHeader>
            <CardContent>
            <form className="space-y-4">
                <div className="space-y-2">
                <Label htmlFor="service-name-new">Nombre del Servicio</Label>
                <Input
                    id="service-name-new"
                    placeholder="Ej: Lavado Premium"
                />
                </div>
                <div className="space-y-2">
                <Label htmlFor="service-price-new">Precio</Label>
                <Input
                    id="service-price-new"
                    type="number"
                    placeholder="Ej: 25.00"
                />
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
