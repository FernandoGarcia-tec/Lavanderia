"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, ClipboardList, HandCoins, LogOut, Banknote } from "lucide-react"; // Agregué Banknote

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
import { Input } from "@/components/ui/input"; // Importado
import { Label } from "@/components/ui/label"; // Importado
import { useAuth, useFirestore } from "@/firebase/provider"; // useFirestore agregado
import { addDoc, collection, serverTimestamp } from "firebase/firestore"; // Firestore imports
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { signOut } from "firebase/auth";
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
import { useState } from "react";

const navItems = [
  { href: "/staff", icon: <ClipboardList />, label: "Panel de Tareas" },
  { href: "/staff/inventory", icon: <Archive />, label: "Inventario" },
  { href: "/staff/services", icon: <HandCoins />, label: "Registrar Cliente" },
];

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const auth = useAuth();
  const firestore = useFirestore(); // Instancia de Firestore
  const userLabel = auth?.currentUser?.displayName || auth?.currentUser?.email || "Usuario";
  const userInitial = (userLabel || "U").charAt(0).toUpperCase();
  
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [closingAmount, setClosingAmount] = useState("");
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Función para manejar el cierre de caja y sesión
  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      // 1. Guardar el registro de cierre de caja si se ingresó un monto
      if (closingAmount && !isNaN(parseFloat(closingAmount))) {
        await addDoc(collection(firestore, 'cash_registers'), {
          type: 'closing', // Tipo cierre
          amount: parseFloat(closingAmount),
          userId: auth?.currentUser?.uid || null,
          userEmail: auth?.currentUser?.email || null,
          userName: auth?.currentUser?.displayName || 'Personal',
          createdAt: serverTimestamp(),
        });
      }

      // 2. Cerrar sesión
      if (auth) await signOut(auth);
      
      // 3. Redirigir (Forzar recarga para limpiar estados)
      window.location.href = "/";
    } catch (error) {
      console.error("Error al cerrar turno:", error);
      // En caso de error, intentar cerrar sesión de todos modos
      if (auth) await signOut(auth);
      window.location.href = "/";
    } finally {
      setIsSigningOut(false);
      setConfirmOpen(false);
    }
  };

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
                    <Link href={item.href} className="flex items-center gap-3">
                      <span className={`${isActive ? 'text-cyan-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
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
              <AvatarFallback className="bg-cyan-100 text-cyan-700 font-bold">{userInitial}</AvatarFallback>
            </Avatar>
            <div className="text-xs text-slate-500 overflow-hidden group-data-[collapsible=icon]:hidden">
              <p className="font-medium text-slate-800 truncate max-w-[120px]" title={userLabel}>{userLabel}</p>
              <p className="text-[10px] text-slate-400">Personal</p>
            </div>
          </div>
          
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100 rounded-xl group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
                onClick={() => {
                    setClosingAmount(""); // Limpiar input al abrir
                    setConfirmOpen(true);
                }}
              >
                <LogOut className="h-4 w-4" />
                <span className="group-data-[collapsible=icon]:hidden">Cerrar Turno</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl sm:max-w-md">
              <DialogHeader>
                <div className="mx-auto bg-slate-100 p-3 rounded-full w-fit mb-2">
                    <Banknote className="h-6 w-6 text-slate-600" />
                </div>
                <DialogTitle className="text-center text-xl text-slate-900">Cierre de Caja y Salida</DialogTitle>
                <DialogDescription className="text-center text-slate-500">
                  Ingresa el monto final en efectivo antes de cerrar tu sesión.
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4 px-2">
                <Label htmlFor="closing-amount" className="text-slate-600 mb-2 block">Monto en Caja (Efectivo)</Label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">$</span>
                    <Input 
                        id="closing-amount"
                        type="number" 
                        placeholder="0.00" 
                        className="pl-8 h-12 text-lg rounded-xl border-slate-300 focus-visible:ring-cyan-500"
                        value={closingAmount}
                        onChange={(e) => setClosingAmount(e.target.value)}
                        autoFocus
                    />
                </div>
                {!closingAmount && (
                    <p className="text-xs text-amber-600 mt-2 flex items-center justify-center bg-amber-50 p-2 rounded-lg border border-amber-100">
                        ⚠️ Si dejas esto vacío, se guardará como $0.00
                    </p>
                )}
              </div>

              <DialogFooter className="sm:justify-center gap-2 mt-2">
                <Button variant="ghost" onClick={() => setConfirmOpen(false)} className="rounded-xl px-6" disabled={isSigningOut}>
                    Cancelar
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-6 shadow-md shadow-red-200"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                >
                  {isSigningOut ? 'Cerrando...' : 'Cerrar Turno y Salir'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="relative bg-slate-50 overflow-hidden">
        {/* FONDO GLOBAL PARA TODAS LAS PÁGINAS DEL PERSONAL */}
        <div className="absolute top-0 left-0 w-full h-[40vh] bg-gradient-to-br from-cyan-500 via-sky-500 to-blue-600 rounded-b-[50px] shadow-lg z-0 pointer-events-none">
            <div className="absolute top-10 left-10 w-24 h-24 bg-white/10 rounded-full blur-xl animate-pulse" />
            <div className="absolute top-20 right-20 w-32 h-32 bg-cyan-200/20 rounded-full blur-2xl" />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        </div>

        <div className="relative z-10 flex flex-col h-full">
            <DashboardHeader title="Portal del Personal" />
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