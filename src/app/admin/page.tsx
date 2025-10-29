
"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowRight, Check, X } from "lucide-react";
import { newClients, stockAlerts, servicesChartData } from "@/lib/placeholder-data";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function AdminDashboard() {
  const chartConfig = {
    services: {
      label: "Servicios",
      color: "hsl(var(--primary))",
    },
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Informe Mensual de Servicios</CardTitle>
            <CardDescription>
              Resumen de los servicios prestados en los últimos 6 meses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <ResponsiveContainer>
                <AreaChart data={servicesChartData}>
                  <defs>
                    <linearGradient id="colorServices" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                  <Tooltip
                    cursor={{
                      stroke: "hsl(var(--primary))",
                      strokeWidth: 2,
                      radius: 4,
                    }}
                    content={<ChartTooltipContent />}
                  />
                  <Area
                    dataKey="services"
                    type="monotone"
                    fill="url(#colorServices)"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Aprobaciones de Nuevos Clientes</CardTitle>
            <CardDescription>
              Revisa y aprueba los registros de nuevos clientes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {newClients.map((client) => (
              <div
                key={client.id}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={client.avatar} alt={client.name} data-ai-hint="person portrait" />
                    <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{client.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {client.email}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" className="h-8 w-8">
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
           <CardFooter>
            <Button variant="outline" className="w-full" asChild>
                <Link href="/admin/users">
                Gestionar todos los usuarios <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Alertas de Stock Crítico</CardTitle>
            <CardDescription>
              Artículos que han caído por debajo del umbral de stock.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stockAlerts.map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    En stock: {item.stock}
                  </p>
                </div>
                <Badge variant="destructive">Stock Bajo</Badge>
              </div>
            ))}
          </CardContent>
          <CardFooter>
             <Button variant="outline" className="w-full" asChild>
                <Link href="/staff/inventory">
                Gestionar Inventario <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
