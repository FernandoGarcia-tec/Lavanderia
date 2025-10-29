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

export default function StaffDashboard() {
  return (
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
  );
}
