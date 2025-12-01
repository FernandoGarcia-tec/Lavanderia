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
import { inventoryItems } from "@/lib/placeholder-data";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function InventoryPage() {
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
            {/* Icono: caja */}
            <svg className="h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-8.25 4.5-8.25-4.5M12 21V12M3.75 7.5L12 3l8.25 4.5" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight drop-shadow-sm">Inventario (Personal)</h1>
            <p className="text-cyan-50 opacity-90">Supervisa, actualiza y gestiona los niveles de stock</p>
          </div>
        </div>

        {/* Tarjeta principal */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-headline">Gestión de Inventario</CardTitle>
              <CardDescription>
                Supervisa, actualiza y gestiona los niveles de stock.
              </CardDescription>
            </div>
            <Button size="sm" className="gap-1">
              <PlusCircle className="h-4 w-4" />
              Añadir Artículo
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre del Artículo</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Nivel de Stock</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.stock}</TableCell>
                    <TableCell>
                      <Badge variant={item.status === 'Stock Bajo' ? 'destructive' : 'default'}>
                        {item.status}
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
                          <DropdownMenuItem>Actualizar Stock</DropdownMenuItem>
                          <DropdownMenuItem>Editar Artículo</DropdownMenuItem>
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
    </div>
  );
}
