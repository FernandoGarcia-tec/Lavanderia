
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AreaChart, BarChart, Bell, Building, Users, Wrench, Box } from "lucide-react";
import { useEffect, useState } from 'react';
import { useFirestore } from '@/firebase/provider';
import { collection, onSnapshot } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';

import { AppLogo } from "@/components/app-logo";
import { DashboardHeader } from "@/components/dashboard-header";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { href: "/admin", icon: <AreaChart />, label: "Panel de control" },
  { href: "/admin/users", icon: <Users />, label: "Gestión de usuarios" },
  { href: "/admin/services", icon: <Wrench />, label: "Gestionar Servicios" },
  { href: "/admin/inventory", icon: <Box />, label: "Gestionar Inventario" },
  { href: "/admin/report", icon: <BarChart />, label: "Reportes" },
  //{ href: "#", icon: <Building />, label: "Corporativo" },
  { href: "/admin/alert", icon: <Bell />, label: "Alertas" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const firestore = useFirestore();
  const [lowCount, setLowCount] = useState<number>(0);

  useEffect(() => {
    if (!firestore) return;
    const q = collection(firestore, 'inventory');
    const unsub = onSnapshot(q, (snap: any) => {
      const items: any[] = [];
      snap.forEach((d: any) => items.push({ id: d.id, ...d.data() }));
      const low = items.filter(it => {
        const qty = Number(it.quantity ?? it.stockActual ?? it.cantidad ?? it.stock ?? 0);
        const min = Number(it.minThreshold ?? it.stockCritico ?? it.stockMin ?? 0);
        return qty < min;
      });
      setLowCount(low.length);
    });
    return () => unsub();
  }, [firestore]);

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <AppLogo />
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={item.label}
                >
                  <Link href={item.href}>
                    {item.icon}
                    <span className="flex items-center gap-2">{item.label}{item.label === 'Alertas' ? <Badge variant="destructive">{lowCount}</Badge> : null}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <Separator className="my-2" />
          <Button variant="outline" asChild>
             <Link href="/">Salir de Administrador</Link>
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <DashboardHeader title="Administrador" />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
