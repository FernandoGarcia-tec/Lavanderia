
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, ClipboardList, HandCoins } from "lucide-react";

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
import { useAuth } from "@/firebase/provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { signOut } from "firebase/auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";

const navItems = [
  { href: "/staff", icon: <ClipboardList />, label: "Panel de Tareas" },
  { href: "/staff/inventory", icon: <Archive />, label: "Inventario" },
  { href: "/staff/services", icon: <HandCoins />, label: "Registrar Pedido" },
];

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const auth = useAuth();
  const userLabel = auth?.currentUser?.displayName || auth?.currentUser?.email || "Usuario";
  const userInitial = (userLabel || "U").charAt(0).toUpperCase();
  const [confirmOpen, setConfirmOpen] = useState(false);

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
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={auth?.currentUser?.photoURL || undefined} alt={userLabel} />
              <AvatarFallback>{userInitial}</AvatarFallback>
            </Avatar>
            <div className="text-xs text-slate-500">
              Sesión iniciada como: <span className="font-medium text-slate-700">{userLabel}</span>
            </div>
          </div>
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Salir de Personal</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirmar salida</DialogTitle>
                <DialogDescription>
                  ¿Deseas cerrar sesión y salir del portal del personal?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
                <Button
                  className="bg-red-500 hover:bg-red-600"
                  onClick={async () => {
                    try {
                      if (auth) await signOut(auth);
                    } finally {
                      setConfirmOpen(false);
                      // Navegar a inicio
                      window.location.href = "/";
                    }
                  }}
                >
                  Cerrar sesión
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <DashboardHeader title="Portal del Personal" />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
