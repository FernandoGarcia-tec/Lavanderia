
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, History, LayoutDashboard } from "lucide-react";

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
  { href: "/client", icon: <LayoutDashboard />, label: "Panel de control" },
  { href: "/client/schedule", icon: <Calendar />, label: "Programar Servicio" },
  { href: "#", icon: <History />, label: "Historial de Pedidos" },
];

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

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
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <Separator className="my-2" />
          <Button variant="outline" asChild>
             <Link href="/">Salir de Cliente</Link>
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <DashboardHeader title="Portal del Cliente" />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
