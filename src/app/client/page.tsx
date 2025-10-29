import Link from "next/link";
import { ArrowRight, Calendar, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { appointments, orders } from "@/lib/placeholder-data";

export default function ClientDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="font-headline">Próximas Citas</CardTitle>
            <CardDescription>
              Consulta el estado de tus servicios programados.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {appointments.length > 0 ? (
              <div className="space-y-4">
                {appointments.map((apt) => (
                  <div key={apt.id} className="flex items-start gap-4 rounded-lg border p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{apt.service}</p>
                      <p className="text-sm text-muted-foreground">
                        {apt.date} a las {apt.time}
                      </p>
                    </div>
                    <Badge variant="secondary" className="ml-auto mt-1">{apt.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center">
                 <p className="text-muted-foreground">No hay próximas citas.</p>
              </div>
            )}
          </CardContent>
          <CardFooter>
             <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" asChild>
                <Link href="/client/schedule">
                Programar un Nuevo Servicio <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Acciones Rápidas</CardTitle>
            <CardDescription>
              Acceso con un clic a tus tareas más comunes.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
             <Button variant="outline" size="lg" className="h-24 flex-col gap-1" asChild>
                <Link href="/client/schedule">
                    <Calendar className="h-6 w-6" />
                    Programar
                </Link>
             </Button>
             <Button variant="outline" size="lg" className="h-24 flex-col gap-1" disabled>
                <Clock className="h-6 w-6" />
                Ver Historial
             </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Historial de Pedidos Recientes</CardTitle>
          <CardDescription>Un resumen de tus pedidos más recientes.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID de Pedido</TableHead>
                <TableHead>Servicio</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.id}</TableCell>
                  <TableCell>{order.service}</TableCell>
                  <TableCell>{order.date}</TableCell>
                  <TableCell>
                    <Badge variant={order.status === 'Listo para Recoger' ? 'default' : 'outline'}
                        className={order.status === 'Listo para Recoger' ? 'bg-green-600 text-white' : ''}
                    >
                      {order.status === 'Listo para Recoger' && <CheckCircle className="mr-1 h-3 w-3" />}
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">${order.total.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
