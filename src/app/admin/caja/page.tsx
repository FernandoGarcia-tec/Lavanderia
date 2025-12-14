"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useFirestore } from "@/firebase/provider";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { 
  Filter, 
  Wallet, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  CalendarDays,
  User,
  DollarSign,
  Briefcase,
  Search,
  X
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type CashRecord = {
  id: string;
  type: "opening" | "closing" | string;
  amount?: number;
  userId?: string | null;
  userName?: string;
  createdAt?: any; // Firestore Timestamp
};

export default function AdminCajaPage() {
  const db = useFirestore();
  const [records, setRecords] = useState<CashRecord[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, { name?: string; email?: string }>>({});
  const [typeFilter, setTypeFilter] = useState<'todos' | 'opening' | 'closing'>("todos");
  const [searchQuery, setSearchQuery] = useState('');

  // Cargar Registros
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "cash_registers"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const list: CashRecord[] = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...(doc.data() as any) }));
      setRecords(list);
    });
    return () => unsub();
  }, [db]);

  // Cargar Usuarios para mapear IDs
  useEffect(() => {
    if (!db) return;
    const uq = query(collection(db, "users"));
    const unsub = onSnapshot(uq, (snap) => {
      const map: Record<string, { name?: string; email?: string }> = {};
      snap.forEach((doc) => {
        const d = doc.data() as any;
        const uid = doc.id;
        map[uid] = { name: d?.name, email: d?.email };
        // También mapear por authUid si existe
        if (d?.authUid) map[d.authUid] = { name: d?.name, email: d?.email };
      });
      setUsersMap(map);
    });
    return () => unsub();
  }, [db]);

  // Lógica de Agrupación y Filtrado
  const grouped = useMemo(() => {
    // Primero agrupamos todos los registros por día y usuario
    const groups: Record<string, { 
      date: string; 
      userId: string; 
      userName: string;
      opening?: number; 
      closing?: number; 
      openingAt?: Date; 
      closingAt?: Date;
      id: string; // Para key
    }> = {};

    records.forEach((r) => {
      const dt = r.createdAt?.toDate ? r.createdAt.toDate() : undefined;
      const day = dt ? format(dt, 'yyyy-MM-dd') : "Sin fecha";
      const userId = r.userId || 'anon';
      const key = `${day}|${userId}`;
      
      if (!groups[key]) {
        const userInfo = usersMap[userId] || {};
        groups[key] = { 
          date: day, 
          userId, 
          userName: r.userName || userInfo.name || userInfo.email || 'Personal',
          id: key 
        };
      }

      if (r.type === 'opening') {
        groups[key].opening = r.amount;
        groups[key].openingAt = dt;
      } else if (r.type === 'closing') {
        groups[key].closing = r.amount;
        groups[key].closingAt = dt;
      }
    });

    // Convertir a array y aplicar filtros
    let list = Object.values(groups);

    // Filtro por tipo (si solo quiero ver aperturas, filtro los que tengan apertura, etc)
    if (typeFilter === 'opening') list = list.filter(g => g.opening !== undefined);
    if (typeFilter === 'closing') list = list.filter(g => g.closing !== undefined);

    // Filtro por búsqueda
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        list = list.filter(g => 
            g.userName.toLowerCase().includes(q) || 
            g.date.includes(q)
        );
    }

    // Ordenar por fecha descendente
    return list.sort((a,b) => (b.date || "").localeCompare(a.date || ""));
  }, [records, usersMap, typeFilter, searchQuery]);

  // Métricas rápidas
  const stats = useMemo(() => {
      const totalOpenings = grouped.filter(g => g.opening !== undefined).length;
      const totalClosings = grouped.filter(g => g.closing !== undefined).length;
      // Suma total de cierres registrados (puedes ajustar esto según necesidad)
      const totalCashClosed = grouped.reduce((acc, curr) => acc + (curr.closing || 0), 0);
      return { totalOpenings, totalClosings, totalCashClosed };
  }, [grouped]);

  // Componente de Tarjeta de Filtro
  const FilterCard = ({ id, label, count, icon: Icon, colorClass, active }: any) => (
    <button 
      onClick={() => setTypeFilter(id)}
      className={cn(
          "flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 hover:shadow-md w-full text-left relative overflow-hidden group bg-white",
          active 
              ? `border-${colorClass}-200 ring-2 ring-${colorClass}-100 bg-${colorClass}-50` 
              : "border-slate-200 hover:border-cyan-200"
      )}
    >
        <div className={cn("p-3 rounded-xl transition-colors", active ? `bg-${colorClass}-100 text-${colorClass}-700` : `bg-slate-100 text-slate-500 group-hover:bg-${colorClass}-50 group-hover:text-${colorClass}-600`)}>
            <Icon className="w-6 h-6" />
        </div>
        <div>
           <div className="text-2xl font-bold text-slate-800">{count}</div>
           <div className="text-sm text-slate-500 font-medium">{label}</div>
        </div>
        {active && (
          <div className={`absolute bottom-0 left-0 w-full h-1 bg-${colorClass}-500`} />
        )}
    </button>
  );

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
            <Wallet className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight drop-shadow-sm">Control de Caja</h1>
            <p className="text-cyan-50 opacity-90">Historial de aperturas y cierres de turno</p>
          </div>
        </div>

        {/* Filtros / Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <FilterCard 
                id="todos" 
                label="Registros Totales" 
                count={grouped.length} 
                icon={Briefcase} 
                colorClass="slate" 
                active={typeFilter === 'todos'} 
            />
            <FilterCard 
                id="opening" 
                label="Aperturas Registradas" 
                count={stats.totalOpenings} 
                icon={ArrowUpCircle} 
                colorClass="blue" 
                active={typeFilter === 'opening'} 
            />
            <FilterCard 
                id="closing" 
                label="Cierres Registrados" 
                count={stats.totalClosings} 
                icon={ArrowDownCircle} 
                colorClass="green" 
                active={typeFilter === 'closing'} 
            />
        </div>

        {/* Tabla */}
        <Card className="shadow-xl border-0 rounded-3xl overflow-hidden backdrop-blur-sm bg-white/95">
          <CardHeader className="bg-white border-b border-slate-100 pb-4 pt-6 px-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                    <CardTitle className="font-headline text-xl text-slate-800">Movimientos de Caja</CardTitle>
                    <CardDescription className="text-slate-500">Registro detallado por día y usuario.</CardDescription>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-cyan-600 transition-colors" />
                        <Input 
                            placeholder="Buscar usuario o fecha..." 
                            className="pl-9 h-10 rounded-xl border-slate-200 bg-slate-50 focus:bg-white transition-all focus-visible:ring-cyan-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="hover:bg-transparent border-b border-slate-100">
                  <TableHead className="pl-6 font-semibold text-slate-600">Fecha</TableHead>
                  <TableHead className="font-semibold text-slate-600">Usuario</TableHead>
                  <TableHead className="font-semibold text-slate-600">Apertura</TableHead>
                  <TableHead className="font-semibold text-slate-600">Cierre</TableHead>
                  <TableHead className="text-right pr-6 font-semibold text-slate-600">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grouped.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center text-slate-400">
                            No se encontraron registros.
                        </TableCell>
                    </TableRow>
                ) : (
                    grouped.map((g) => {
                      const openingStr = typeof g.opening === 'number' ? `$${g.opening.toFixed(2)}` : '-';
                      const closingStr = typeof g.closing === 'number' ? `$${g.closing.toFixed(2)}` : '-';
                      
                      // Formatear fecha bonita
                      let dateDisplay = g.date;
                      try {
                          const dateObj = new Date(g.date + 'T00:00:00'); // asegurar interpretación local
                          dateDisplay = format(dateObj, 'PPP', { locale: es });
                      } catch (e) {}

                      // Calcular diferencia si existen ambos
                      let balanceNode = <span className="text-slate-400">-</span>;
                      if (typeof g.opening === 'number' && typeof g.closing === 'number') {
                          const diff = g.closing - g.opening;
                          balanceNode = (
                              <span className={cn("font-bold", diff >= 0 ? "text-green-600" : "text-red-500")}>
                                  {diff > 0 ? '+' : ''}${diff.toFixed(2)}
                              </span>
                          );
                      }

                      return (
                        <TableRow key={g.id} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                          <TableCell className="pl-6 py-4">
                            <div className="flex items-center gap-2 text-slate-700 font-medium">
                                <CalendarDays className="h-4 w-4 text-slate-400" />
                                {dateDisplay}
                            </div>
                          </TableCell>
                          <TableCell>
                             <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200">
                                    <User className="h-4 w-4" />
                                </div>
                                <span className="text-slate-700">{g.userName}</span>
                             </div>
                          </TableCell>
                          <TableCell>
                             <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-mono">
                                {openingStr}
                             </Badge>
                          </TableCell>
                          <TableCell>
                             <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-mono">
                                {closingStr}
                             </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                             {balanceNode}
                          </TableCell>
                        </TableRow>
                      );
                    })
                )}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter className="bg-slate-50 border-t border-slate-100 p-4">
             <div className="flex items-center gap-2 text-xs text-slate-500 w-full justify-center">
                <DollarSign className="h-3 w-3" />
                <span>Los balances positivos indican más efectivo al cierre que a la apertura.</span>
             </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}