"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useFirestore } from "@/firebase/provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";

type CashRecord = {
  id: string;
  type: "opening" | "closing" | string;
  amount?: number;
  userId?: string | null;
  createdAt?: any; // Firestore Timestamp
};

export default function AdminCajaPage() {
  const db = useFirestore();
  const [records, setRecords] = useState<CashRecord[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, { name?: string; email?: string }>>({});
  const [typeFilter, setTypeFilter] = useState<'todos' | 'opening' | 'closing'>("todos");

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

  useEffect(() => {
    if (!db) return;
    const uq = query(collection(db, "users"));
    const unsub = onSnapshot(uq, (snap) => {
      const map: Record<string, { name?: string; email?: string }> = {};
      snap.forEach((doc) => {
        const d = doc.data() as any;
        const uid = doc.id;
        map[uid] = { name: d?.name, email: d?.email };
        if (d?.authUid) map[d.authUid] = { name: d?.name, email: d?.email };
      });
      setUsersMap(map);
    });
    return () => unsub();
  }, [db]);

  const filtered = useMemo(() => records.filter((r) => typeFilter === 'todos' ? true : (r.type === typeFilter)), [records, typeFilter]);
  const grouped = useMemo(() => {
    const groups: Record<string, { date: string; userId: string; opening?: number; closing?: number; openingAt?: Date; closingAt?: Date }> = {};
    filtered.forEach((r) => {
      const dt = r.createdAt?.toDate ? r.createdAt.toDate() : undefined;
      const day = dt ? dt.toISOString().slice(0,10) : "";
      const key = `${day}|${r.userId || ''}`;
      if (!groups[key]) groups[key] = { date: day, userId: r.userId || '' } as any;
      if (r.type === 'opening') {
        groups[key].opening = r.amount ?? groups[key].opening;
        groups[key].openingAt = dt;
      } else if (r.type === 'closing') {
        groups[key].closing = r.amount ?? groups[key].closing;
        groups[key].closingAt = dt;
      }
    });
    return Object.values(groups).sort((a,b) => (b.date || "").localeCompare(a.date || ""));
  }, [filtered]);

  return (
    <div className="p-4 md:p-8">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Registro de Caja</CardTitle>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="flex gap-2">
              {(['todos','opening','closing'] as const).map((k) => (
                <Button key={k} variant={typeFilter===k? 'default':'outline'} size="sm" onClick={()=>setTypeFilter(k)}>
                  {k==='todos' ? 'Todos' : k==='opening' ? 'Aperturas' : 'Cierres'}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Apertura</TableHead>
                  <TableHead>Cierre</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grouped.map((g) => {
                  const userInfo = usersMap[g.userId] || {};
                  const openingStr = typeof g.opening === 'number' ? `$${g.opening.toFixed(2)}` : '-';
                  const closingStr = typeof g.closing === 'number' ? `$${g.closing.toFixed(2)}` : '-';
                  const dateStr = g.openingAt || g.closingAt ? format((g.openingAt || g.closingAt) as Date, 'PPP') : g.date;
                  return (
                    <TableRow key={`${g.date}|${g.userId}`}>
                      <TableCell>{dateStr}</TableCell>
                      <TableCell>{userInfo.name || userInfo.email || g.userId || '-'}</TableCell>
                      <TableCell>{openingStr}</TableCell>
                      <TableCell>{closingStr}</TableCell>
                    </TableRow>
                  );
                })}
                {grouped.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-sm text-muted-foreground">Sin registros.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
