"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AreaChart, BarChart, Bell, ClipboardList, Users, Wrench, Box, Wallet, LogOut } from "lucide-react";
import { useEffect, useState } from 'react';
import { useFirestore, useAuth } from '@/firebase/provider';
import { collection, onSnapshot } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { signOut } from "firebase/auth";

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
  SidebarRail,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter, 
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";

const navItems = [
  { href: "/admin", icon: <AreaChart />, label: "Panel de control" },
  { href: "/admin/users", icon: <Users />, label: "Gestión de usuarios" },
  { href: "/admin/services", icon: <Wrench />, label: "Gestionar Servicios" },
  { href: "/admin/inventory", icon: <Box />, label: "Gestionar Inventario" },
  { href: "/admin/pedidos", icon: <ClipboardList />, label: "Gestión de Pedidos" },
  { href: "/admin/caja", icon: <Wallet />, label: "Caja" },
  { href: "/admin/report", icon: <BarChart />, label: "Reportes" },
  { href: "/admin/alert", icon: <Bell />, label: "Alertas" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const firestore = useFirestore();
  const auth = useAuth();
  const [lowCount, setLowCount] = useState<number>(0);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // User info logic
  const userLabel = auth?.currentUser?.displayName || auth?.currentUser?.email || "Administrador";
  const userInitial = (userLabel || "A").charAt(0).toUpperCase();

  // Monitor stock alerts for badge
  useEffect(() => {
    if (!firestore) return;
    const q = collection(firestore, 'inventory');
    const unsub = onSnapshot(q, (snap: any) => {
      const items: any[] = [];
      snap.forEach((d: any) => items.push({ id: d.id, ...d.data() }));
      const low = items.filter(it => {
        const qty = Number(it.quantity ?? it.stockActual ?? it.cantidad ?? it.stock ?? 0);
        const min = Number(it.minThreshold ?? it.stockCritico ?? it.stockMin ?? 0);
        return qty <= min;
      });
      setLowCount(low.length);
    });
    return () => unsub();
  }, [firestore]);

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-slate-200 bg-white shadow-sm">
        <SidebarHeader className="h-16 flex items-center justify-center border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 font-bold text-cyan-900 transition-all group-data-[collapsible=icon]:scale-0">
             <AppLogo />
          </div>
        </SidebarHeader>
        
        <SidebarContent className="p-3">
          <SidebarMenu>
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={item.label}
                    className={`
                      transition-all duration-200 rounded-xl px-4 py-3 h-auto mb-1
                      ${isActive 
                        ? 'bg-cyan-50 text-cyan-700 shadow-sm border border-cyan-100 font-medium' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }
                    `}
                  >
                    <Link href={item.href} className="flex items-center gap-3 w-full">
                      <span className={`${isActive ? 'text-cyan-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                        {item.icon}
                      </span>
                      <span className="flex-1">{item.label}</span>
                      {item.label === 'Alertas' && lowCount > 0 && (
                        <Badge variant="destructive" className="ml-auto h-5 px-1.5 min-w-[20px] justify-center rounded-full text-[10px] animate-pulse">
                          {lowCount}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="p-3 bg-slate-50/50 border-t border-slate-100">
          <div className="flex items-center gap-3 px-2 py-3 mb-2 rounded-xl bg-white border border-slate-100 shadow-sm group-data-[collapsible=icon]:justify-center transition-all">
            <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
              <AvatarImage src={auth?.currentUser?.photoURL || undefined} alt={userLabel} />
              <AvatarFallback className="bg-purple-100 text-purple-700 font-bold">{userInitial}</AvatarFallback>
            </Avatar>
            <div className="text-xs text-slate-500 overflow-hidden group-data-[collapsible=icon]:hidden">
              <p className="font-medium text-slate-800 truncate max-w-[120px]" title={userLabel}>{userLabel}</p>
              <p className="text-[10px] text-purple-600 font-medium">Administrador</p>
            </div>
          </div>

          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100 rounded-xl group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
              >
                <LogOut className="h-4 w-4" />
                <span className="group-data-[collapsible=icon]:hidden">Salir</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl sm:max-w-md">
              <DialogHeader>
                <div className="mx-auto bg-red-100 p-3 rounded-full w-fit mb-2">
                    <LogOut className="h-6 w-6 text-red-600" />
                </div>
                <DialogTitle className="text-center text-xl text-slate-900">Cerrar Sesión</DialogTitle>
                <DialogDescription className="text-center text-slate-500">
                  ¿Estás seguro de que deseas salir del panel de administración?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="sm:justify-center gap-2 mt-4">
                <Button variant="ghost" onClick={() => setConfirmOpen(false)} className="rounded-xl px-6">Cancelar</Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-6 shadow-md shadow-red-200"
                  onClick={async () => {
                    try {
                      if (auth) await signOut(auth);
                    } finally {
                      setConfirmOpen(false);
                      window.location.href = "/";
                    }
                  }}
                >
                  Confirmar Salida
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="relative bg-slate-50 overflow-hidden">
        {/* FONDO GLOBAL ACUÁTICO */}
        <div className="absolute top-0 left-0 w-full h-[40vh] bg-gradient-to-br from-cyan-500 via-sky-500 to-blue-600 rounded-b-[50px] shadow-lg z-0 pointer-events-none">
            <div className="absolute top-10 left-10 w-24 h-24 bg-white/10 rounded-full blur-xl animate-pulse" />
            <div className="absolute top-20 right-20 w-32 h-32 bg-cyan-200/20 rounded-full blur-2xl" />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        </div>

        <div className="relative z-10 flex flex-col h-full">
            <DashboardHeader title="Panel de Administración" />
            <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {children}
                </div>
            </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}