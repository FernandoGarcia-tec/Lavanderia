
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
import { services, users } from "@/lib/placeholder-data";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  PlusCircle,
  Search,
  UserPlus,
  Calendar as CalendarIcon,
} from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ServicesPage() {
  return (
    <Tabs defaultValue="register-order">
      <TabsList className="mb-4">
        <TabsTrigger value="register-order">Registrar Nuevo Pedido</TabsTrigger>
        <TabsTrigger value="manage-services">Gestionar Tipos de Servicio</TabsTrigger>
      </TabsList>
      <TabsContent value="register-order">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">
              Registrar Nuevo Pedido Manual
            </CardTitle>
            <CardDescription>
              Crea un nuevo pedido de servicio para un cliente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-8 md:grid-cols-2">
              {/* Columna de Cliente y Servicio */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Información del Cliente</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-grow">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Buscar cliente existente..." className="pl-9" />
                    </div>
                    <Button variant="outline" size="icon">
                      <UserPlus className="h-4 w-4" />
                      <span className="sr-only">Registrar Nuevo Cliente</span>
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service-type">Tipo de Servicio</Label>
                  <Select>
                    <SelectTrigger id="service-type">
                      <SelectValue placeholder="Selecciona un tipo de servicio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wash-fold">Lavado y Plegado</SelectItem>
                      <SelectItem value="dry-clean">Lavado en Seco</SelectItem>
                      <SelectItem value="bedding">Ropa de Cama y Edredones</SelectItem>
                      <SelectItem value="specialty">Artículos Especiales</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item-description">
                    Descripción de Prendas / Ítems
                  </Label>
                  <Textarea
                    id="item-description"
                    placeholder="Ej: 5 camisas, 2 pantalones, 1 vestido"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="special-instructions">
                    Instrucciones Especiales
                  </Label>
                  <Textarea
                    id="special-instructions"
                    placeholder="Ej: Usar detergente hipoalergénico"
                  />
                </div>
              </div>

              {/* Columna de Fechas y Costo */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Fecha y Hora de Recepción</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !Date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        <span>{format(new Date(), "PPP")}</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Fecha y Hora Estimada de Entrega</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !Date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        <span>Seleccionar fecha</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estimated-cost">Estimación de Costo</Label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-muted-foreground">$</span>
                    <Input id="estimated-cost" type="number" placeholder="0.00" className="pl-7" />
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                    Crear Pedido
                  </Button>
                  <Button variant="outline" type="button" className="w-full">
                    Cancelar
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="manage-services">
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
      </TabsContent>
    </Tabs>
  );
}
